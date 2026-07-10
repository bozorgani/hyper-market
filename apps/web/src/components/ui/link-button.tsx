import Link from "next/link";
import type { ComponentProps } from "react";
import { buttonClassName, type ButtonSize, type ButtonVariant } from "@/components/ui/button";

export function LinkButton({
  className,
  variant = "default",
  size = "default",
  ...props
}: ComponentProps<typeof Link> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return <Link className={buttonClassName(variant, size, className)} {...props} />;
}
