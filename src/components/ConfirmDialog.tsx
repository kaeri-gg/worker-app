import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Sheet } from './Sheet';

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: ReactNode;
  body?: ReactNode;
  confirmLabel?: ReactNode;
  cancelLabel?: ReactNode;
  danger?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  body,
  confirmLabel,
  cancelLabel,
  danger = false,
}: Props) {
  const { t } = useTranslation();
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <div className="flex gap-2 justify-end">
          <button className="btn-secondary" onClick={onClose}>
            {cancelLabel ?? t('common.cancel')}
          </button>
          <button
            className={
              danger
                ? 'btn text-white bg-red-600 hover:bg-red-700'
                : 'btn-primary'
            }
            onClick={async () => {
              await onConfirm();
              onClose();
            }}
          >
            {confirmLabel ?? t('common.confirm')}
          </button>
        </div>
      }
    >
      {body && <div className="text-sm text-neutral-700">{body}</div>}
    </Sheet>
  );
}
