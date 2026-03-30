'use client';

import { X } from 'lucide-react';
import { useEffect } from 'react';

interface DetailModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  width?: 'md' | 'lg' | 'xl';
}

const widthClasses = {
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export function DetailModal({ open, title, onClose, children, width = 'lg' }: DetailModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-[10vh]" onClick={onClose}>
      <div
        className={`admin-card w-full ${widthClasses[width]} p-0`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--admin-border)] px-6 py-4">
          <h2 className="text-lg font-semibold text-[var(--admin-text)]">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-[var(--admin-text-muted)] hover:bg-[var(--admin-surface-raised)] hover:text-[var(--admin-text)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
