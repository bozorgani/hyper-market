"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Mail, Phone, ArrowLeft, Loader2 } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { StatusMessage } from "@/components/ui/status-message";
import { useToast } from "@/components/ui/toast";
import { api } from "@/services/api";
import {
  emailSchema,
  firstValidationError,
  normalizeDigits,
  normalizePhoneNumber,
  phoneNumberSchema,
} from "@/lib/validation/auth";
import { cn } from "@/lib/utils";

export function ForgotPasswordPageClient() {
  const router = useRouter();
  const { showToast } = useToast();
  const [identifier, setIdentifier] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const rawIdentifier = identifier.trim();
    const isEmail = rawIdentifier.includes("@");
    const normalizedIdentifier = isEmail
      ? rawIdentifier.toLowerCase()
      : normalizePhoneNumber(rawIdentifier);
    const validation = isEmail
      ? emailSchema.safeParse(normalizedIdentifier)
      : phoneNumberSchema.safeParse(normalizedIdentifier);

    if (!validation.success) {
      const message = firstValidationError(validation.error);
      setError(message);
      showToast({ type: "error", title: "اطلاعات واردشده معتبر نیست", description: message });
      return;
    }

    setLoading(true);

    try {
      await api.post("/auth/forgot-password", isEmail
        ? { email: normalizedIdentifier }
        : { phoneNumber: normalizedIdentifier });

      showToast({
        type: "success",
        title: "اگر حسابی با این مشخصات وجود داشته باشد، کد بازیابی ارسال می‌شود",
      });
      router.push(`/verify-otp?target=${encodeURIComponent(normalizedIdentifier)}&type=password_reset`);
    } catch (requestError) {
      const message = requestError instanceof Error
        ? requestError.message
        : "ارسال درخواست بازیابی ناموفق بود.";
      setError(message);
      showToast({ type: "error", title: "بازیابی رمز عبور ناموفق بود", description: message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      eyebrow="بازیابی امن حساب"
      title="رمز عبور خود را بازیابی کنید"
      description="ایمیل یا شماره موبایل حساب خود را وارد کنید تا کد بازیابی برای شما ارسال شود."
    >
      <div className="mb-5 sm:mb-7">
        <h2 className="text-xl font-black text-slate-900">فراموشی رمز عبور</h2>
        <p className="mt-1.5 text-sm leading-6 text-slate-500">
          برای حفظ حریم خصوصی، در هر دو حالت پیام عمومی یکسانی نمایش داده می‌شود.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-5">
        <div>
          <label htmlFor="forgot-password-identifier" className="mb-1.5 block text-xs font-semibold text-slate-600">
            ایمیل یا شماره موبایل
          </label>
          <div className="relative">
            {identifier.includes("@") ? (
              <Mail className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            ) : (
              <Phone className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            )}
            <input
              id="forgot-password-identifier"
              name="identifier"
              value={identifier}
              onChange={(event) => setIdentifier(normalizeDigits(event.target.value))}
              placeholder="example@email.com یا 0912..."
              autoComplete="username"
              aria-required="true"
              aria-invalid={error ? "true" : "false"}
              aria-describedby={error ? "forgot-password-error" : undefined}
              className={cn(
                "h-12 w-full rounded-xl border bg-white pr-10 pl-4 text-right text-sm text-slate-900 outline-none transition placeholder:text-slate-400",
                error
                  ? "border-red-300 focus:border-red-400 focus:ring-4 focus:ring-red-50"
                  : "border-slate-200 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50",
              )}
            />
          </div>
        </div>

        {error ? (
          <div id="forgot-password-error" role="alert" aria-live="assertive">
            <StatusMessage variant="error">{error}</StatusMessage>
          </div>
        ) : null}

        <Button type="submit" disabled={loading || !identifier.trim()} size="lg" className="w-full">
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              در حال ارسال کد...
            </>
          ) : (
            <>
              ارسال کد بازیابی
              <ArrowLeft className="h-4 w-4" />
            </>
          )}
        </Button>
      </form>

      <div className="mt-5 flex flex-col gap-2 text-center text-sm sm:flex-row sm:items-center sm:justify-between">
        <Link href="/login" className="font-bold text-emerald-600 hover:text-emerald-700">
          بازگشت به ورود
        </Link>
        <Link href="/register" className="text-slate-500 hover:text-emerald-600">
          ساخت حساب جدید
        </Link>
      </div>
    </AuthShell>
  );
}
