"use client";

import { RouteError } from "@/components/ui/route-error";

type RouteErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ProductsError({ error, reset }: RouteErrorProps) {
  return (
    <RouteError
      error={error}
      reset={reset}
      title="بارگذاری محصولات انجام نشد"
      description="در دریافت اطلاعات محصولات مشکلی رخ داد."
      backHref="/"
      backLabel="بازگشت به خانه"
    />
  );
}
