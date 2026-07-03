"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Clock, CreditCard, Check, Truck, ArrowLeft, X, Gift } from "lucide-react";
import { formatPrice } from "@/data/mock-data";
import { useMarketStore } from "@/store/market-store";
import dynamic from "next/dynamic";

const MapPicker = dynamic(() => import("@/components/market/map-picker").then((m) => ({ default: m.MapPicker })), { ssr: false });

const STEPS = [
  { id: 1, label: "آدرس", icon: MapPin },
  { id: 2, label: "زمان ارسال", icon: Clock },
  { id: 3, label: "پرداخت", icon: CreditCard },
];

const deliverySlots = [
  { id: "t1", label: "امروز — ۱۰:۰۰ تا ۱۲:۰۰" },
  { id: "t2", label: "امروز — ۱۲:۰۰ تا ۱۴:۰۰" },
  { id: "t3", label: "امروز — ۱۴:۰۰ تا ۱۶:۰۰" },
  { id: "t4", label: "امروز — ۱۶:۰۰ تا ۱۸:۰۰" },
  { id: "t5", label: "امروز — ۱۸:۰۰ تا ۲۰:۰۰" },
  { id: "t6", label: "امروز — ۲۰:۰۰ تا ۲۲:۰۰" },
];

export function CheckoutPage() {
  const {
    getCartTotal, getCartCount, navigate, goBack, clearCart, orderPlaced, setOrderPlaced,
    selectedAddress, setSelectedAddress, selectedLocation, setSelectedLocation,
    deliveryTime, setDeliveryTime, paymentMethod, setPaymentMethod,
    discountCode, discountPercent, applyDiscountCode, removeDiscountCode,
  } = useMarketStore();

  const [step, setStep] = useState(1);
  const [promoInput, setPromoInput] = useState("");
  const [promoError, setPromoError] = useState("");
  const [showMap, setShowMap] = useState(false);

  const total = getCartTotal();
  const discountAmount = Math.round(total * discountPercent / 100);
  const deliveryFee = total >= 500000 ? 0 : 25000;
  const finalTotal = total - discountAmount + deliveryFee;
  const [orderNumber] = useState(() => {
     
    return Math.floor(Math.random() * 900000 + 100000).toLocaleString("fa-IR");
  });

  if (orderPlaced) {
    return (
      <div className="flex min-h-[80vh] flex-col items-center justify-center px-6 text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200 }}>
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
            <Check size={40} className="text-emerald-500" />
          </div>
        </motion.div>
        <h2 className="mt-6 text-xl font-black text-slate-800">سفارش شما ثبت شد!</h2>
        <p className="mt-2 text-sm text-slate-500">سفارش شما با موفقیت ثبت و در حال پردازش است.</p>
        <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-right">
          <p className="text-xs text-slate-500">مبلغ پرداختی</p>
          <p className="text-xl font-black text-emerald-600">{formatPrice(finalTotal)} <span className="text-sm font-normal text-slate-400">تومان</span></p>
          <p className="text-xs text-slate-400 mt-1">شماره سفارش: {orderNumber}</p>
        </div>
        <button
          onClick={() => { setOrderPlaced(false); clearCart(); navigate({ type: "home" }); }}
          className="mt-8 rounded-2xl bg-emerald-500 px-8 py-3 text-sm font-bold text-white shadow-green hover:bg-emerald-600 transition-colors"
        >
          بازگشت به خانه
        </button>
      </div>
    );
  }

  const handleApplyPromo = () => {
    if (!promoInput.trim()) return;
    if (applyDiscountCode(promoInput)) {
      setPromoError("");
    } else {
      setPromoError("کد تخفیف نامعتبر است");
    }
    setPromoInput("");
  };

  const canProceed = () => {
    if (step === 1) return !!selectedAddress;
    if (step === 2) return !!deliveryTime;
    return true;
  };

  const handlePlaceOrder = () => {
    setOrderPlaced(true);
  };

  return (
    <div className="min-h-screen bg-slate-50/80 pb-24">
      {/* Back + title */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <button onClick={goBack} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-black/5">
          <ArrowLeft size={20} className="text-slate-700" />
        </button>
        <h1 className="text-lg font-black text-slate-800">تکمیل سفارش</h1>
        <span className="text-xs text-slate-400">{getCartCount().toLocaleString("fa-IR")} کالا</span>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center justify-center gap-0 px-8 py-4">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center">
            <div className={`flex flex-col items-center gap-1 ${step >= s.id ? "text-emerald-600" : "text-slate-300"}`}>
              <div className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition-colors ${step >= s.id ? "border-emerald-500 bg-emerald-50" : "border-slate-200 bg-white"}`}>
                {step > s.id ? <Check size={16} /> : <s.icon size={16} />}
              </div>
              <span className="text-[10px] font-semibold">{s.label}</span>
            </div>
            {i < STEPS.length - 1 && <div className={`mx-2 h-0.5 w-12 rounded-full ${step > s.id ? "bg-emerald-500" : "bg-slate-200"}`} />}
          </div>
        ))}
      </div>

      <div className="mx-4">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div className="rounded-2xl bg-white p-4 shadow-card">
                <h3 className="text-sm font-bold text-slate-800 mb-3">آدرس تحویل</h3>
                <button
                  onClick={() => setShowMap(true)}
                  className="flex w-full items-center gap-3 rounded-xl border-2 border-dashed border-slate-200 p-4 text-right hover:border-emerald-300 transition-colors"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50">
                    <MapPin size={18} className="text-emerald-600" />
                  </div>
                  {selectedAddress ? (
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-700 line-clamp-2">{selectedAddress}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400">انتخاب آدرس روی نقشه</p>
                  )}
                </button>
                {selectedLocation && (
                  <p className="mt-2 text-[10px] text-slate-400">
                    عرض: {selectedLocation.lat.toFixed(4)} | طول: {selectedLocation.lng.toFixed(4)}
                  </p>
                )}
              </div>

              {/* Promo code */}
              <div className="rounded-2xl bg-white p-4 shadow-card">
                <div className="flex items-center gap-2 mb-3">
                  <Gift size={16} className="text-amber-500" />
                  <h3 className="text-sm font-bold text-slate-800">کد تخفیف</h3>
                </div>
                {discountCode ? (
                  <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-2.5">
                    <div>
                      <span className="text-xs font-bold text-emerald-700">{discountCode}</span>
                      <span className="text-xs text-emerald-600 mr-2">{discountPercent}٪ تخفیف</span>
                    </div>
                    <button onClick={removeDiscountCode} className="text-red-500 hover:text-red-600"><X size={16} /></button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      value={promoInput}
                      onChange={(e) => { setPromoInput(e.target.value); setPromoError(""); }}
                      placeholder="مثلاً SNAPP20"
                      className="flex-1 h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-emerald-400 text-right"
                      dir="ltr"
                    />
                    <button onClick={handleApplyPromo} className="shrink-0 rounded-xl bg-emerald-500 px-4 text-sm font-bold text-white hover:bg-emerald-600 transition-colors">اعمال</button>
                  </div>
                )}
                {promoError && <p className="mt-2 text-xs text-red-500">{promoError}</p>}
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="rounded-2xl bg-white p-4 shadow-card">
              <h3 className="text-sm font-bold text-slate-800 mb-3">انتخاب زمان ارسال</h3>
              <div className="space-y-2">
                {deliverySlots.map((slot) => (
                  <button
                    key={slot.id}
                    onClick={() => setDeliveryTime(slot.label)}
                    className={`flex w-full items-center gap-3 rounded-xl border-2 p-3 text-right transition-colors ${deliveryTime === slot.label ? "border-emerald-500 bg-emerald-50/50" : "border-slate-100 hover:border-slate-200"}`}
                  >
                    <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${deliveryTime === slot.label ? "border-emerald-500" : "border-slate-300"}`}>
                      {deliveryTime === slot.label && <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />}
                    </div>
                    <div className="flex items-center gap-2">
                      <Truck size={16} className="text-slate-400" />
                      <span className="text-sm font-semibold text-slate-700">{slot.label}</span>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div className="rounded-2xl bg-white p-4 shadow-card">
                <h3 className="text-sm font-bold text-slate-800 mb-3">روش پرداخت</h3>
                {([
                  { method: "online" as const, label: "پرداخت آنلاین", sub: "درگاه بانکی", icon: CreditCard },
                  { method: "cod" as const, label: "پرداخت در محل", sub: "نقدی یا کارتخوان", icon: Truck },
                ]).map(({ method, label, sub, icon: Icon }) => (
                  <button
                    key={method}
                    onClick={() => setPaymentMethod(method)}
                    className={`flex w-full items-center gap-3 rounded-xl border-2 p-4 text-right transition-colors mb-2 ${paymentMethod === method ? "border-emerald-500 bg-emerald-50/50" : "border-slate-100 hover:border-slate-200"}`}
                  >
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${paymentMethod === method ? "bg-emerald-100" : "bg-slate-100"}`}>
                      <Icon size={18} className={paymentMethod === method ? "text-emerald-600" : "text-slate-400"} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">{label}</p>
                      <p className="text-xs text-slate-400">{sub}</p>
                    </div>
                    <div className={`mr-auto flex h-5 w-5 items-center justify-center rounded-full border-2 ${paymentMethod === method ? "border-emerald-500" : "border-slate-300"}`}>
                      {paymentMethod === method && <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />}
                    </div>
                  </button>
                ))}
              </div>

              {/* Summary */}
              <div className="rounded-2xl bg-white p-4 shadow-card">
                <h3 className="text-sm font-bold text-slate-800 mb-3">خلاصه سفارش</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">جمع کالاها</span>
                    <span className="font-semibold">{formatPrice(total)} تومان</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>تخفیف ({discountPercent}٪)</span>
                      <span className="font-semibold">−{formatPrice(discountAmount)} تومان</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-500">هزینه ارسال</span>
                    <span className={`font-semibold ${deliveryFee === 0 ? "text-emerald-600" : ""}`}>{deliveryFee === 0 ? "رایگان" : `${formatPrice(deliveryFee)} تومان`}</span>
                  </div>
                  <div className="border-t border-slate-100 pt-2 flex justify-between">
                    <span className="font-bold text-slate-800">مبلغ نهایی</span>
                    <span className="font-black text-emerald-600">{formatPrice(finalTotal)} تومان</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Fixed bottom buttons */}
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-100 bg-white/95 backdrop-blur pb-safe">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-3">
          {step > 1 && (
            <button onClick={() => setStep(step - 1)} className="h-12 rounded-2xl border border-slate-200 px-5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors">
              قبلی
            </button>
          )}
          {step < 3 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
              className="flex-1 h-12 rounded-2xl bg-emerald-500 text-sm font-bold text-white shadow-green hover:bg-emerald-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              مرحله بعد
            </button>
          ) : (
            <button
              onClick={handlePlaceOrder}
              className="flex-1 h-12 rounded-2xl bg-emerald-500 text-sm font-bold text-white shadow-green hover:bg-emerald-600 transition-colors"
            >
              ثبت و پرداخت {formatPrice(finalTotal)} تومان
            </button>
          )}
        </div>
      </div>

      {/* Map overlay */}
      <AnimatePresence>
        {showMap && (
          <MapPicker
            initialLocation={selectedLocation}
            onClose={() => setShowMap(false)}
            onConfirm={(loc, addr) => {
              setSelectedLocation(loc);
              setSelectedAddress(addr);
              setShowMap(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}