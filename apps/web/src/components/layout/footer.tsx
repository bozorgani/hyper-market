import Link from "next/link";
import { Headphones, MapPin, ShieldCheck, Truck, Mail, Phone } from "lucide-react";

const footerLinks = {
  services: {
    title: "خدمات مشتریان",
    links: [
      { label: "پرسش‌های متداول", href: "/faq" },
      { label: "شرایط بازگشت کالا", href: "/returns" },
      { label: "حریم خصوصی", href: "/privacy" },
      { label: "شرایط استفاده", href: "/terms" },
    ],
  },
  about: {
    title: "هایپرمارکت",
    links: [
      { label: "درباره ما", href: "/about" },
      { label: "تماس با ما", href: "/contact" },
      { label: "فرصت‌های شغلی", href: "/careers" },
      { label: "بلاگ", href: "/blog" },
    ],
  },
  shopping: {
    title: "راهنمای خرید",
    links: [
      { label: "نحوه ثبت سفارش", href: "/how-to-order" },
      { label: "رویه ارسال سفارش", href: "/shipping" },
      { label: "شیوه‌های پرداخت", href: "/payment-methods" },
      { label: "تخفیف‌ها و پیشنهادها", href: "/products?discount=true" },
    ],
  },
};

const trustBadges = [
  { icon: ShieldCheck, label: "تضمین اصالت کالا" },
  { icon: Truck, label: "ارسال سریع" },
  { icon: Headphones, label: "پشتیبانی ۲۴/۷" },
];

export function Footer() {
  return (
    <footer className="hidden md:block border-t border-slate-200 bg-white">
      {/* Trust Badges Row */}
      <div className="border-b border-slate-100 bg-slate-50">
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-8 px-4 py-5 sm:gap-12">
          {trustBadges.map((badge) => (
            <div key={badge.label} className="flex items-center gap-2.5 text-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                <badge.icon className="h-5 w-5" />
              </div>
              <span className="font-semibold text-slate-700">{badge.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Links Grid */}
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-4">
          {/* Brand Column */}
          <div className="col-span-2 sm:col-span-3 lg:col-span-1">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-rose-600 shadow-md text-white font-black text-base">
                H
              </div>
              <div>
                <p className="text-sm font-black text-slate-900 leading-none">هایپرمارکت</p>
                <p className="text-[10px] text-rose-600 font-medium tracking-wide mt-0.5">HyperMarket</p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-7 text-slate-500 max-w-xs">
              فروشگاه آنلاین هایپرمارکت، ارائه‌دهنده هزاران محصول تازه و اصل با ارسال سریع به سراسر کشور.
            </p>
            <div className="mt-4 space-y-2 text-sm text-slate-500">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-rose-500" />
                <span dir="ltr">021-91000000</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-rose-500" />
                <span>support@hypermarket.ir</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-rose-500" />
                <span>تهران، ایران</span>
              </div>
            </div>
          </div>

          {/* Link Columns */}
          {Object.values(footerLinks).map((section) => (
            <div key={section.title}>
              <h3 className="text-sm font-black text-slate-900">{section.title}</h3>
              <ul className="mt-4 space-y-3">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-slate-500 transition hover:text-rose-600 hover:underline underline-offset-2"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-slate-100">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-5 sm:flex-row">
          <p className="text-xs text-slate-400">
            © {new Date().getFullYear()} هایپرمارکت. تمامی حقوق محفوظ است.
          </p>
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <Link href="/terms" className="transition hover:text-slate-600">قوانین و مقررات</Link>
            <span className="text-slate-200">|</span>
            <Link href="/privacy" className="transition hover:text-slate-600">حریم خصوصی</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
