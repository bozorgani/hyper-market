"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, Trash2, Minus, Plus, ArrowLeft, Truck } from "lucide-react";
import { formatPrice, getDiscountPercent, getCategoryName } from "@/data/mock-data";
import { useMarketStore } from "@/store/market-store";

export function CartPage() {
  const { cart, updateQuantity, removeFromCart, getCartTotal, navigate, discountPercent, discountCode, removeDiscountCode } = useMarketStore();
  const total = getCartTotal();
  const discountAmount = Math.round(total * discountPercent / 100);
  const finalTotal = total - discountAmount;
  const FREE_DELIVERY_THRESHOLD = 500000;
  const deliveryProgress = Math.min((total / FREE_DELIVERY_THRESHOLD) * 100, 100);
  const deliveryFee = total >= FREE_DELIVERY_THRESHOLD ? 0 : 25000;

  if (cart.length === 0) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-slate-100">
          <ShoppingBag size={40} className="text-slate-300" />
        </div>
        <h2 className="mt-6 text-lg font-black text-slate-800">سبد خرید خالی است</h2>
        <p className="mt-2 text-sm text-slate-500">محصولات مورد علاقه خود را اضافه کنید</p>
        <button onClick={() => navigate({ type: "home" })} className="mt-6 rounded-2xl bg-emerald-500 px-6 py-3 text-sm font-bold text-white shadow-green hover:bg-emerald-600 transition-colors">
          شروع خرید
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/80 pb-36">
      {/* Delivery progress */}
      <div className="mx-4 mt-4 rounded-2xl bg-white p-4 shadow-card">
        <div className="flex items-center gap-2 mb-2">
          <Truck size={16} className="text-emerald-500" />
          {total >= FREE_DELIVERY_THRESHOLD ? (
            <p className="text-xs font-bold text-emerald-600">🎉 ارسال رایگان!</p>
          ) : (
            <p className="text-xs font-semibold text-slate-600">
              تا ارسال رایگان <span className="font-black text-emerald-600">{formatPrice(FREE_DELIVERY_THRESHOLD - total)}</span> تومان دیگر خرید کنید
            </p>
          )}
        </div>
        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-l from-emerald-500 to-green-400"
            initial={{ width: 0 }}
            animate={{ width: `${deliveryProgress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {/* Cart items */}
      <div className="mt-4 space-y-3 px-4">
        <AnimatePresence>
          {cart.map((item) => (
            <motion.div
              key={item.product.id}
              layout
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20, height: 0, marginBottom: 0 }}
              className="flex gap-3 rounded-2xl bg-white p-3 shadow-card"
            >
              <img src={item.product.image} alt={item.product.name} className="h-20 w-20 rounded-xl object-cover shrink-0" />
              <div className="flex flex-1 flex-col min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-800 line-clamp-1">{item.product.name}</p>
                  <button onClick={() => removeFromCart(item.product.id)} className="shrink-0 text-slate-400 hover:text-red-500 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
                <span className="mt-1 text-[10px] text-slate-400">{getCategoryName(item.product.categoryId)}</span>
                <div className="mt-auto flex items-center justify-between">
                  <div className="flex items-center gap-2 rounded-xl bg-slate-100">
                    <button onClick={() => updateQuantity(item.product.id, item.quantity + 1)} className="flex h-8 w-8 items-center justify-center text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
                      <Plus size={16} />
                    </button>
                    <span className="w-6 text-center text-sm font-bold">{item.quantity.toLocaleString("fa-IR")}</span>
                    <button onClick={() => updateQuantity(item.product.id, item.quantity - 1)} className="flex h-8 w-8 items-center justify-center text-slate-500 hover:bg-slate-200 rounded-lg transition-colors">
                      <Minus size={16} />
                    </button>
                  </div>
                  <p className="text-sm font-black text-emerald-600">
                    {formatPrice((item.product.discountPrice ?? item.product.price) * item.quantity)}
                    <span className="mr-0.5 text-[10px] font-normal text-slate-400">تومان</span>
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Fixed bottom */}
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-100 bg-white/95 backdrop-blur pb-safe">
        <div className="mx-auto max-w-lg px-4 pt-3 pb-3">
          {discountCode && (
            <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-2 mb-3">
              <span className="text-xs font-bold text-emerald-700">کد تخفیف {discountCode} ({discountPercent}٪)</span>
              <button onClick={removeDiscountCode} className="text-xs font-semibold text-red-500">حذف</button>
            </div>
          )}
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-500">جمع سبد خرید</span>
            <span className="text-sm font-bold text-slate-700">{formatPrice(total)} تومان</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-emerald-600">تخفیف</span>
              <span className="text-sm font-bold text-emerald-600">−{formatPrice(discountAmount)} تومان</span>
            </div>
          )}
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-slate-500">هزینه ارسال</span>
            <span className={`text-sm font-bold ${deliveryFee === 0 ? "text-emerald-600" : "text-slate-700"}`}>
              {deliveryFee === 0 ? "رایگان" : `${formatPrice(deliveryFee)} تومان`}
            </span>
          </div>
          <button
            onClick={() => navigate({ type: "checkout" })}
            className="flex w-full items-center justify-between rounded-2xl bg-emerald-500 px-5 py-3.5 text-white shadow-green hover:bg-emerald-600 transition-colors"
          >
            <span className="text-sm font-bold">ثبت سفارش</span>
            <div className="flex items-center gap-2">
              <span className="text-base font-black">{formatPrice(finalTotal + deliveryFee)}</span>
              <span className="text-xs opacity-80">تومان</span>
              <ArrowLeft size={18} />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}