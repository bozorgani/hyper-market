"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";

export default function SearchError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <ErrorState
        title="جستجو در دسترس نیست"
        description="در دریافت نتایج جستجو مشکلی رخ داد."
        actions={
          <>
            <Button type="button" variant="outline" onClick={reset}>تلاش مجدد</Button>
            <Link href="/products"><Button type="button">مشاهده محصولات</Button></Link>
          </>
        }
      />
    </main>
  );
}
