"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusMessage } from "@/components/ui/status-message";
import { useToast } from "@/components/ui/toast";
import { firstValidationError, normalizeDigits, normalizePhoneNumber, registerSchema } from "@/lib/validation/auth";
import { api } from "@/services/api";

const features = [
  { title: "ثبت‌نام ساده", description: "می‌توانید با ایمیل، شماره موبایل یا هر دو ثبت‌نام را آغاز کنید." },
  { title: "سازگار با OTP", description: "بعد از ثبت‌نام، مستقیماً به مسیر تأیید هدایت می‌شوید تا فعال‌سازی حساب کامل شود." },
  { title: "سازگاری با بک‌اند فعلی", description: "بدون تغییر API یا جریان auth، فقط UX فرم و پیام‌ها بهبود داده شده است." },
  { title: "راهنمای شفاف", description: "در همان فرم، خطاهای ورودی و وضعیت موفقیت ثبت‌نام واضح‌تر نمایش داده می‌شود." },
];

export default function RegisterPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(() => {
    return (email.trim().length > 0 || phoneNumber.trim().length > 0) && password.trim().length > 0;
  }, [email, phoneNumber, password]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const validation = registerSchema.safeParse({ email, phoneNumber, password });
    if (!validation.success) {
      const message = firstValidationError(validation.error);
      setError(message);
      showToast({ type: "error", title: "اطلاعات ثبت‌نام معتبر نیست", description: message });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    setLoading(true);

    try {
      await api.post("/auth/register", {
        ...(normalizedEmail ? { email: normalizedEmail } : {}),
        ...(normalizedPhone ? { phoneNumber: normalizedPhone } : {}),
        password,
      });

      const otpTarget = normalizedPhone || normalizedEmail;
      const otpType = normalizedPhone ? "phone_verify" : "email_verify";

      showToast({ type: "success", title: "ثبت‌نام انجام شد", description: "اکنون کد تأیید حساب را وارد کنید." });
      router.push(`/verify-otp?target=${encodeURIComponent(otpTarget)}&type=${encodeURIComponent(otpType)}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "ثبت‌نام ناموفق بود. اطلاعات را بررسی کنید.";
      setError(message);
      showToast({ type: "error", title: "ثبت‌نام ناموفق بود", description: message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      eyebrow="ایجاد حساب جدید"
      title="ثبت‌نام در هایپرمارکت"
      description="حساب کاربری خود را بسازید تا خرید، سفارش‌ها و جریان تأیید OTP را در رابط اصلی فروشگاه تجربه کنید."
      features={features}
      footer={
        <p className="text-sm text-slate-500">
          حساب دارید؟ <Link href="/login" className="font-semibold text-rose-600">وارد شوید</Link>
        </p>
      }
    >
      <h2 className="text-2xl font-black">ثبت‌نام</h2>
      <p className="mt-2 text-sm leading-6 text-slate-500">حداقل یکی از فیلدهای ایمیل یا موبایل را وارد کنید و سپس رمز عبور خود را بسازید.</p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ایمیل" type="email" />
        <Input
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(normalizeDigits(e.target.value))}
          onBlur={() => setPhoneNumber(normalizePhoneNumber(phoneNumber))}
          placeholder="شماره موبایل مثل 0912..."
          inputMode="numeric"
          maxLength={11}
        />
        <Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="رمز عبور قوی" type="password" required />
        {!email.trim() && !phoneNumber.trim() ? <StatusMessage variant="warning">برای ادامه، یکی از فیلدهای ایمیل یا شماره موبایل را تکمیل کنید.</StatusMessage> : null}
        <StatusMessage variant="warning">شماره موبایل باید ۱۱ رقم و با 09 شروع شود. رمز عبور باید شامل حرف بزرگ، حرف کوچک، عدد و کاراکتر ویژه باشد.</StatusMessage>
        {error ? <StatusMessage variant="error">{error}</StatusMessage> : null}
        <Button type="submit" className="w-full" disabled={loading || !canSubmit}>
          {loading ? "در حال ثبت..." : "ثبت‌نام"}
        </Button>
      </form>
    </AuthShell>
  );
}
