"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusMessage } from "@/components/ui/status-message";
import { useToast } from "@/components/ui/toast";
import { firstValidationError, loginSchema, normalizeDigits, normalizePhoneNumber } from "@/lib/validation/auth";
import { useAuthStore } from "@/store/auth-store";

const features = [
  { title: "ورود با ایمیل یا موبایل", description: "بدون تغییر در API، همان flow فعلی ورود با تجربه‌ای شفاف‌تر در اختیار شماست." },
  { title: "نشست ایمن", description: "session و refresh flow سمت فرانت حفظ شده و پس از ورود به‌صورت خودکار استفاده می‌شود." },
  { title: "دسترسی سریع", description: "بعد از ورود، مستقیم به پروفایل و سپس سفارش‌ها و خریدهای شما هدایت می‌شوید." },
  { title: "رابط فارسی یکپارچه", description: "فرم‌ها، خطاها و پیام‌های موفقیت با UX هماهنگ و راست‌به‌چپ نمایش داده می‌شوند." },
];

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const { showToast } = useToast();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const validation = loginSchema.safeParse({ identifier, password });
    if (!validation.success) {
      const message = firstValidationError(validation.error);
      setError(message);
      showToast({ type: "error", title: "اطلاعات ورود معتبر نیست", description: message });
      return;
    }

    setLoading(true);

    try {
      const normalizedIdentifier = validation.data.identifier.includes("@")
        ? validation.data.identifier.trim().toLowerCase()
        : normalizePhoneNumber(validation.data.identifier);
      await login(normalizedIdentifier.includes("@") ? { email: normalizedIdentifier, password } : { phoneNumber: normalizedIdentifier, password });
      showToast({ type: "success", title: "با موفقیت وارد شدید" });
      router.push("/profile");
    } catch (err) {
      const message = err instanceof Error ? err.message : "ورود ناموفق بود. دوباره تلاش کنید.";
      setError(message);
      showToast({ type: "error", title: "ورود ناموفق بود", description: message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      eyebrow="ورود سریع و امن"
      title="ورود به حساب کاربری"
      description="با ایمیل یا شماره موبایل وارد شوید و خرید، سفارش‌ها و وضعیت حساب خود را در محیطی یکپارچه مدیریت کنید."
      features={features}
      footer={
        <div className="flex flex-col gap-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/register" className="font-semibold text-rose-600">ثبت‌نام</Link>
          <Link href="/verify-otp" className="font-semibold text-slate-700">تأیید کد پیامکی / ایمیلی</Link>
        </div>
      }
    >
      <h2 className="text-2xl font-black">ورود به حساب</h2>
      <p className="mt-2 text-sm leading-6 text-slate-500">ایمیل یا شماره موبایل و رمز عبور خود را وارد کنید.</p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <Input
          value={identifier}
          onChange={(e) => setIdentifier(normalizeDigits(e.target.value))}
          onBlur={() => {
            if (identifier && !identifier.includes("@")) setIdentifier(normalizePhoneNumber(identifier));
          }}
          placeholder="ایمیل یا شماره موبایل مثل 0912..."
          required
          inputMode="email"
        />
        <Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="رمز عبور" type="password" required />
        {error ? <StatusMessage variant="error">{error}</StatusMessage> : null}
        <Button type="submit" className="w-full" disabled={loading || !identifier.trim() || !password.trim()}>
          {loading ? "در حال ورود..." : "ورود"}
        </Button>
      </form>
    </AuthShell>
  );
}
