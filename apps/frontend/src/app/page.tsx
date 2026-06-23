import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  const cards = ["تخفیف‌های روزانه", "موجودی تازه", "پرداخت سریع", "حساب امن"];

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
      <section className="grid gap-6 overflow-hidden rounded-3xl bg-gradient-to-bl from-rose-600 to-orange-500 p-6 text-white shadow-xl md:grid-cols-2 md:p-10">
        <div className="flex flex-col justify-center py-6 text-right sm:py-8">
          <p className="text-sm font-bold tracking-[0.2em] text-white/75">خرید سریع و تازه</p>
          <h1 className="mt-4 text-4xl font-black leading-tight tracking-tight md:text-6xl">
            تجربه خرید آنلاین به سبک هایپرمارکت
          </h1>
          <p className="mt-5 max-w-xl text-base leading-8 text-white/85 sm:text-lg">
            محصولات را ببینید، سبد خرید بسازید، پرداخت را شبیه‌سازی کنید و سفارش‌های خود را از طریق بک‌اند هایپرمارکت پیگیری کنید.
          </p>
          <Link href="/products" className="mt-8 w-fit">
            <Button variant="secondary">مشاهده محصولات</Button>
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {cards.map((item) => (
            <div key={item} className="rounded-3xl bg-white/15 p-5 text-right backdrop-blur">
              <p className="text-xl font-black sm:text-2xl">{item}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
