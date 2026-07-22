"use client";

import { motion } from "@/components/ui/csp-motion";
import { ShieldCheck, ShoppingCart, Truck, Headphones, ArrowLeftRight, CreditCard } from "lucide-react";

type AuthFeature = {
  title: string;
  description: string;
  icon?: React.ReactNode;
};

const defaultFeatures: AuthFeature[] = [
  { title: "خرید روزانه آسان", description: "محصولات موردنیازتان را سریع و ساده پیدا کنید", icon: <ShoppingCart className="h-5 w-5" /> },
  { title: "محصولات تازه و مطمئن", description: "انتخابی مطمئن برای خریدهای روزمره شما", icon: <ShieldCheck className="h-5 w-5" /> },
  { title: "پیگیری سفارش", description: "وضعیت سفارش را از ثبت تا تحویل دنبال کنید", icon: <Truck className="h-5 w-5" /> },
  { title: "پشتیبانی در کنار شما", description: "هر زمان نیاز داشتید، تیم ما پاسخ‌گوست", icon: <Headphones className="h-5 w-5" /> },
];

export function AuthShell({
  eyebrow,
  title,
  description,
  features,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  description: string;
  features?: AuthFeature[];
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const featureList = features ?? defaultFeatures;

  return (
    <div id="main-content" className="flex min-h-dvh bg-slate-50">
      {/* Left Branding Panel - Desktop Only */}
      <div className="relative hidden w-[480px] shrink-0 overflow-hidden bg-slate-950 lg:flex lg:flex-col lg:justify-between">
        {/* Background Pattern */}
        <div className="absolute inset-0">
          {/* Gradient orbs */}
          <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-rose-500/20 blur-[100px]" />
          <div className="absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-rose-600/15 blur-[120px]" />
          <div className="absolute left-1/2 top-1/3 h-48 w-48 rounded-full bg-rose-500/10 blur-[80px]" />
          {/* Grid pattern */}
          <div className="auth-grid-pattern absolute inset-0 opacity-[0.03]" />
        </div>

        {/* Top Section */}
        <div className="relative z-10 flex-1 p-10 pt-14">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-rose-700 shadow-lg shadow-rose-500/30">
                <ShoppingCart className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-black text-white">هایپرمارکت</h2>
                <p className="text-xs text-rose-400">Hyper Market</p>
              </div>
            </div>

            {/* Title */}
            <div className="mt-12">
              <div className="inline-flex items-center gap-2 rounded-full bg-rose-500/15 px-4 py-1.5 text-xs font-semibold text-rose-400 backdrop-blur">
                <ShieldCheck className="h-3.5 w-3.5" />
                {eyebrow}
              </div>
              <h1 className="mt-5 text-3xl font-black leading-snug text-white">{title}</h1>
              <p className="mt-4 max-w-sm leading-7 text-slate-400">{description}</p>
            </div>
          </motion.div>
        </div>

        {/* Bottom Features */}
        <div className="relative z-10 space-y-3 p-10 pt-0">
          {featureList.map((feature, idx) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + idx * 0.08, duration: 0.4 }}
              className="flex items-start gap-3.5 rounded-2xl bg-white/5 p-3.5 backdrop-blur transition hover:bg-white/[0.08]"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/15 text-rose-400">
                {feature.icon ?? <ArrowLeftRight className="h-5 w-5" />}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-white">{feature.title}</p>
                <p className="mt-0.5 text-xs leading-5 text-slate-500">{feature.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="flex flex-1 flex-col">
        {/* Mobile Header */}
        <div className="border-b border-slate-100 bg-white px-4 py-3 sm:px-5 sm:py-4 lg:hidden">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-rose-700 shadow-lg shadow-rose-500/20">
              <ShoppingCart className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-black text-slate-900">هایپرمارکت</p>
              <p className="text-xs text-slate-400">{eyebrow}</p>
            </div>
          </div>
        </div>

        {/* Form Content */}
        <div className="flex flex-1 items-start justify-center px-3 py-5 sm:items-center sm:px-6 sm:py-8 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="w-full max-w-[440px]"
          >
            {/* Desktop: show eyebrow badge */}
            <div className="hidden lg:block mb-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-4 py-1.5 text-xs font-semibold text-rose-700">
                <ShieldCheck className="h-3.5 w-3.5" />
                {eyebrow}
              </div>
            </div>

            {/* Form Card */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-7 lg:p-8">
              {children}
              {footer ? <div className="mt-6 border-t border-slate-100 pt-5">{footer}</div> : null}
            </div>

            {/* Desktop Trust Badges */}
            <div className="mt-6 hidden flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-slate-400 lg:flex">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-rose-500" />
                <span>اتصال امن SSL</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5 text-rose-500" />
                <span>پرداخت مطمئن</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Headphones className="h-3.5 w-3.5 text-rose-500" />
                <span>پشتیبانی ۲۴/۷</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}