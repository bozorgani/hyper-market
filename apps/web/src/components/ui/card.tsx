import * as React from "react";
import { tw } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn(tw.card, className)} {...props} />;
}
