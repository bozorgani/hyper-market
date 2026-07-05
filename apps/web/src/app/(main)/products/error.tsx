"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";

export default function ProductsError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <ErrorState
        title="بارگذاری محصولات انجام نشد"
        description="در دریافت اطلاعات محصولات مشکلی رخ داد."
        actions={
          <>
            <Button type="button" variant="outline" onClick={reset}>تلاش مجدد</Button>
            <Link href="/"><Button type="button">بازگشت به خانه</Button></Link>
          </>
        }
      />
    </main>
  );
}
