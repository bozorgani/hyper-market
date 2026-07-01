"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useMemo, useState } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusMessage } from "@/components/ui/status-message";
import { useToast } from "@/components/ui/toast";
import { firstValidationError, normalizeDigits, normalizeOtpCode, normalizePhoneNumber, verifyOtpSchema } from "@/lib/validation/auth";
import { api } from "@/services/api";

const features = [
  { title: "پوشش چند سناریو", description: "هم تأیید موبایل، هم تأیید ایمیل و هم بازیابی رمز عبور از همین فرم قابل انجام است." },
  { title: "پیش‌پر کردن هوشمند", description: "اگر از ثبت‌نام وارد این صفحه شوید، مقصد و نوع OTP به‌صورت خودکار تکمیل می‌شود." },
  { title: "بدون تغییر در API", description: "همان endpointهای فعلی auth استفاده می‌شوند و فقط تجربه کاربری بهتر شده است." },
  { title: "بازگشت سریع", description: "پس از موفقیت، کاربر به صفحه ورود هدایت می‌شود تا جریان ورود نهایی شود." },
];

function VerifyOtpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTarget = useMemo(() => searchParams.get("target") ?? "", [searchParams]);
  const initialType = useMemo(() => searchParams.get("type") ?? "phone_verify", [searchParams]);
  const { showToast } = useToast();
  const [target, setTarget] = useState(initialTarget);
  const [code, setCode] = useState("");
  const [type, setType] = useState(initialType);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const validation = verifyOtpSchema.safeParse({ target, code, type });
    if (!validation.success) {
      const message = firstValidationError(validation.error);
      setError(message);
      showToast({ type: "error", title: "اطلاعات تأیید معتبر نیست", description: message });
      return;
    }

    const normalizedTarget = type === "phone_verify" ? normalizePhoneNumber(target) : target.trim().toLowerCase();
    const normalizedCode = normalizeOtpCode(code);
    setLoading(true);

    try {
      if (type === "phone_verify") {
        await api.post("/auth/verify-phone", {
          phoneNumber: normalizedTarget,
          code: normalizedCode,
        });
      } else if (type === "email_verify") {
        await api.post("/auth/verify-email", {
          email: normalizedTarget,
          code: normalizedCode,
        });
      } else {
        await api.post("/auth/verify-otp", {
          target: type === "password_reset" && !normalizedTarget.includes("@") ? normalizePhoneNumber(target) : normalizedTarget,
          code: normalizedCode,
          type,
        });
      }

      const message = "کد تأیید با موفقیت ثبت شد. در حال انتقال به صفحه ورود...";
      setSuccess(message);
      showToast({ type: "success", title: "تأیید با موفقیت انجام شد" });
      window.setTimeout(() => router.replace("/login"), 900);
    } catch (err) {
      const message = err instanceof Error ? err.message : "تأیید کد ناموفق بود.";
      setError(message);
      showToast({ type: "error", title: "تأیید کد ناموفق بود", description: message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      eyebrow="تأیید هویت با OTP"
      title="تأیید کد یک‌بارمصرف"
      description="کد ارسال‌شده به ایمیل یا موبایل خود را وارد کنید تا فعال‌سازی حساب یا عملیات بازیابی رمز عبور کامل شود."
      features={features}
      footer={
        <div className="flex flex-col gap-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/login" className="font-semibold text-rose-600">بازگشت به ورود</Link>
          <Link href="/register" className="font-semibold text-slate-700">نیاز به ساخت حساب دارید؟</Link>
        </div>
      }
    >
      <h2 className="text-2xl font-black">ورود کد تأیید</h2>
      <p className="mt-2 text-sm leading-6 text-slate-500">در صورت ورود از مسیر ثبت‌نام، فیلدهای مقصد و نوع تأیید به‌صورت خودکار تکمیل می‌شوند.</p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <Input
          value={target}
          onChange={(e) => setTarget(normalizeDigits(e.target.value))}
          onBlur={() => {
            if (type === "phone_verify" || (!target.includes("@") && type === "password_reset")) setTarget(normalizePhoneNumber(target));
          }}
          placeholder="ایمیل یا شماره موبایل"
          required
        />
        <select value={type} onChange={(e) => setType(e.target.value)} className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-right text-sm outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-100">
          <option value="phone_verify">تأیید موبایل</option>
          <option value="email_verify">تأیید ایمیل</option>
          <option value="password_reset">بازیابی رمز عبور</option>
        </select>
        <Input value={code} onChange={(e) => setCode(normalizeOtpCode(e.target.value))} placeholder="کد ۶ رقمی" required maxLength={6} inputMode="numeric" />
        <StatusMessage variant="warning">شماره موبایل باید ۱۱ رقم و با 09 شروع شود؛ کد تأیید هم دقیقاً ۶ رقم است.</StatusMessage>
        {success ? <StatusMessage variant="success">{success}</StatusMessage> : null}
        {error ? <StatusMessage variant="error">{error}</StatusMessage> : null}
        <Button type="submit" className="w-full" disabled={loading || !target.trim() || !code.trim()}>
          {loading ? "در حال تأیید..." : "تأیید"}
        </Button>
      </form>
    </AuthShell>
  );
}


export default function VerifyOtpPage() {
  return (
    <Suspense fallback={null}>
      <VerifyOtpContent />
    </Suspense>
  );
}
