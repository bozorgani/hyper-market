"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/ui/error-state";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";

type RouteErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
};

export function RouteError({
  error,
  reset,
  title = "خطایی در بارگذاری رخ داد",
  description = "متأسفانه در پردازش این بخش مشکلی پیش آمد. می‌توانید دوباره تلاش کنید.",
  backHref = "/",
  backLabel = "بازگشت به خانه",
}: RouteErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main id="main-content" className="mx-auto max-w-2xl px-4 py-12">
      <ErrorState
        title={title}
        description={description}
        actions={
          <>
            <Button type="button" onClick={reset}>تلاش مجدد</Button>
            <LinkButton href={backHref} variant="outline">{backLabel}</LinkButton>
          </>
        }
      />
    </main>
  );
}
