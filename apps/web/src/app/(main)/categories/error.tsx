"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/ui/error-state";
import { Button } from "@/components/ui/button";

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
    <div className="mx-auto max-w-2xl px-4 py-12">
      <ErrorState
        title="خطایی رخ داد"
        description={error.message || "مشکلی در بارگذاری این صفحه پیش آمد. لطفاً دوباره تلاش کنید."}
        actions={
          <>
            <Button onClick={() => reset()} variant="default">تلاش مجدد</Button>
            <Button onClick={() => window.location.href = "/"} variant="outline">بازگشت به خانه</Button>
          </>
        }
      />
    </div>
  );
}
