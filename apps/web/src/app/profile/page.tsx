"use client";

import Link from "next/link";
import { ProtectedRoute } from "@/components/layout/protected-route";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { translateRole } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";

function InfoRow({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={mono ? "ltr mt-2 break-all text-left font-mono text-sm text-slate-900" : "mt-2 font-semibold text-slate-900"}>
        {value || "ثبت نشده"}
      </p>
    </div>
  );
}

export default function ProfilePage() {
  const user = useAuthStore((state) => state.user);

  return (
    <ProtectedRoute>
      <main className="mx-auto max-w-5xl px-4 py-8 text-right">
        <PageHeader
          title="پروفایل کاربری"
          description="اطلاعات پایه نشست احراز هویت و نقش فعلی شما در این بخش نمایش داده می‌شود."
        />

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.15fr,0.85fr]">
          <Card className="p-6">
            <h2 className="text-lg font-black">اطلاعات حساب</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <InfoRow label="نقش کاربر" value={translateRole(user?.role)} />
              <InfoRow label="شماره موبایل" value={user?.phoneNumber} />
              <InfoRow label="ایمیل" value={user?.email} />
              <InfoRow label="شناسه کاربر" value={user?.id} mono />
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-black">نشست فعال</h2>
            <div className="mt-5 space-y-3">
              <InfoRow label="Session ID" value={user?.sessionId} mono />
              <InfoRow label="Device ID" value={user?.deviceId} mono />
            </div>
            <div className="mt-6 flex flex-col gap-3">
              <Link href="/orders">
                <Button type="button" className="w-full">مشاهده سفارش‌ها</Button>
              </Link>
              <Link href="/products">
                <Button type="button" variant="outline" className="w-full">بازگشت به محصولات</Button>
              </Link>
            </div>
          </Card>
        </div>
      </main>
    </ProtectedRoute>
  );
}
