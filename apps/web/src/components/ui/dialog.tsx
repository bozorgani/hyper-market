"use client";

import { useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useModalA11y } from "@/hooks/use-modal-a11y";

type DialogProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  titleId?: string;
  descriptionId?: string;
  ariaLabel?: string;
  className?: string;
  containerClassName?: string;
};

export function Dialog({
  open,
  onClose,
  children,
  titleId,
  descriptionId,
  ariaLabel,
  className,
  containerClassName,
}: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useModalA11y(open, onClose, dialogRef);

  if (!open) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 px-4 backdrop-blur-sm",
        containerClassName,
      )}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        className={cn("w-full max-w-md rounded-3xl bg-white p-6 text-right shadow-2xl", className)}
        onMouseDown={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export function Drawer({
  className,
  containerClassName,
  ...props
}: DialogProps) {
  return (
    <Dialog
      {...props}
      containerClassName={cn("items-stretch justify-end p-0", containerClassName)}
      className={cn("h-full w-[min(18rem,90vw)] max-w-none rounded-none p-0", className)}
    />
  );
}
