"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useModalA11y } from "@/hooks/use-modal-a11y";
import { useAuthStore } from "@/store/auth-store";
import { useToast } from "@/components/ui/toast";

type MobileMenuProps = {
  open: boolean;
  onClose: () => void;
  onLogout?: () => void;
};

const menuVariants = {
  closed: { x: 280, opacity: 0 },
  open: { x: 0, opacity: 1 },
};

const overlayVariants = {
  closed: { opacity: 0 },
  open: { opacity: 1 },
};

function MobileMenuContent({ open, onClose, onLogout }: MobileMenuProps) {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const { showToast } = useToast();

  // Focus trap + body scroll lock + Escape key handling
  useModalA11y(open, onClose);

  function handleLogout() {
    void logout();
    showToast({ type: "info", title: "از حساب کاربری خارج شدید" });
    onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay */}
          <motion.div
            variants={overlayVariants}
            initial="closed"
            animate="open"
            exit="closed"
            className="fixed inset-0 z-[60] bg-black/40 lg:hidden"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Drawer */}
          <motion.div
            variants={menuVariants}
            initial="closed"
            animate="open"
            exit="closed"
            transition={{ type: "spring", damping: 25, stiffness: 250 }}
            role="dialog"
            aria-modal="true"
            aria-label="منوی اصلی"
            className="fixed inset-y-0 right-0 z-[70] w-72 bg-white shadow-xl px-5 py-8 text-sm lg:hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <div className="flex items-center justify-between mb-6">
              <p className="font-black text-slate-900">منو</p>
              <button
                onClick={onClose}
                className="rounded-xl p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                aria-label="بستن منو"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-1">
              <Link
                href="/products"
                className="block py-3 px-3 rounded-xl hover:bg-slate-100 transition"
                onClick={onClose}
              >
                محصولات
              </Link>
              {user && (
                <Link
                  href="/orders"
                  className="block py-3 px-3 rounded-xl hover:bg-slate-100 transition"
                  onClick={onClose}
                >
                  سفارش‌ها
                </Link>
              )}
              <Link
                href="/profile"
                className="block py-3 px-3 rounded-xl hover:bg-slate-100 transition"
                onClick={onClose}
              >
                پروفایل
              </Link>
              {user ? (
                <button
                  onClick={handleLogout}
                  className="w-full text-right py-3 px-3 text-red-600 rounded-xl hover:bg-red-50 transition"
                >
                  خروج
                </button>
              ) : (
                <Link
                  href="/login"
                  onClick={onClose}
                  className="block py-3 px-3 rounded-xl bg-emerald-600 text-white text-center transition hover:bg-emerald-700"
                >
                  ورود
                </Link>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export function MobileMenu(props: MobileMenuProps) {
  return <MobileMenuContent {...props} />;
}
