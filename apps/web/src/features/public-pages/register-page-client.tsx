"use client";


import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { motion } from "@/components/ui/csp-motion";
import { Mail, Phone, Lock, Eye, EyeOff, Loader2, UserPlus } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { StatusMessage } from "@/components/ui/status-message";
import { useToast } from "@/components/ui/toast";
import { firstValidationError, normalizeDigits, normalizePhoneNumber, registerSchema } from "@/lib/validation/auth";
import { api } from "@/services/api";
import { cn } from "@/lib/utils";

export function RegisterPageClient() {
  const router = useRouter();
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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

  // Password strength indicator
  const passwordStrength = useMemo(() => {
    if (!password) return { level: 0, label: "", color: "" };
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    if (score <= 2) return { level: 1, label: "ضعیف", color: "bg-red-400" };
    if (score <= 3) return { level: 2, label: "متوسط", color: "bg-amber-400" };
    return { level: 3, label: "قوی", color: "bg-green-500" };
  }, [password]);

  return (
    <AuthShell
      eyebrow="ایجاد حساب جدید"
      title="عضویت در هایپرمارکت"
      description="با ساخت حساب کاربری، از تخفیف‌های اختصاصی، پیگیری سفارش‌ها و تجربه خرید شخصی‌سازی‌شده بهره‌مند شوید."
    >
      {/* Form Header */}
      <div className="mb-5 sm:mb-7">
        <h2 className="text-xl font-black text-slate-900">ثبت‌نام</h2>
        <p className="mt-1.5 text-sm text-slate-500">اطلاعات خود را وارد کنید تا حساب جدید بسازید</p>
      </div>

      {/* Form */}
      <form onSubmit={submit} className="space-y-4 sm:space-y-5">
        {/* Email Field */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-600">ایمیل</label>
          <div className="relative">
            <Mail className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              type="email"
              dir="ltr"
              className={cn(
                "h-12 w-full rounded-xl border bg-white pr-10 pl-4 text-left text-sm text-slate-900 outline-none transition placeholder:text-slate-400",
                error
                  ? "border-red-300 focus:border-red-400 focus:ring-4 focus:ring-red-50"
                  : "border-slate-200 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50",
              )}
            />
          </div>
        </div>

        {/* Phone Field */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-600">شماره موبایل</label>
          <div className="relative">
            <Phone className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(normalizeDigits(e.target.value))}
              onBlur={() => setPhoneNumber(normalizePhoneNumber(phoneNumber))}
              placeholder="09123456789"
              inputMode="numeric"
              maxLength={11}
              className={cn(
                "h-12 w-full rounded-xl border bg-white pr-10 pl-4 text-right text-sm text-slate-900 outline-none transition placeholder:text-slate-400 font-mono",
                error
                  ? "border-red-300 focus:border-red-400 focus:ring-4 focus:ring-red-50"
                  : "border-slate-200 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50",
              )}
            />
          </div>
          <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-500">حداقل یکی از فیلدهای ایمیل یا موبایل الزامی است.</p>
        </div>

        {/* Password Field */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-600">رمز عبور</label>
          <div className="relative">
            <Lock className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="حداقل ۸ کاراکتر شامل حروف و اعداد"
              type={showPassword ? "text" : "password"}
              required
              className={cn(
                "h-12 w-full rounded-xl border bg-white pr-10 pl-10 text-right text-sm text-slate-900 outline-none transition placeholder:text-slate-400",
                error
                  ? "border-red-300 focus:border-red-400 focus:ring-4 focus:ring-red-50"
                  : "border-slate-200 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50",
              )}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "مخفی کردن رمز عبور" : "نمایش رمز عبور"}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 transition hover:text-slate-600 focus-visible:ring-2 focus-visible:ring-emerald-100"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {/* Password Strength Bar */}
          {password && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-medium text-slate-400">قدرت رمز عبور</span>
                <span className={`text-[10px] font-semibold ${passwordStrength.level === 3 ? "text-emerald-600" : passwordStrength.level === 2 ? "text-amber-600" : "text-red-600"}`}>
                  {passwordStrength.label}
                </span>
              </div>
              <div className="flex gap-1.5">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                      passwordStrength.level >= i ? passwordStrength.color : "bg-slate-100"
                    }`}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* Warning/Error Messages */}
        {!email.trim() && !phoneNumber.trim() ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <StatusMessage variant="warning">برای ادامه، یکی از فیلدهای ایمیل یا شماره موبایل را تکمیل کنید.</StatusMessage>
          </motion.div>
        ) : null}
        {error && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}>
            <StatusMessage variant="error">{error}</StatusMessage>
          </motion.div>
        )}

        {/* Submit Button */}
        <motion.div whileTap={{ scale: 0.98 }}>
          <Button
            type="submit"
            disabled={loading || !canSubmit}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                در حال ثبت...
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4" />
                ساخت حساب کاربری
              </>
            )}
          </Button>
        </motion.div>
      </form>

      {/* Footer */}
      <p className="mt-5 text-center text-sm leading-6 text-slate-500">
        حساب دارید؟{" "}
        <Link href="/login" className="font-bold text-emerald-600 transition hover:text-emerald-700">وارد شوید</Link>
      </p>
    </AuthShell>
  );
}