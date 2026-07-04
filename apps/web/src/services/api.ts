import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

declare module "axios" {
  export interface AxiosRequestConfig {
    _skipAuthRedirect?: boolean;
  }
}


const CSRF_TOKEN_COOKIE = "hyper_market_csrf_token";
const CSRF_TOKEN_HEADER = "x-csrf-token";
const CSRF_SAFE_METHODS = new Set(["get", "head", "options"]);

function getCookieValue(name: string): string | null {
  if (typeof document === "undefined") return null;

  const cookies = document.cookie.split(";");
  for (const cookie of cookies) {
    const [rawKey, ...rawValue] = cookie.trim().split("=");
    if (rawKey === name) {
      return decodeURIComponent(rawValue.join("="));
    }
  }

  return null;
}


let isRefreshing = false;
let failedQueue: Array<{
  resolve: () => void;
  reject: (error: unknown) => void;
}> = [];

type RetriableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
  _skipAuthRedirect?: boolean;
};

function localizeApiMessage(message: string, status?: number) {
  if (status === 429) return "تعداد درخواست‌ها زیاد است. لطفاً چند لحظه صبر کنید و دوباره تلاش کنید.";
  if (status === 409) return "این عملیات هم‌اکنون در حال پردازش است. لطفاً چند لحظه صبر کنید.";
  if (status && status >= 500) return "خطای سرور رخ داد. لطفاً کمی بعد دوباره تلاش کنید.";

  const normalized = message.toLowerCase();

  // Auth-related
  if (normalized.includes("unauthorized") || normalized.includes("invalid credentials")) return "اطلاعات ورود معتبر نیست.";
  if (normalized.includes("forbidden") || normalized.includes("csrf")) return "شما مجوز انجام این عملیات را ندارید یا نشست شما منقضی شده است.";
  if (normalized.includes("account is temporarily locked")) return "حساب شما موقتاً مسدود شده است. لطفاً بعداً تلاش کنید.";
  if (normalized.includes("account verification is required")) return "حساب شما نیاز به تأیید دارد.";
  if (normalized.includes("invalid refresh token")) return "نشست شما منقضی شده. لطفاً دوباره وارد شوید.";
  if (normalized.includes("refresh token reuse detected")) return "فعالیت مشکوک شناسایی شد. لطفاً دوباره وارد شوید.";
  if (normalized.includes("refresh token expired")) return "نشست شما منقضی شده. لطفاً دوباره وارد شوید.";
  if (normalized.includes("invalid token version")) return "نشست شما نامعتبر است. لطفاً دوباره وارد شوید.";
  if (normalized.includes("invalid otp") || normalized.includes("otp expired")) return "کد تأیید نامعتبر یا منقضی شده است.";
  if (normalized.includes("otp is temporarily blocked")) return "تعداد تلاش‌های ناموفق زیاد بوده. لطفاً چند دقیقه صبر کنید.";

  // Resource / CRUD
  if (normalized.includes("not found")) return "موردی یافت نشد.";
  if (normalized.includes("already exists") || normalized.includes("email already") || normalized.includes("phone number already")) return "این اطلاعات قبلاً ثبت شده است.";
  if (normalized.includes("insufficient stock")) return "موجودی محصول کافی نیست.";
  if (normalized.includes("insufficient product stock")) return "موجودی محصول کافی نیست.";
  if (normalized.includes("cart is empty")) return "سبد خرید شما خالی است.";
  if (normalized.includes("is not active")) return "محصول در حال حاضر موجود نیست.";

  // Delivery / Order
  if (normalized.includes("invalid delivery window")) return "زمان تحویل معتبر نیست.";
  if (normalized.includes("delivery date cannot be in the past")) return "زمان تحویل نمی‌تواند در گذشته باشد.";
  if (normalized.includes("invalid order status transition")) return "تغییر وضعیت سفارش مجاز نیست.";

  // Payments
  if (normalized.includes("insufficient")) return "موجودی کافی نیست.";

  // General
  if (normalized.includes("already in progress") || normalized.includes("idempotency")) return "این عملیات در حال پردازش است. لطفاً چند لحظه صبر کنید.";
  if (normalized.includes("timeout")) return "زمان پاسخ‌گویی سرور به پایان رسید.";
  if (normalized.includes("network")) return "ارتباط با سرور برقرار نشد.";

  return message;
}

function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL || "/api/v1";
}

function redirectToLogin(): void {
  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
}

function processQueue(error: unknown): void {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
      return;
    }

    promise.resolve();
  });

  failedQueue = [];
}

async function refreshSessionCookie(): Promise<void> {
  const response = await fetch(`${getApiBaseUrl()}/auth/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(getCookieValue(CSRF_TOKEN_COOKIE)
        ? { [CSRF_TOKEN_HEADER]: getCookieValue(CSRF_TOKEN_COOKIE)! }
        : {}),
    },
    credentials: "include",
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    throw new Error("Refresh token failed");
  }
}

export const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 15000,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});


api.interceptors.request.use((config) => {
  const method = config.method?.toLowerCase() ?? "get";
  if (!CSRF_SAFE_METHODS.has(method)) {
    const csrfToken = getCookieValue(CSRF_TOKEN_COOKIE);
    if (csrfToken) {
      config.headers[CSRF_TOKEN_HEADER] = csrfToken;
    }
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ message?: string | string[]; error?: string }>) => {
    const originalRequest = error.config as RetriableRequestConfig | undefined;

    if (typeof window !== "undefined" && error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise<void>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => api(originalRequest))
          .catch((queueError) => Promise.reject(queueError));
      }

      isRefreshing = true;

      try {
        await refreshSessionCookie();
        processQueue(null);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        // User-facing auth form requests (login/register/otp/reset) must surface
        // their own error messages instead of bouncing the user to /login.
        const isUserAuthForm =
          typeof originalRequest.url === "string" &&
          /(\/auth\/(login|register|forgot-password|reset-password|verify-otp|send-verification-otp|verify-email|verify-phone))($|\?)/.test(
            originalRequest.url,
          );
        if (!originalRequest._skipAuthRedirect && !isUserAuthForm) {
          redirectToLogin();
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    const message = error.response?.data?.message;
    const normalizedMessage = Array.isArray(message)
      ? message.join("، ")
      : message || error.response?.data?.error || error.message || "خطای غیرمنتظره رخ داد.";

    return Promise.reject(new Error(localizeApiMessage(normalizedMessage, error.response?.status)));
  },
);
