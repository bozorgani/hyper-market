import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatJalaliDate } from "./jalali";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("fa-IR").format(value);
}

export function formatPrice(value: number) {
  return `${formatNumber(value)} تومان`;
}

export function formatPersianDate(value?: string) {
  // Render true Jalali (Shamsi) dates via the self-contained jalali utility.
  return formatJalaliDate(value, true);
}

export function translateOrderStatus(status: string) {
  const map: Record<string, string> = {
    pending: "در انتظار تأیید",
    paid: "تأییدشده",
    processing: "در حال پردازش",
    shipped: "ارسال‌شده",
    delivered: "تحویل‌شده",
    cancelled: "لغوشده",
  };
  return map[status] ?? status;
}

export function translatePaymentStatus(status?: string) {
  const map: Record<string, string> = {
    pending: "در انتظار پرداخت",
    paid: "پرداخت در محل — تأییدشده",
    failed: "ناموفق",
    cancelled: "لغوشده",
  };
  return status ? map[status] ?? status : "نامشخص";
}

export function translatePaymentMethod(method?: string) {
  const map: Record<string, string> = {
    cod: "پرداخت در محل",
    stripe: "Stripe",
    zarinpal: "زرین‌پال",
  };
  return method ? map[method] ?? method : "نامشخص";
}

export function translateRole(role?: string) {
  const map: Record<string, string> = {
    customer: "مشتری",
    admin: "مدیر",
    super_admin: "مدیر ارشد",
    vendor: "فروشنده",
    delivery: "ارسال‌کننده",
  };
  return role ? map[role] ?? role : "نامشخص";
}

export function translateAccountStatus(status?: string) {
  const map: Record<string, string> = {
    pending: "در انتظار تأیید",
    active: "فعال",
    suspended: "مسدود",
    deactivated: "غیرفعال",
    banned: "ممنوع",
  };
  return status ? map[status] ?? status : "نامشخص";
}
