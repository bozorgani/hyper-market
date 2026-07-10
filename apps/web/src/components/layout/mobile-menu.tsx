"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { Drawer } from "@/components/ui/dialog";
import { useAuthStore } from "@/store/auth-store";
import { useToast } from "@/components/ui/toast";

type MobileMenuProps = {
  open: boolean;
  onClose: () => void;
};

function MobileMenuContent({ open, onClose }: MobileMenuProps) {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
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
      className="w-72 bg-white px-5 py-8 text-sm"
    >
      <div className="mb-6 flex items-center justify-between">
        <p className="font-black text-slate-900">منو</p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          aria-label="بستن منو"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <div className="space-y-1">
        <Link
          href="/products"
          className="block rounded-xl px-3 py-3 transition hover:bg-slate-100"
          onClick={onClose}
        >
          محصولات
        </Link>
        {user && (
          <Link
            href="/orders"
            className="block rounded-xl px-3 py-3 transition hover:bg-slate-100"
            onClick={onClose}
          >
            سفارش‌ها
          </Link>
        )}
        <Link
          href="/profile"
          className="block rounded-xl px-3 py-3 transition hover:bg-slate-100"
          onClick={onClose}
        >
          پروفایل
        </Link>
        {user ? (
          <button
            type="button"
            onClick={handleLogout}
            className="w-full rounded-xl px-3 py-3 text-right text-red-600 transition hover:bg-red-50"
          >
            خروج
          </button>
        ) : (
          <Link
            href="/login"
            onClick={onClose}
            className="block rounded-xl bg-emerald-600 px-3 py-3 text-center text-white transition hover:bg-emerald-700"
          >
            ورود
          </Link>
        )}
      </div>
    </Drawer>
  );
}

export function MobileMenu(props: MobileMenuProps) {
  return <MobileMenuContent {...props} />;
}
