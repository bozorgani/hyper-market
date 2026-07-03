"use client";

import { motion } from "framer-motion";
import { User, Package, Heart, Bell, HelpCircle, LogOut, Settings, ChevronLeft, MapPin, CreditCard, Gift } from "lucide-react";
import { useMarketStore } from "@/store/market-store";

const stats = [
  { label: "سفارش", value: "۱۲" },
  { label: "امتیاز", value: "۸۵۰" },
  { label: "تخفیف", value: "۳" },
];

const mockOrders = [
  { id: "۱۰۲۳۴۵", date: "۱۴۰۴/۰۳/۱۵", total: "۳۴۵,۰۰۰", status: "تحویل شده" as const },
  { id: "۱۰۲۱۲۳", date: "۱۴۰۴/۰۳/۱۰", total: "۱۲۰,۰۰۰", status: "در حال ارسال" as const },
  { id: "۱۰۱۹۸۷", date: "۱۴۰۴/۰۳/۰۵", total: "۵۶۰,۰۰۰", status: "تحویل شده" as const },
];

interface MenuItem {
  id: string;
  label: string;
  icon: typeof User;
  badge?: string;
}

const menuSections: MenuItem[][] = [
  [
    { id: "orders", label: "سفارش‌های من", icon: Package },
    { id: "addresses", label: "آدرس‌ها", icon: MapPin },
    { id: "wallet", label: "کیف پول", icon: CreditCard, badge: "۱۵۰,۰۰۰ تومان" },
  ],
  [
    { id: "favorites", label: "علاقه‌مندی‌ها", icon: Heart },
    { id: "discounts", label: "کد تخفیف من", icon: Gift, badge: "۲ کد" },
    { id: "notifications", label: "اعلان‌ها", icon: Bell },
  ],
  [
    { id: "support", label: "پشتیبانی", icon: HelpCircle },
    { id: "settings", label: "تنظیمات", icon: Settings },
    { id: "logout", label: "خروج از حساب", icon: LogOut },
  ],
];

export function ProfilePage() {
  const { navigate } = useMarketStore();

  return (
    <div className="min-h-screen bg-slate-50/80 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-bl from-emerald-500 to-green-600 px-4 pb-8 pt-6">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur text-2xl">
            👤
          </div>
          <div>
            <h1 className="text-lg font-black text-white">کاربر مهمان</h1>
            <p className="text-sm text-white/70">۰۹۱۲۳۴۵۶۷۸۹</p>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-3 gap-3">
          {stats.map((s) => (
            <div key={s.label} className="rounded-2xl bg-white/15 p-3 text-center backdrop-blur">
              <p className="text-xl font-black text-white">{s.value}</p>
              <p className="text-[11px] text-white/70 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Recent orders */}
      <div className="mx-4 -mt-4 rounded-2xl bg-white p-4 shadow-card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-800">سفارش‌های اخیر</h2>
        </div>
        <div className="space-y-3">
          {mockOrders.map((order) => (
            <div key={order.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5">
              <div>
                <p className="text-xs font-bold text-slate-700">سفارش #{order.id}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{order.date}</p>
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-slate-700">{order.total} تومان</p>
                <span className={`text-[10px] font-semibold ${order.status === "تحویل شده" ? "text-emerald-600" : "text-amber-600"}`}>
                  {order.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Menu sections */}
      <div className="mx-4 mt-4 space-y-4">
        {menuSections.map((section, si) => (
          <motion.div
            key={si}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: si * 0.08 }}
            className="rounded-2xl bg-white shadow-card overflow-hidden"
          >
            {section.map((item) => (
              <button
                key={item.id}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-right hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
                onClick={() => {
                  if (item.id === "orders") navigate({ type: "home" });
                }}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                  <item.icon size={18} className="text-slate-600" />
                </div>
                <span className="flex-1 text-sm font-semibold text-slate-700">{item.label}</span>
                {"badge" in item && item.badge && (
                  <span className="rounded-lg bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600">{item.badge}</span>
                )}
                <ChevronLeft size={16} className="text-slate-400" />
              </button>
            ))}
          </motion.div>
        ))}
      </div>
    </div>
  );
}