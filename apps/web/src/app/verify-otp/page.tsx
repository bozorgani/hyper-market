"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Mail, Phone, KeyRound, ArrowLeft, Loader2, ShieldCheck, RefreshCw, 
  Clock, CheckCircle2 
} from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { StatusMessage } from "@/components/ui/status-message";
import { useToast } from "@/components/ui/toast";
import { firstValidationError, normalizePhoneNumber, normalizeOtpCode, verifyOtpSchema } from "@/lib/validation/auth";
import { api } from "@/services/api";
import { cn } from "@/lib/utils";

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 60;

function VerifyOtpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTarget = useMemo(() => searchParams.get("target") ?? "", [searchParams]);
  const initialType = useMemo(() => searchParams.get("type") ?? "phone_verify", [searchParams]);
  
  const { showToast } = useToast();
  
  const target = initialTarget;
  const [code, setCode] = useState("");
  const [type, setType] = useState(initialType);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (resendCooldown > 0) {
      timerRef.current = setTimeout(() => setResendCooldown(prev => prev - 1), 1000);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [resendCooldown]);

  useEffect(() => {
    const t = setTimeout(() => inputRefs.current[0]?.focus(), 350);
    return () => clearTimeout(t);
  }, []);

  const setInputRef = (index: number) => (el: HTMLInputElement | null) => {
    inputRefs.current[index] = el;
  };

  function handleOtpChange(index: number, value: string) {
    const numeric = value.replace(/\D/g, "");

    if (numeric.length > 1) {
      const pasted = numeric.slice(0, OTP_LENGTH);
      const newCode = pasted.padEnd(OTP_LENGTH, "").slice(0, OTP_LENGTH);
      setCode(newCode);
      const next = Math.min(pasted.length, OTP_LENGTH - 1);
      inputRefs.current[next]?.focus();
      if (pasted.length === OTP_LENGTH) {
        setTimeout(() => handleAutoSubmit(newCode), 120);
      }
      return;
    }

    const arr = code.padEnd(OTP_LENGTH, " ").split("");
    arr[index] = numeric || "";
    const newCode = arr.join("").replace(/\s/g, "").slice(0, OTP_LENGTH);
    setCode(newCode);

    if (numeric && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
    if (newCode.length === OTP_LENGTH) {
      setTimeout(() => handleAutoSubmit(newCode), 180);
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      if (!code[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
        const arr = code.split("");
        arr[index - 1] = "";
        setCode(arr.join("").slice(0, OTP_LENGTH));
      }
    }
    if (e.key === "ArrowLeft" && index > 0) inputRefs.current[index - 1]?.focus();
    if (e.key === "ArrowRight" && index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus();
  }

  function handleAutoSubmit(fullCode: string) {
    if (fullCode.length === OTP_LENGTH && target.trim()) {
      void submitOtp(fullCode);
    }
  }

  async function submitOtp(autoCode?: string) {
    setError(""); setSuccess("");

    const finalCode = autoCode || code;
    const validation = verifyOtpSchema.safeParse({ target, code: finalCode, type });

    if (!validation.success) {
      const msg = firstValidationError(validation.error);
      setError(msg);
      showToast({ type: "error", title: "کد نامعتبر", description: msg });
      return;
    }

    const normTarget = type === "phone_verify" ? normalizePhoneNumber(target) : target.trim().toLowerCase();
    const normCode = normalizeOtpCode(finalCode);
    setLoading(true);

    try {
      if (type === "phone_verify") {
        await api.post("/auth/verify-phone", { phoneNumber: normTarget, code: normCode });
      } else if (type === "email_verify") {
        await api.post("/auth/verify-email", { email: normTarget, code: normCode });
      } else {
        await api.post("/auth/verify-otp", {
          target: (type === "password_reset" && !normTarget.includes("@")) ? normalizePhoneNumber(target) : normTarget,
          code: normCode,
          type,
        });
      }

      setSuccess("کد با موفقیت تأیید شد. در حال انتقال...");
      showToast({ type: "success", title: "تأیید موفق" });
      setTimeout(() => router.replace("/login"), 1100);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "تأیید کد ناموفق بود";
      setError(msg);
      showToast({ type: "error", title: "خطا در تأیید", description: msg });

      const container = document.getElementById("otp-container");
      if (container) {
        container.classList.add("animate-shake");
        setTimeout(() => container.classList.remove("animate-shake"), 550);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!target.trim() || resendCooldown > 0) return;
    setResendLoading(true);
    setError(""); setSuccess("");

    try {
      const normTarget = type === "phone_verify" ? normalizePhoneNumber(target) : target.trim().toLowerCase();
      await api.post("/auth/send-verification-otp", {
        ...(type === "phone_verify" ? { phoneNumber: normTarget } : { email: normTarget }),
      });

      showToast({ type: "success", title: "کد جدید ارسال شد" });
      setResendCooldown(RESEND_COOLDOWN);
      setCode("");
      inputRefs.current[0]?.focus();
    } catch {
      showToast({ type: "error", title: "ارسال مجدد ناموفق" });
    } finally {
      setResendLoading(false);
    }
  }

  const isPhone = type === "phone_verify" || (!target.includes("@") && type === "password_reset");
  const isComplete = code.length === OTP_LENGTH;
  const displayTarget = initialTarget || target;
  const formattedTarget = isPhone && displayTarget ? displayTarget.replace(/(\d{4})(\d{3})(\d{4})/, "$1 $2 $3") : displayTarget;

  return (
    <AuthShell
      eyebrow="تأیید هویت امن"
      title="کد یک‌بارمصرف را وارد کنید"
      description="برای امنیت بیشتر، کد ۶ رقمی ارسال‌شده را وارد کنید"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100">
            <ShieldCheck className="h-7 w-7 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-black text-slate-900">تأیید هویت</h1>
          <p className="mt-1.5 text-sm text-slate-500">
            کد ۶ رقمی به <span className="font-semibold text-slate-700">{displayTarget ? formattedTarget : "شماره یا ایمیل شما"}</span> ارسال شد
          </p>
        </div>

        {/* Type Tabs */}
        <div className="flex items-center justify-center gap-1.5 rounded-2xl bg-slate-100 p-1 text-sm">
          {[
            { value: "phone_verify", label: "موبایل", icon: Phone },
            { value: "email_verify", label: "ایمیل", icon: Mail },
            { value: "password_reset", label: "بازیابی", icon: KeyRound },
          ].map((opt) => {
            const Icon = opt.icon;
            const active = type === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => { setType(opt.value); setCode(""); setError(""); setTimeout(() => inputRefs.current[0]?.focus(), 50); }}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 font-medium transition-all",
                  active ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* OTP Input Section */}
        <div>
          <div className="mb-3 flex items-center justify-between px-1">
            <label className="text-sm font-semibold text-slate-700">کد تأیید ۶ رقمی</label>
            <button
              type="button"
              onClick={handleResend}
              disabled={resendLoading || resendCooldown > 0 || !target.trim()}
              className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 transition hover:text-emerald-700 disabled:opacity-50"
            >
              {resendLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : resendCooldown > 0 ? <Clock className="h-3.5 w-3.5" /> : <RefreshCw className="h-3.5 w-3.5" />}
              {resendCooldown > 0 ? `ارسال مجدد (${resendCooldown}s)` : resendLoading ? "در حال ارسال..." : "ارسال مجدد کد"}
            </button>
          </div>

          {/* 6 Professional Boxes */}
          <div id="otp-container" className="flex justify-center gap-2 sm:gap-3" dir="ltr" role="group" aria-label="کد تأیید ۶ رقمی">
            {Array.from({ length: OTP_LENGTH }).map((_, index) => {
              const digit = code[index] || "";
              const isFilled = !!digit;
              return (
                <input
                  key={index}
                  ref={setInputRef(index)}
                  type="text"
                  inputMode="numeric"
                  autoComplete={index === 0 ? "one-time-code" : "off"}
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onFocus={(e) => e.target.select()}
                  className={cn(
                    "h-14 w-11 sm:h-16 sm:w-12 rounded-2xl border-2 text-center text-2xl font-bold tracking-[2px] transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2",
                    error ? "border-red-300 bg-red-50/50 focus:border-red-500 focus:ring-red-200"
                    : isFilled ? "border-emerald-400 bg-emerald-50 text-emerald-700 shadow-inner"
                    : "border-slate-200 bg-white hover:border-slate-300 focus:border-emerald-500 focus:ring-emerald-200"
                  )}
                  aria-label={`رقم ${index + 1}`}
                />
              );
            })}
          </div>
          <p className="mt-3 text-center text-[13px] text-slate-400">کد را از پیامک یا ایمیل وارد کنید</p>
        </div>

        {/* Feedback */}
        <AnimatePresence>
          {success && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-700">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <span className="text-sm font-medium">{success}</span>
            </motion.div>
          )}
          {error && !success && (
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
              <StatusMessage variant="error">{error}</StatusMessage>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action Button */}
        <button
          type="button"
          onClick={() => void submitOtp()}
          disabled={loading || !isComplete || !target.trim()}
          className={cn(
            "group flex h-12 w-full items-center justify-center gap-2 rounded-2xl font-bold transition-all active:scale-[0.985]",
            isComplete ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-700" : "bg-slate-200 text-slate-400 cursor-not-allowed"
          )}
        >
          {loading ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> در حال بررسی کد...</>
          ) : (
            <>تأیید و ادامه <ArrowLeft className="h-4 w-4 transition group-hover:-translate-x-0.5" /></>
          )}
        </button>

        <div className="flex justify-center">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-[11px] text-slate-500">
            <ShieldCheck className="h-3 w-3 text-emerald-500" /> کد فقط ۱۰ دقیقه معتبر است
          </div>
        </div>

        <div className="flex flex-col items-center gap-y-2 pt-1 text-sm sm:flex-row sm:gap-x-4">
          <Link href="/login" className="font-medium text-slate-500 hover:text-emerald-600">بازگشت به ورود</Link>
          <span className="hidden text-slate-300 sm:block">•</span>
          <Link href="/" className="font-medium text-slate-500 hover:text-emerald-600">بازگشت به فروشگاه</Link>
        </div>
      </div>
    </AuthShell>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={<div className="flex min-h-dvh items-center justify-center">در حال بارگذاری...</div>}>
      <VerifyOtpContent />
    </Suspense>
  );
}
