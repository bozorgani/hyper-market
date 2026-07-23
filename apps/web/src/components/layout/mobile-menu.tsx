"use client";

import Link from "next/link";
import { X, ShoppingBag, Heart, MapPin, Package, User, LogIn } from "lucide-react";
import { Drawer } from "@/components/ui/dialog";
import { useAuthStore } from "@/store/auth-store";
import { useToast } from "@/components/ui/toast";
import { isCustomerRole } from "@/lib/auth";
import { useCart } from "@/hooks/use-cart";

type MobileMenuProps = {
  open: boolean;
  onClose: () => void;
};

function MobileMenuContent({ open, onClose }: MobileMenuProps) {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const isCustomer = isCustomerRole(user?.role);
  const cart = useCart(isCustomer);
  const cartItems = cart.data?.items ?? [];
  const cartCount = isCustomer
    ? cartItems.reduce((sum, item) => sum + (item.quantity ?? 0), 0)
    : 0;
  const { showToast } = useToast();

  function handleLogout() {
    void logout();
    showToast({ type: "info", title: "از حساب کاربری خارج شدید" });
    onClose();
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      ariaLabel="منوی اصلی"
      containerClassName="z-[70] bg-black/40 p-0 lg:hidden"
      className="w-72 bg-white px-5 py-6 text-sm"
    >
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-rose-600 shadow-md text-white font-black text-sm">
            H
          </div>
          <div>
            <p className="text-sm font-black text-slate-900 leading-none">هایپرمارکت</p>
            <p className="text-[10px] text-rose-600 font-medium mt-0.5">HyperMarket</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          aria-label="بستن منو"
          title="بستن منوی اصلی"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      {/* User Info (if logged in) */}
      {user ? (
        <div className="mb-4 rounded-2xl bg-slate-50 p-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-rose-600">
              <User className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate">
                {user.email || user.phoneNumber || "کاربر هایپرمارکت"}
              </p>
              <Link
                href="/profile"
                onClick={onClose}
                className="text-xs text-rose-600 font-medium hover:text-rose-700"
              >
                مشاهده پروفایل
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <Link
          href="/login"
          onClick={onClose}
          className="mb-4 flex items-center gap-3 rounded-2xl bg-rose-50 p-3.5 transition hover:bg-rose-100"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-rose-600">
            <LogIn className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-rose-700">ورود / ثبت‌نام</p>
            <p className="text-xs text-rose-500">برای دسترسی به حساب کاربری</p>
          </div>
        </Link>
      )}

      {/* Divider */}
      <div className="border-t border-slate-100 mb-3" />

      {/* Main Navigation */}
      <div className="space-y-0.5">
        <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">دسته‌بندی و خرید</p>
        <Link
          href="/products"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-slate-100"
          onClick={onClose}
        >
          <ShoppingBag className="h-4.5 w-4.5 text-slate-500" />
          <span className="font-medium text-slate-700">محصولات</span>
        </Link>
        <Link
          href="/categories"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-slate-100"
          onClick={onClose}
        >
          <span className="flex h-[18px] w-[18px] items-center justify-center text-base">📂</span>
          <span className="font-medium text-slate-700">دسته‌بندی‌ها</span>
        </Link>
        {user && (
          <Link
            href="/wishlist"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-slate-100"
            onClick={onClose}
          >
            <Heart className="h-4.5 w-4.5 text-slate-500" />
            <span className="font-medium text-slate-700">علاقه‌مندی‌ها</span>
          </Link>
        )}
        {user && (
          <Link
            href="/cart"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-slate-100"
            onClick={onClose}
          >
            <div className="relative">
              <span className="text-base">🛒</span>
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-0.5 text-[9px] font-black text-white ring-1 ring-white">
                  {cartCount > 9 ? "۹+" : cartCount.toLocaleString("fa-IR")}
                </span>
              )}
            </div>
            <span className="font-medium text-slate-700">سبد خرید</span>
            {cartCount > 0 && (
              <span className="mr-auto text-xs text-rose-600 font-bold">{cartCount.toLocaleString("fa-IR")} کالا</span>
            )}
          </Link>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-slate-100 my-3" />

      {/* Account Section */}
      {user && (
        <div className="space-y-0.5">
          <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">حساب من</p>
          <Link
            href="/orders"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-slate-100"
            onClick={onClose}
          >
            <Package className="h-4.5 w-4.5 text-slate-500" />
            <span className="font-medium text-slate-700">سفارش‌ها</span>
          </Link>
          <Link
            href="/profile/addresses"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-slate-100"
            onClick={onClose}
          >
            <MapPin className="h-4.5 w-4.5 text-slate-500" />
            <span className="font-medium text-slate-700">آدرس‌های من</span>
          </Link>
          <Link
            href="/profile"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-slate-100"
            onClick={onClose}
          >
            <User className="h-4.5 w-4.5 text-slate-500" />
            <span className="font-medium text-slate-700">پروفایل</span>
          </Link>
        </div>
      )}

      {/* Logout */}
      {user ? (
        <>
          <div className="border-t border-slate-100 my-3" />
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-right text-red-600 transition hover:bg-red-50"
          >
            <LogIn className="h-4.5 w-4.5 rotate-180" />
            <span className="font-medium">خروج از حساب</span>
          </button>
        </>
      ) : null}
    </Drawer>
  );
}

export function MobileMenu(props: MobileMenuProps) {
  return <MobileMenuContent {...props} />;
}
