"use client";

import { RouteError } from "@/components/ui/route-error";

type RouteErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ForgotPasswordError({ error, reset }: RouteErrorProps) {
  return (
    <RouteError
      error={error}
      reset={reset}
      title="بازیابی رمز عبور در دسترس نیست"
      description="در آماده‌سازی این صفحه مشکلی رخ داد. لطفاً دوباره تلاش کنید."
    />
  );
}
