import type { ReactNode } from 'react';
import { useEffect } from 'react';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}

export function Sheet({ open, onClose, title, children, footer }: SheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl max-h-[92dvh] flex flex-col">
        {title && (
          <div className="px-4 pt-4 pb-2 text-base font-semibold text-neutral-900">
            {title}
          </div>
        )}
        <div className="px-4 pb-4 pt-1 overflow-y-auto grow">{children}</div>
        {footer && (
          <div className="px-4 py-3 border-t border-neutral-100 bg-white rounded-b-2xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
