import axios, { AxiosError } from "axios";

const TOKEN_KEY = "hyper_market_access_token";

function localizeApiMessage(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes("unauthorized") || normalized.includes("invalid credentials")) return "اطلاعات ورود معتبر نیست.";
  if (normalized.includes("forbidden")) return "شما مجوز انجام این عملیات را ندارید.";
  if (normalized.includes("not found")) return "موردی یافت نشد.";
  if (normalized.includes("insufficient")) return "موجودی کافی نیست.";
  if (normalized.includes("timeout")) return "زمان پاسخ‌گویی سرور به پایان رسید.";
  if (normalized.includes("network")) return "ارتباط با سرور برقرار نشد.";
  return message;
}

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || "/api/v1",
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = window.sessionStorage.getItem(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string | string[]; error?: string }>) => {
    const message = error.response?.data?.message;
    const normalizedMessage = Array.isArray(message)
      ? message.join("، ")
      : message || error.response?.data?.error || error.message || "خطای غیرمنتظره رخ داد.";

    return Promise.reject(new Error(localizeApiMessage(normalizedMessage)));
  },
);
