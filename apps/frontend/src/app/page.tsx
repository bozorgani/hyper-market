import Link from "next/link";
import { ArrowLeft, Package, Search, ShieldCheck, Sparkles, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function HomePage() {
  const highlights = [
    { title: "تخفیف‌های روزانه", description: "لیست محصولات را مرور کنید و قیمت‌ها و تخفیف‌ها را سریع مقایسه کنید.", icon: Sparkles },
    { title: "موجودی تازه", description: "موجودی کالاها و وضعیت هر محصول را به‌صورت لحظه‌ای در رابط فارسی ببینید.", icon: Package },
    { title: "پرداخت سریع", description: "کل فرایند سبد، سفارش و پرداخت mock برای تست end-to-end آماده است.", icon: Truck },
    { title: "حساب امن", description: "ورود، ثبت‌نام، OTP و session handling با تجربه RTL یکپارچه در دسترس است.", icon: ShieldCheck },
  ];

  const quickLinks = [
    { title: "مشاهده محصولات", href: "/products", description: "فهرست کامل کالاها، دسته‌بندی و قیمت‌ها", icon: Package },
    { title: "جستجو در فروشگاه", href: "/search", description: "جستجوی سریع با فیلتر دسته‌بندی و قیمت", icon: Search },
    { title: "سبد خرید", href: "/cart", description: "مدیریت کالاهای انتخاب‌شده و آماده‌سازی برای پرداخت", icon: Truck },
  ];

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
      <section className="grid gap-6 overflow-hidden rounded-3xl bg-gradient-to-bl from-rose-600 to-orange-500 p-6 text-white shadow-xl md:grid-cols-2 md:p-10">
        <div className="flex flex-col justify-center py-6 text-right sm:py-8">
          <p className="text-sm font-bold tracking-[0.2em] text-white/75">خرید سریع و تازه</p>
          <h1 className="mt-4 text-4xl font-black leading-tight tracking-tight md:text-6xl">تجربه خرید آنلاین به سبک هایپرمارکت</h1>
          <p className="mt-5 max-w-xl text-base leading-8 text-white/85 sm:text-lg">
            محصولات را ببینید، جستجو کنید، سبد خرید بسازید، پرداخت mock را تجربه کنید و سفارش‌های خود را در یک رابط فارسی و راست‌به‌چپ پیگیری کنید.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Link href="/products">
              <Button variant="secondary">
                مشاهده محصولات
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/search">
              <Button variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20">
                شروع جستجو
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {highlights.map(({ title, description, icon: Icon }) => (
            <div key={title} className="rounded-3xl bg-white/15 p-5 text-right backdrop-blur">
              <Icon className="mb-4 h-6 w-6 text-white" />
              <p className="text-xl font-black sm:text-2xl">{title}</p>
              <p className="mt-3 text-sm leading-7 text-white/80">{description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-3">
        {quickLinks.map(({ title, href, description, icon: Icon }) => (
          <Card key={href} className="p-5 text-right">
            <Icon className="h-6 w-6 text-rose-600" />
            <h2 className="mt-4 text-xl font-black text-slate-900">{title}</h2>
            <p className="mt-3 text-sm leading-7 text-slate-500">{description}</p>
            <Link href={href} className="mt-5 inline-flex">
              <Button type="button" variant="outline">ورود به بخش</Button>
            </Link>
          </Card>
        ))}
      </section>
    </main>
  );
}
