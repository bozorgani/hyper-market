"use client";

import { Button } from "@/components/ui/button";
import { useModalA11y } from "@/hooks/use-modal-a11y";

export function ConfirmDialog({
  open,
  title,
  description,
  confirmText = "تأیید",
  cancelText = "لغو",
  destructive,
  loading,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useModalA11y(open, onCancel);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 text-right shadow-2xl">
        <h2 className="text-xl font-black text-slate-950">{title}</h2>
        <p className="mt-3 leading-7 text-slate-600">{description}</p>
        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>{cancelText}</Button>
          <Button type="button" variant={destructive ? "destructive" : "default"} onClick={onConfirm} disabled={loading}>
            {loading ? "در حال انجام..." : confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}
