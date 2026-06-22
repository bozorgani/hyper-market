import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <section className="grid gap-6 overflow-hidden rounded-3xl bg-gradient-to-br from-rose-600 to-orange-500 p-6 text-white shadow-xl md:grid-cols-2 md:p-10">
        <div className="flex flex-col justify-center py-8">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-white/75">Fresh everyday</p>
          <h1 className="mt-4 text-4xl font-black tracking-tight md:text-6xl">Hyper Market ecommerce experience</h1>
          <p className="mt-5 max-w-xl text-white/85">Browse products, manage cart, checkout and track orders through the existing Hyper Market backend.</p>
          <Link href="/products" className="mt-8 w-fit"><Button variant="secondary">Shop products</Button></Link>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {['Daily offers','Fresh stock','Fast checkout','Secure account'].map((item) => (
            <div key={item} className="rounded-3xl bg-white/15 p-5 backdrop-blur"><p className="text-2xl font-black">{item}</p></div>
          ))}
        </div>
      </section>
    </main>
  );
}
