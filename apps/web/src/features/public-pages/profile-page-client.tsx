"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { ProtectedRoute } from "@/components/layout/protected-route";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { cn, formatNumber, formatPrice, formatPersianDate } from "@/lib/utils";
import { isAdminRole, isCustomerRole } from "@/lib/auth";
import { useAuthStore } from "@/store/auth-store";
import { useMyOrders } from "@/hooks/use-orders";
import {
  User, Settings, Heart, MapPin, Bell, Shield,
  ChevronLeft, LogOut, Star, Package, Clock,
  CheckCircle2, Truck, Camera, Gift,
} from "lucide-react";
import type { OrderStatus } from "@/types/domain";

const statusConfig: Record<string, { label: string; color: string; bg: string; Icon: typeof CheckCircle2 }> = {
  delivered: { label: "تحویل شده", color: "text-emerald-600", bg: "bg-emerald-50", Icon: CheckCircle2 },
  shipped: { label: "ارسال شده", color: "text-blue-600", bg: "bg-blue-50", Icon: Truck },
  processing: { label: "در حال پردازش", color: "text-violet-600", bg: "bg-violet-50", Icon: Package },
  paid: { label: "پرداخت‌شده", color: "text-sky-600", bg: "bg-sky-50", Icon: CheckCircle2 },
  pending: { label: "در انتظار", color: "text-amber-600", bg: "bg-amber-50", Icon: Clock },
  cancelled: { label: "لغو شده", color: "text-red-600", bg: "bg-red-50", Icon: Clock },
};

function getStatusConfig(status: OrderStatus) {
  return statusConfig[status] ?? statusConfig.pending;
}

const menuItems = [
  { icon: Package, label: "سفارش‌های من", href: "/orders", color: "text-blue-600", bg: "bg-blue-50" },
  { icon: Heart, label: "علاقه‌مندی‌ها", href: "/products", color: "text-rose-600", bg: "bg-rose-50" },
  { icon: MapPin, label: "آدرس‌های من", href: "/profile/addresses", color: "text-emerald-600", bg: "bg-emerald-50" },
  { icon: Gift, label: "کد هدیه و تخفیف", href: "/checkout", color: "text-amber-600", bg: "bg-amber-50" },
  { icon: Bell, label: "اعلان‌ها", href: "#", color: "text-purple-600", bg: "bg-purple-50" },
  { icon: Shield, label: "حریم خصوصی", href: "#", color: "text-slate-600", bg: "bg-slate-100" },
  { icon: Settings, label: "تنظیمات", href: "#", color: "text-slate-500", bg: "bg-slate-100" },
];

export function ProfilePageClient() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const hydrated = useAuthStore((state) => state.hydrated);
  const logout = useAuthStore((state) => state.logout);
  const { showToast } = useToast();
  const isCustomer = isCustomerRole(user?.role);
  const ordersQuery = useMyOrders(Boolean(hydrated && isCustomer));
  const recentOrders = useMemo(
    () => (ordersQuery.data ?? []).slice(0, 3),
    [ordersQuery.data],
  );

  useEffect(() => {
    if (hydrated && isAdminRole(user?.role)) {
      router.replace("/admin");
    }
  }, [hydrated, router, user?.role]);

  function handleLogout() {
    void logout();
    showToast({ type: "info", title: "از حساب کاربری خارج شدید" });
  }

  return (
    <ProtectedRoute>
      <div className="mx-auto max-w-3xl px-4 py-8 text-right">
        {/* Profile Header Card */}
        <div className="relative overflow-hidden rounded-3xl mb-6">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-bl from-rose-600 via-rose-500 to-orange-500 h-48" />
          {/* Decorative circles */}
          <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full bg-white/[0.08]" />
          <div className="absolute -bottom-6 -left-6 w-28 h-28 rounded-full bg-white/[0.06]" />

          <div className="relative px-5 pt-5 pb-0">
            {/* Settings icon */}
            <div className="flex items-center justify-end mb-8">
              <div className="w-9 h-9 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center">
                <Settings className="w-[18px] h-[18px] text-white" />
              </div>
            </div>

            {/* Avatar & Info */}
            <div className="flex items-end gap-4 mb-4">
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-white/30 to-white/10 backdrop-blur-sm border-2 border-white/40 flex items-center justify-center shadow-lg">
                  <div className="w-[68px] h-[68px] rounded-xl bg-white/20 flex items-center justify-center">
                    <User className="w-9 h-9 text-white/80" />
                  </div>
                </div>
                <div className="absolute -bottom-1.5 -left-1.5 w-7 h-7 bg-white rounded-lg shadow-sm flex items-center justify-center">
                  <Camera className="w-3.5 h-3.5 text-slate-500" />
                </div>
              </div>

              <div className="flex-1 pb-1">
                <h1 className="text-white font-black text-lg leading-tight">
                  {user?.phoneNumber || (user?.email ? user.email.split("@")[0] : "کاربر")}
                </h1>
                <p className="text-white/70 text-xs mt-0.5">
                  {user?.email || user?.phoneNumber || "حساب کاربری"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="bg-white rounded-2xl shadow-card p-4 grid grid-cols-3 gap-4 mb-6 -mt-2">
          <div className="flex flex-col items-center gap-1">
            <Package className="w-5 h-5 text-blue-600" />
            <span className="font-black text-base text-slate-900">
              {ordersQuery.isLoading ? "—" : formatNumber(ordersQuery.data?.length ?? 0)}
            </span>
            <span className="text-[10px] text-slate-400">سفارش</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Heart className="w-5 h-5 text-rose-600" />
            <span className="font-black text-base text-slate-900">—</span>
            <span className="text-[10px] text-slate-400">علاقه‌مندی</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Star className="w-5 h-5 text-amber-500" />
            <span className="font-black text-base text-slate-900">۰</span>
            <span className="text-[10px] text-slate-400">امتیاز</span>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-black text-sm text-slate-800">سفارش‌های اخیر</h2>
            <Link href="/orders" className="text-xs text-rose-600 font-medium flex items-center gap-0.5 hover:underline">
              مشاهده همه
              <ChevronLeft className="w-3.5 h-3.5 rotate-180" />
            </Link>
          </div>

          {ordersQuery.isLoading ? (
            <div className="space-y-2.5">
              {Array.from({ length: 2 }).map((_, i) => (
                <Card key={i} className="p-3.5 flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
                  <div className="flex-1"><Skeleton className="h-4 w-32" /><Skeleton className="mt-2 h-3 w-48" /></div>
                </Card>
              ))}
            </div>
          ) : recentOrders.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">هنوز سفارشی ثبت نشده است.</p>
          ) : (
            <div className="space-y-2.5">
              {recentOrders.map((order) => {
                const config = getStatusConfig(order.status);
                const StatusIcon = config.Icon;
                return (
                  <Link key={order._id} href={`/order/success?orderId=${order._id}`}>
                    <Card className="p-3.5 flex items-center gap-3 hover:shadow-card-hover transition-shadow cursor-pointer">
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", config.bg)}>
                        <StatusIcon className={cn("w-5 h-5", config.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-bold text-slate-800">
                            {formatNumber(order.items.length)} قلم کالا
                          </p>
                          <span className="font-bold text-sm text-slate-800">
                            {formatPrice(order.totalPrice)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-[11px] text-slate-400">{formatPersianDate(order.createdAt)}</span>
                          <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-md", config.bg, config.color)}>
                            {config.label}
                          </span>
                        </div>
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Account Info */}
        <Card className="p-6 mb-4">
          <h2 className="text-lg font-black mb-4">اطلاعات حساب</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoRow label="شماره موبایل" value={user?.phoneNumber} />
            <InfoRow label="ایمیل" value={user?.email} />
          </div>
        </Card>

        {/* Menu Items */}
        <Card className="overflow-hidden divide-y divide-slate-50 mb-4">
          {menuItems.map((item) => (
            <Link key={item.label} href={item.href}>
              <div className="flex items-center gap-3.5 px-5 py-3.5 hover:bg-slate-50 transition-colors">
                <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", item.bg)}>
                  <item.icon className={cn("w-[18px] h-[18px]", item.color)} />
                </div>
                <p className="flex-1 text-sm font-medium text-slate-800">{item.label}</p>
                <ChevronLeft className="w-4 h-4 text-slate-300 rotate-180" />
              </div>
            </Link>
          ))}
        </Card>

        {/* Logout */}
        <Button
          type="button"
          variant="ghost"
          onClick={handleLogout}
          className="w-full h-12 text-red-600 hover:bg-red-50 rounded-2xl text-sm font-bold gap-2"
        >
          <LogOut className="w-4 h-4" />
          خروج از حساب
        </Button>
      </div>
    </ProtectedRoute>
  );
}

function InfoRow({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3.5">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={cn(
        "mt-1.5 font-semibold text-slate-900 text-sm",
        mono && "ltr break-all text-left font-mono"
      )}>
        {value || "ثبت نشده"}
      </p>
    </div>
  );
}