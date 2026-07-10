"use client";

import { RouteError } from "@/components/ui/route-error";

type RouteErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function Error({ error, reset }: RouteErrorProps) {
  return <RouteError error={error} reset={reset} />;
}
