"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  Activity,
  BarChart3,
  Boxes,
  CreditCard,
  FolderTree,
  LayoutDashboard,
  LogOut,
  ReceiptText,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";

const menuItems = [
  { href: "/admin", label: "داشبورد", icon: LayoutDashboard },
  { href: "/admin/analytics", label: "آنالیتیکس", icon: Activity },
  { href: "/admin/products", label: "محصولات", icon: Boxes },
  { href: "/admin/categories", label: "دسته‌بندی‌ها", icon: FolderTree },
  { href: "/admin/orders", label: "سفارش‌ها", icon: ReceiptText },
  { href: "/admin/payments", label: "پرداخت‌ها", icon: CreditCard },
  { href: "/admin/users", label: "کاربران", icon: Users },
];

function isAdminRole(role?: string) {
  return (
    role === "ADMIN" ||
    role === "SUPER_ADMIN" ||
    role === "admin" ||
    role === "super_admin"
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const hydrated = useAuthStore((state) => state.hydrated);
  const logout = useAuthStore((state) => state.logout);

  useEffect(() => {
    if (hydrated && !isAdminRole(user?.role)) {
      router.replace("/");
    }
  }, [hydrated, router, user?.role]);

  if (!hydrated) {
    return <main className="p-8 text-center text-slate-500">در حال بررسی دسترسی...</main>;
  }

  if (!isAdminRole(user?.role)) {
    return null;
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-100">
      <div className="mx-auto grid max-w-7xl gap-4 px-4 py-4 lg:grid-cols-[260px_1fr]">
        <aside className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm lg:sticky lg:top-20 lg:h-fit">
          <div className="mb-4 flex items-center gap-3 rounded-2xl bg-rose-50 p-4 text-rose-700">
            <BarChart3 className="h-6 w-6" />
            <div>
              <p className="font-black">پنل مدیریت</p>
              <p className="text-xs">هایپرمارکت</p>
            </div>
          </div>
          <nav className="grid gap-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50",
                    active && "bg-rose-600 text-white hover:bg-rose-600",
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
            <button
              onClick={() => {
                void logout();
                router.replace("/");
              }}
              className="mt-2 flex items-center gap-3 rounded-2xl px-4 py-3 text-right text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              <LogOut className="h-5 w-5" />
              خروج
            </button>
          </nav>
        </aside>
        <section className="min-w-0">{children}</section>
      </div>
    </div>
  );
}
