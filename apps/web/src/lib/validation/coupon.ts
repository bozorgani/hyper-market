import { z } from "zod";

const codeMessage = "کد کوپن باید فقط شامل حروف انگلیسی، عدد، خط تیره یا زیرخط باشد.";
const percentMessage = "درصد تخفیف باید بین صفر تا صد باشد.";
const moneyMessage = "مقادیر مالی کوپن نمی‌توانند منفی باشند.";
const usageLimitMessage = "سقف استفاده کل باید حداقل یک باشد.";
const perUserLimitMessage = "سقف استفاده هر کاربر باید حداقل یک باشد.";
const datesMessage = "تاریخ پایان باید بعد از تاریخ شروع باشد.";

export const couponFormSchema = z.object({
  code: z.string().trim().regex(/^[A-Za-z0-9_-]{1,40}$/, codeMessage),
  percent: z.number(percentMessage).min(0, percentMessage).max(100, percentMessage),
  active: z.boolean().optional(),
  minSubtotal: z.number(moneyMessage).min(0, moneyMessage).optional(),
  maxDiscountAmount: z.number(moneyMessage).min(0, moneyMessage).nullable().optional(),
  usageLimit: z.number(usageLimitMessage).min(1, usageLimitMessage).nullable().optional(),
  perUserLimit: z.number(perUserLimitMessage).min(1, perUserLimitMessage).nullable().optional(),
  startsAt: z.string().nullable().optional(),
  endsAt: z.string().nullable().optional(),
}).superRefine((value, context) => {
  if (value.startsAt && value.endsAt && value.startsAt > value.endsAt) {
    context.addIssue({ code: "custom", path: ["endsAt"], message: datesMessage });
  }
});
