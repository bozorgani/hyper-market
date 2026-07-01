import { z } from "zod";

const persianDigits = "۰۱۲۳۴۵۶۷۸۹";
const arabicDigits = "٠١٢٣٤٥٦٧٨٩";

export function normalizeDigits(value: string): string {
  return value.replace(/[۰-۹٠-٩]/g, (digit) => {
    const persianIndex = persianDigits.indexOf(digit);
    if (persianIndex >= 0) return String(persianIndex);

    const arabicIndex = arabicDigits.indexOf(digit);
    return arabicIndex >= 0 ? String(arabicIndex) : digit;
  });
}

export function normalizePhoneNumber(value: string): string {
  return normalizeDigits(value).replace(/[\s\-()]/g, "").trim();
}

export function normalizeOtpCode(value: string): string {
  return normalizeDigits(value).replace(/\D/g, "").slice(0, 6);
}

const requiredMessage = "تکمیل این فیلد الزامی است.";
const phoneMessage = "شماره موبایل باید دقیقاً ۱۱ رقم باشد و با 09 شروع شود.";
const emailMessage = "ایمیل واردشده معتبر نیست.";
const passwordMessage = "رمز عبور باید حداقل ۸ کاراکتر و شامل حرف بزرگ، حرف کوچک، عدد و کاراکتر ویژه باشد.";
const otpMessage = "کد تأیید باید دقیقاً ۶ رقم باشد.";

export const phoneNumberSchema = z.string().transform(normalizePhoneNumber).pipe(z.string().regex(/^09\d{9}$/, phoneMessage));
export const emailSchema = z.string().trim().email(emailMessage);
export const passwordSchema = z.string().regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/, passwordMessage);
export const otpCodeSchema = z.string().transform(normalizeOtpCode).pipe(z.string().regex(/^\d{6}$/, otpMessage));

export const loginSchema = z.object({
  identifier: z.string().trim().min(1, requiredMessage),
  password: z.string().min(1, requiredMessage),
}).superRefine((value, context) => {
  const identifier = value.identifier.trim();
  const result = identifier.includes("@") ? emailSchema.safeParse(identifier) : phoneNumberSchema.safeParse(identifier);

  if (!result.success) {
    context.addIssue({
      code: "custom",
      path: ["identifier"],
      message: identifier.includes("@") ? emailMessage : phoneMessage,
    });
  }
});

export const registerSchema = z.object({
  email: z.string().trim().optional(),
  phoneNumber: z.string().optional(),
  password: passwordSchema,
}).superRefine((value, context) => {
  const email = value.email?.trim() ?? "";
  const phoneNumber = normalizePhoneNumber(value.phoneNumber ?? "");

  if (!email && !phoneNumber) {
    context.addIssue({
      code: "custom",
      path: ["email"],
      message: "حداقل یکی از فیلدهای ایمیل یا شماره موبایل باید وارد شود.",
    });
    return;
  }

  if (email && !emailSchema.safeParse(email).success) {
    context.addIssue({ code: "custom", path: ["email"], message: emailMessage });
  }

  if (phoneNumber && !phoneNumberSchema.safeParse(phoneNumber).success) {
    context.addIssue({ code: "custom", path: ["phoneNumber"], message: phoneMessage });
  }
});

export const verifyOtpSchema = z.object({
  target: z.string().trim().min(1, requiredMessage),
  code: otpCodeSchema,
  type: z.string(),
}).superRefine((value, context) => {
  const target = value.target.trim();

  if (value.type === "phone_verify") {
    if (!phoneNumberSchema.safeParse(target).success) {
      context.addIssue({ code: "custom", path: ["target"], message: phoneMessage });
    }
    return;
  }

  if (value.type === "email_verify") {
    if (!emailSchema.safeParse(target).success) {
      context.addIssue({ code: "custom", path: ["target"], message: emailMessage });
    }
    return;
  }

  const isValidEmail = emailSchema.safeParse(target).success;
  const isValidPhone = phoneNumberSchema.safeParse(target).success;
  if (!isValidEmail && !isValidPhone) {
    context.addIssue({ code: "custom", path: ["target"], message: "ایمیل یا شماره موبایل معتبر وارد کنید." });
  }
});

export function firstValidationError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "اطلاعات فرم معتبر نیست.";
}
