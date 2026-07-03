"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-xl items-center px-4 py-16 text-right">
      <Card className="w-full p-8">
        <h2 className="text-xl font-black text-slate-950">خطایی در بارگذاری رخ داد</h2>
        <p className="mt-3 leading-7 text-slate-600">
          متأسفانه در پردازش این بخش مشکلی پیش آمد. می‌توانید دوباره تلاش کنید یا به صفحه اصلی بازگردید.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button type="button" onClick={reset}>
            تلاش مجدد
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              window.location.href = "/";
            }}
          >
            بازگشت به صفحه اصلی
          </Button>
        </div>
      </Card>
    </main>
  );
}
