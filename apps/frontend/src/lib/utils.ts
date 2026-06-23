import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

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
  if (!value) return "ثبت نشده";
  return new Intl.DateTimeFormat("fa-IR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(value));
}

export function translateOrderStatus(status: string) {
  const map: Record<string, string> = {
    pending: "در انتظار پرداخت",
    paid: "پرداخت‌شده",
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
    paid: "پرداخت موفق",
    failed: "ناموفق",
    cancelled: "لغوشده",
  };
  return status ? map[status] ?? status : "نامشخص";
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
