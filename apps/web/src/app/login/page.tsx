"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { motion } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, ArrowLeft, Loader2 } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { StatusMessage } from "@/components/ui/status-message";
import { useToast } from "@/components/ui/toast";
import { firstValidationError, loginSchema, normalizeDigits, normalizePhoneNumber } from "@/lib/validation/auth";
import { useAuthStore } from "@/store/auth-store";
import { cn } from "@/lib/utils";

function isAdminRole(role?: string) {
  return role === "admin" || role === "super_admin" || role === "ADMIN" || role === "SUPER_ADMIN";
}

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const { showToast } = useToast();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
      const loggedInUser = useAuthStore.getState().user;
      const redirect = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("redirect") : null;
      const safeRedirect = redirect?.startsWith("/") && !redirect.startsWith("//") ? redirect : null;
      showToast({ type: "success", title: "با موفقیت وارد شدید" });
      router.push(safeRedirect ?? (isAdminRole(loggedInUser?.role) ? "/admin" : "/profile"));
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
      title="به حساب خود برگردید"
      description="وارد حساب کاربری شوید و به تمام سفارش‌ها، لیست علاقه‌مندی‌ها و تخفیف‌های اختصاصی خود دسترسی پیدا کنید."
    >
      {/* Form Header */}
      <div className="mb-5 sm:mb-7">
        <h2 className="text-xl font-black text-slate-900">ورود به حساب</h2>
        <p className="mt-1.5 text-sm text-slate-500">ایمیل یا شماره موبایل و رمز عبور خود را وارد کنید</p>
      </div>

      {/* Form */}
      <form onSubmit={submit} className="space-y-4 sm:space-y-5">
        {/* Identifier Field */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-600">ایمیل یا شماره موبایل</label>
          <div className="relative">
            <Mail className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={identifier}
              onChange={(e) => setIdentifier(normalizeDigits(e.target.value))}
              onBlur={() => {
                if (identifier && !identifier.includes("@")) setIdentifier(normalizePhoneNumber(identifier));
              }}
              placeholder="example@email.com یا 0912..."
              required
              inputMode="text"
              className={cn(
                "h-12 w-full rounded-xl border bg-white pr-10 pl-4 text-right text-sm text-slate-900 outline-none transition placeholder:text-slate-400",
                error
                  ? "border-red-300 focus:border-red-400 focus:ring-4 focus:ring-red-50"
                  : "border-slate-200 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50",
              )}
            />
          </div>
        </div>

        {/* Password Field */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-600">رمز عبور</label>
            <button type="button" className="text-xs font-medium text-emerald-600 transition hover:text-emerald-700">
              فراموشی رمز عبور
            </button>
          </div>
          <div className="relative">
            <Lock className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="رمز عبور خود را وارد کنید"
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
        </div>

        {/* Error Message */}
        {error && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}>
            <StatusMessage variant="error">{error}</StatusMessage>
          </motion.div>
        )}

        {/* Submit Button */}
        <motion.div whileTap={{ scale: 0.98 }}>
          <button
            type="submit"
            disabled={loading || !identifier.trim() || !password.trim()}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl whitespace-nowrap bg-gradient-to-l from-emerald-500 to-emerald-600 text-sm font-bold text-white shadow-lg shadow-emerald-500/25 transition-all hover:from-emerald-600 hover:to-emerald-700 hover:shadow-xl hover:shadow-emerald-500/30 disabled:opacity-50 disabled:pointer-events-none"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                در حال ورود...
              </>
            ) : (
              <>
                ورود به حساب
                <ArrowLeft className="h-4 w-4" />
              </>
            )}
          </button>
        </motion.div>
      </form>

      {/* Footer */}
      <div className="mt-5 flex flex-col gap-3 text-center text-sm leading-6 text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:text-right">
        <span>حساب ندارید؟{" "}<Link href="/register" className="font-bold text-emerald-600 transition hover:text-emerald-700">ثبت‌نام کنید</Link></span>
        <Link href="/verify-otp" className="font-medium text-slate-500 transition hover:text-emerald-600">تأیید کد پیامکی / ایمیلی</Link>
      </div>
    </AuthShell>
  );
}