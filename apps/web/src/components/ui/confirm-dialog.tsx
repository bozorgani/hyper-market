"use client";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

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
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      titleId="confirm-dialog-title"
      descriptionId="confirm-dialog-description"
    >
      <h2 id="confirm-dialog-title" className="text-xl font-black text-slate-950">{title}</h2>
      <p id="confirm-dialog-description" className="mt-3 leading-7 text-slate-600">{description}</p>
      <div className="mt-6 flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>{cancelText}</Button>
        <Button type="button" variant={destructive ? "destructive" : "default"} onClick={onConfirm} disabled={loading}>
          {loading ? "در حال انجام..." : confirmText}
        </Button>
      </div>
    </Dialog>
  );
}
