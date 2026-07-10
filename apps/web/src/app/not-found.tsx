import { LinkButton } from "@/components/ui/link-button";

export default function NotFound() {
  return (
    <main id="main-content" className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 py-16 text-center">
      <div className="text-6xl">🧭</div>
      <h1 className="mt-4 text-2xl font-black text-slate-900">صفحه مورد نظر یافت نشد</h1>
      <p className="mt-2 text-sm leading-7 text-slate-500">
        آدرس وارد شده اشتباه است یا صفحه حذف شده است. می‌توانید به صفحه اصلی بازگردید یا محصول مورد نظر را جستجو کنید.
      </p>
      <div className="mt-6 flex gap-3">
        <LinkButton href="/">صفحه اصلی</LinkButton>
        <LinkButton href="/products" variant="outline">مشاهده محصولات</LinkButton>
      </div>
    </main>
  );
}
