const errorPatterns: Array<{ keywords: string[]; message: string }> = [
  {
    keywords: ["network", "timeout", "econn", "failed to fetch", "اتصال", "شبکه"],
    message: "ارتباط با فروشگاه برقرار نشد. اتصال اینترنت را بررسی و دوباره تلاش کنید.",
  },
  {
    keywords: ["401", "403", "unauthorized", "forbidden", "احراز هویت", "دسترسی"],
    message: "برای ادامه، لطفاً دوباره وارد حساب کاربری خود شوید.",
  },
  {
    keywords: ["404", "not found", "پیدا نشد", "یافت نشد"],
    message: "این مورد دیگر در دسترس نیست. لطفاً دوباره بررسی کنید.",
  },
  {
    keywords: ["stock", "inventory", "out of stock", "موجودی", "ناموجود"],
    message: "موجودی این محصول تغییر کرده است. سبد خرید خود را بررسی کنید.",
  },
  {
    keywords: ["validation", "invalid", "required", "نامعتبر", "ناقص", "اجباری"],
    message: "اطلاعات واردشده کامل یا معتبر نیست. موارد مشخص‌شده را بررسی کنید.",
  },
  {
    keywords: ["429", "rate limit", "too many", "تلاش بیش از حد"],
    message: "تعداد درخواست‌ها زیاد است. چند لحظه بعد دوباره تلاش کنید.",
  },
];

export function getUserFacingError(error: unknown, fallback: string): string {
  if (!(error instanceof Error) || !error.message.trim()) return fallback;

  const normalizedMessage = error.message.toLowerCase();
  const matchedPattern = errorPatterns.find(({ keywords }) =>
    keywords.some((keyword) => normalizedMessage.includes(keyword.toLowerCase())),
  );

  return matchedPattern?.message ?? fallback;
}
