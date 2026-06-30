'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, PackageCheck, ShoppingBag, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function OrderSuccessPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');
  const shortOrderId = orderId ? orderId.slice(-8) : null;

  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl items-center px-4 py-10">
      <Card className="w-full p-8 text-center">
        <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-500" />
        <h1 className="mt-5 text-3xl font-black">پرداخت سفارش موفق بود</h1>
        <p className="mt-3 leading-7 text-slate-500">
          سفارش شما با موفقیت ثبت و پرداخت mock آن تأیید شد. به‌زودی وارد مرحله پردازش می‌شود.
        </p>

        {shortOrderId && (
          <div className="mt-6 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
            شماره پیگیری سفارش: {shortOrderId}
          </div>
        )}

        <div className="mt-8 grid gap-3 text-right md:grid-cols-3">
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <PackageCheck className="mb-3 h-5 w-5 text-emerald-600" />
            <p className="font-black text-slate-900">وضعیت سفارش</p>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              می‌توانید روند ثبت و پرداخت سفارش را از صفحه سفارش‌ها دنبال کنید.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <ShoppingBag className="mb-3 h-5 w-5 text-rose-600" />
            <p className="font-black text-slate-900">ادامه خرید</p>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              هر زمان خواستید می‌توانید دوباره به لیست محصولات برگردید و خرید جدیدی شروع کنید.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <UserRound className="mb-3 h-5 w-5 text-sky-600" />
            <p className="font-black text-slate-900">حساب کاربری</p>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              اطلاعات نشست و دسترسی سریع به سفارش‌های شما از پروفایل قابل مشاهده است.
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/orders">
            <Button type="button">مشاهده سفارش‌ها</Button>
          </Link>
          <Link href="/products">
            <Button type="button" variant="outline">بازگشت به محصولات</Button>
          </Link>
          <Link href="/profile">
            <Button type="button" variant="ghost">رفتن به پروفایل</Button>
          </Link>
        </div>
      </Card>
    </main>
  );
}
