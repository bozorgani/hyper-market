"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Mail, Phone, KeyRound, ArrowLeft, Loader2, ShieldCheck, RefreshCw } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { StatusMessage } from "@/components/ui/status-message";
import { useToast } from "@/components/ui/toast";
import { firstValidationError, normalizePhoneNumber, normalizeOtpCode, verifyOtpSchema } from "@/lib/validation/auth";
import { api } from "@/services/api";
import { cn } from "@/lib/utils";

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
  const [resendLoading, setResendLoading] = useState(false);

  function updateDigit(idx: number, val: string) {
    const digit = val.replace(/\D/g, "");
    const chars = code.padEnd(6, " ").split("");
    chars[idx] = digit[digit.length - 1] ?? "";
    setCode(chars.join("").replace(/\s/g, ""));
  }

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
        await api.post("/auth/verify-phone", { phoneNumber: normalizedTarget, code: normalizedCode });
      } else if (type === "email_verify") {
        await api.post("/auth/verify-email", { email: normalizedTarget, code: normalizedCode });
      } else {
        await api.post("/auth/verify-otp", {
          target: type === "password_reset" && !normalizedTarget.includes("@") ? normalizePhoneNumber(target) : normalizedTarget,
          code: normalizedCode,
          type,
        });
      }

      const message = "کد تأیید با موفقیت ثبت شد. در حال انتقال...";
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

  async function handleResend() {
    if (!target.trim()) return;
    setResendLoading(true);
    try {
      const normalizedTarget = type === "phone_verify" ? normalizePhoneNumber(target) : target.trim().toLowerCase();
      if (type === "phone_verify") {
        await api.post("/auth/send-verification-otp", { phoneNumber: normalizedTarget, type: "phone_verify" });
      } else {
        await api.post("/auth/send-verification-otp", { email: normalizedTarget, type: "email_verify" });
      }
      showToast({ type: "success", title: "کد جدید ارسال شد" });
    } catch {
      showToast({ type: "error", title: "ارسال مجدد کد ناموفق بود" });
    } finally {
      setResendLoading(false);
    }
  }

  const isPhone = type === "phone_verify" || (!target.includes("@") && type === "password_reset");

  return (
    <AuthShell
      eyebrow="تأیید هویت با OTP"
      title="کد تأیید خود را وارد کنید"
      description="کد ۶ رقمی ارسال‌شده به ایمیل یا موبایل خود را وارد کنید تا فعال‌سازی حساب کامل شود."
    >
      {/* Form Header */}
      <div className="mb-7">
        <h2 className="text-xl font-black text-slate-900">تأیید کد یک‌بارمصرف</h2>
        <p className="mt-1.5 text-sm text-slate-500">
          {initialTarget ? (
            <>کد ارسال‌شده به <span className="font-semibold text-slate-700">{initialTarget}</span> را وارد کنید</>
          ) : (
            "در صورت ورود از مسیر ثبت‌نام، فیلدها به‌صورت خودکار تکمیل می‌شوند"
          )}
        </p>
      </div>

      {/* Form */}
      <form onSubmit={submit} className="space-y-4">
        {/* Target Field */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-600">ایمیل یا شماره موبایل</label>
          <div className="relative">
            {isPhone ? (
              <Phone className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            ) : (
              <Mail className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            )}
            <input
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              onBlur={() => {
                if (isPhone) setTarget(normalizePhoneNumber(target));
              }}
              placeholder={isPhone ? "09123456789" : "example@email.com"}
              required
              className={cn(
                "h-12 w-full rounded-xl border bg-white pr-10 pl-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400",
                isPhone ? "text-right font-mono" : "text-left",
                error ? "border-red-300 focus:border-red-400 focus:ring-4 focus:ring-red-50" : "border-slate-200 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50",
              )}
            />
          </div>
        </div>

        {/* Type Selector */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-600">نوع تأیید</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: "phone_verify", label: "تأیید موبایل", icon: <Phone className="h-3.5 w-3.5" /> },
              { value: "email_verify", label: "تأیید ایمیل", icon: <Mail className="h-3.5 w-3.5" /> },
              { value: "password_reset", label: "بازیابی رمز", icon: <KeyRound className="h-3.5 w-3.5" /> },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setType(option.value)}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-xs font-semibold transition",
                  type === option.value
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50",
                )}
              >
                {option.icon}
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* OTP Code Input — 6 separate digit boxes */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-600">کد تأیید ۶ رقمی</label>
            <button
              type="button"
              onClick={handleResend}
              disabled={resendLoading || !target.trim()}
              className="flex items-center gap-1 text-xs font-medium text-emerald-600 transition hover:text-emerald-700 disabled:opacity-50"
            >
              {resendLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              ارسال مجدد کد
            </button>
          </div>
          <div className="flex gap-2.5" dir="ltr">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="relative flex-1">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={code[idx] ?? ""}
                  onChange={(e) => {
                    updateDigit(idx, e.target.value);
                    const val = e.target.value.replace(/\D/g, "");
                    if (val && idx < 5) {
                      const next = e.target.nextElementSibling as HTMLInputElement;
                      next?.focus();
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Backspace" && !code[idx] && idx > 0) {
                      const prev = (e.target as HTMLInputElement).previousElementSibling as HTMLInputElement;
                      prev?.focus();
                    }
                  }}
                  className={cn(
                    "h-14 w-full rounded-xl border-2 text-center text-xl font-bold outline-none transition",
                    error ? "border-red-300 focus:border-red-400" : "border-slate-200 focus:border-emerald-400",
                    code[idx] && "border-emerald-400 text-emerald-600",
                  )}
                />
              </div>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-slate-400 text-center">
            کد ۶ رقمی ارسال‌شده به ایمیل یا موبایل خود را وارد کنید
          </p>
        </div>

        {/* Messages */}
        {success ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <div className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-sm text-emerald-700">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", bounce: 0.5 }}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500"
              >
                <ShieldCheck className="h-3.5 w-3.5 text-white" />
              </motion.div>
              {success}
            </div>
          </motion.div>
        ) : null}
        {error && !success ? (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}>
            <StatusMessage variant="error">{error}</StatusMessage>
          </motion.div>
        ) : null}

        {/* Submit Button */}
        <motion.div whileTap={{ scale: 0.98 }}>
          <button
            type="submit"
            disabled={loading || !target.trim() || code.length < 6}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-emerald-500 to-emerald-600 text-sm font-bold text-white shadow-lg shadow-emerald-500/25 transition-all hover:from-emerald-600 hover:to-emerald-700 hover:shadow-xl hover:shadow-emerald-500/30 disabled:opacity-50 disabled:pointer-events-none"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                در حال تأیید...
              </>
            ) : (
              <>
                تأیید کد
                <ArrowLeft className="h-4 w-4" />
              </>
            )}
          </button>
        </motion.div>
      </form>

      {/* Footer */}
      <div className="flex flex-col gap-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/login" className="font-bold text-emerald-600 transition hover:text-emerald-700">بازگشت به ورود</Link>
        <Link href="/register" className="font-medium text-slate-500 transition hover:text-emerald-600">نیاز به ساخت حساب دارید؟</Link>
      </div>
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
