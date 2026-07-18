"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { PageLoader } from "@/components/ui/page-loader";
import { useAuthStore } from "@/store/auth-store";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const hydrated = useAuthStore((state) => state.hydrated);

  useEffect(() => {
    if (hydrated && !user) {
      const redirectPath = window.location.pathname + window.location.search;
      router.replace(`/login?redirect=${encodeURIComponent(redirectPath)}`);
    }
  }, [hydrated, router, user]);

  if (!hydrated) return <PageLoader title="در حال بررسی وضعیت ورود..." />;
  if (!user) return <PageLoader title="در حال انتقال به صفحه ورود..." />;
  return <>{children}</>;
}
