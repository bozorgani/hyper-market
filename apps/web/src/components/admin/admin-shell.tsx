"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  BarChart3,
  Boxes,
  ChevronLeft,
  CreditCard,
  Gift,
  FolderTree,
  LayoutDashboard,
  LogOut,
  Menu,
  ReceiptText,
  Shield,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { isAdminRole } from "@/lib/auth";
import { useAuthStore } from "@/store/auth-store";

const menuItems = [
  { href: "/admin", label: "داشبورد", icon: LayoutDashboard },
  { href: "/admin/analytics", label: "آنالیتیکس", icon: Activity },
  { href: "/admin/products", label: "محصولات", icon: Boxes },
  { href: "/admin/categories", label: "دسته‌بندی‌ها", icon: FolderTree },
  { href: "/admin/orders", label: "سفارش‌ها", icon: ReceiptText },
  { href: "/admin/payments", label: "پرداخت‌ها", icon: CreditCard },
  { href: "/admin/coupons", label: "کوپن‌ها", icon: Gift },
  { href: "/admin/users", label: "کاربران", icon: Users },
  { href: "/admin/roles", label: "نقش‌ها و دسترسی‌ها", icon: Shield },
];

const sidebarVariants = {
  open: { x: 0, opacity: 1 },
  closed: { x: 280, opacity: 0 },
};

const overlayVariants = {
  open: { opacity: 1 },
  closed: { opacity: 0 },
};

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const hydrated = useAuthStore((state) => state.hydrated);
  const logout = useAuthStore((state) => state.logout);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (hydrated && !isAdminRole(user?.role)) {
      router.replace("/");
    }
  }, [hydrated, router, user?.role]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMobileOpen(false);
  }, [pathname]);

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
          <p className="text-sm text-slate-400">در حال بررسی دسترسی...</p>
        </div>
      </div>
    );
  }

  if (!isAdminRole(user?.role)) {
    return null;
  }

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Logo Section */}
      <div className="relative overflow-hidden p-5 pb-4">
        <div className="absolute inset-0 bg-gradient-to-bl from-emerald-600/20 via-transparent to-transparent" />
        <div className="relative flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-lg shadow-emerald-500/25">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <AnimatePresence>
            {(!collapsed || mobileOpen) && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                className="overflow-hidden"
              >
                <p className="whitespace-nowrap text-base font-black text-white">هایپرمارکت</p>
                <p className="whitespace-nowrap text-xs text-slate-400">پنل مدیریت</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 scrollbar-hide">
        <div className="mb-2 px-3 pt-2">
          {(!collapsed || mobileOpen) && (
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">منوی اصلی</p>
          )}
        </div>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(`${item.href}/`));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                active
                  ? "bg-emerald-500/15 text-emerald-400"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-200",
              )}
            >
              {active && (
                <motion.div
                  layoutId="admin-active-tab"
                  className="absolute inset-0 rounded-xl bg-emerald-500/10"
                  transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                />
              )}
              <Icon className={cn("relative z-10 h-[18px] w-[18px] shrink-0", active && "drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]")} />
              {(!collapsed || mobileOpen) && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="relative z-10 whitespace-nowrap"
                >
                  {item.label}
                </motion.span>
              )}
              {active && (!collapsed || mobileOpen) && (
                <ChevronLeft className="relative z-10 mr-auto h-4 w-4 text-emerald-400" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className="border-t border-white/5 p-3">
        {(!collapsed || mobileOpen) && user && (
          <div className="mb-3 flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-xs font-bold text-white">
              {user.email?.[0]?.toUpperCase() ?? "A"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{user.email}</p>
              <p className="text-xs text-slate-500">مدیر سیستم</p>
            </div>
          </div>
        )}
        <button
          onClick={() => {
            void logout();
            router.replace("/");
          }}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition-all hover:bg-red-500/10 hover:text-red-400"
        >
          <LogOut className="h-[18px] w-[18px] shrink-0" />
          {(!collapsed || mobileOpen) && <span>خروج از حساب</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden lg:flex lg:shrink-0 lg:flex-col lg:border-l lg:border-white/5 bg-slate-950 transition-all duration-300",
          collapsed ? "lg:w-[78px]" : "lg:w-[270px]",
        )}
      >
        {/* Collapse Toggle - Desktop */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute left-0 top-7 z-50 hidden h-7 w-7 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-slate-400 transition hover:bg-slate-700 hover:text-white lg:flex"
          style={{ left: collapsed ? "58px" : "250px" }}
        >
          <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
        </button>
        {sidebarContent}
      </aside>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            variants={overlayVariants}
            initial="closed"
            animate="open"
            exit="closed"
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile Sidebar Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.aside
            variants={sidebarVariants}
            initial="closed"
            animate="open"
            exit="closed"
            transition={{ type: "spring", damping: 25, stiffness: 250 }}
            className="fixed inset-y-0 right-0 z-50 w-[280px] bg-slate-950 shadow-2xl lg:hidden"
          >
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute left-3 top-5 z-10 rounded-xl p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
            {sidebarContent}
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header Bar */}
        <header className="flex h-16 shrink-0 items-center gap-4 border-b border-slate-200/80 bg-white px-4 shadow-sm lg:px-8">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Breadcrumb / Page Title */}
          <div className="flex-1">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-400">مدیریت</span>
              <ChevronLeft className="h-3.5 w-3.5 text-slate-300" />
              <span className="font-semibold text-slate-900">
                {menuItems.find((item) => pathname === item.href || (item.href !== "/admin" && pathname.startsWith(`${item.href}/`)))?.label ?? "داشبورد"}
              </span>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="hidden items-center gap-2 md:flex">
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              سیستم فعال
            </div>
          </div>

          {/* Notifications */}
          <button className="relative flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100">
            <BarChart3 className="h-5 w-5" />
          </button>
        </header>

        {/* Scrollable Content */}
        <main id="main-content" className="flex-1 overflow-y-auto p-4 lg:p-8">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}