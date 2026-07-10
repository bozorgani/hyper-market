"use client";

import { RouteError } from "@/components/ui/route-error";

type RouteErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function SearchError({ error, reset }: RouteErrorProps) {
  return (
    <RouteError
      error={error}
      reset={reset}
      title="جستجو در دسترس نیست"
      description="در دریافت نتایج جستجو مشکلی رخ داد."
      backHref="/products"
      backLabel="مشاهده محصولات"
    />
  );
}
