'use client';

import { useEffect, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'default';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (open) {
      dialogRef.current?.showModal();
    } else {
      dialogRef.current?.close();
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onCancel}>
      <div
        className="admin-card w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          {variant !== 'default' && (
            <AlertTriangle
              className={`h-5 w-5 shrink-0 mt-0.5 ${
                variant === 'danger' ? 'text-[var(--admin-error)]' : 'text-[var(--admin-warning)]'
              }`}
            />
          )}
          <div>
            <h3 className="text-lg font-semibold text-[var(--admin-text)]">{title}</h3>
            <p className="mt-1 text-sm text-[var(--admin-text-secondary)]">{message}</p>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-md border border-[var(--admin-border)] px-4 py-2 text-sm text-[var(--admin-text-secondary)] hover:bg-[var(--admin-surface-raised)]"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`rounded-md px-4 py-2 text-sm font-semibold text-white ${
              variant === 'danger'
                ? 'bg-[var(--admin-error)] hover:bg-red-600'
                : 'bg-[var(--admin-accent)] hover:bg-[var(--admin-accent-light)]'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
