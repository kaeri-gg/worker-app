import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Sheet } from './Sheet';
import { addEntry } from '@/db/actions';

interface Props {
  open: boolean;
  onClose: () => void;
  rowId: string;
  workerName: string;
}

export function AddKgSheet({ open, onClose, rowId, workerName }: Props) {
  const { t } = useTranslation();
  const [kg, setKg] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setKg('');
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = Number(kg.replace(',', '.'));
    if (!Number.isFinite(value) || value <= 0) {
      setError('> 0');
      return;
    }
    setBusy(true);
    try {
      await addEntry(rowId, value);
      handleClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={handleClose}
      title={t('addKg.title', { name: workerName })}
      footer={
        <div className="flex gap-2 justify-end">
          <button className="btn-secondary" onClick={handleClose} disabled={busy}>
            {t('addKg.cancel')}
          </button>
          <button
            form="add-kg-form"
            type="submit"
            className="btn-primary"
            disabled={busy}
          >
            {t('addKg.add')}
          </button>
        </div>
      }
    >
      <form id="add-kg-form" onSubmit={submit} className="space-y-3">
        <div>
          <label className="label">{t('addKg.amountLabel')}</label>
          <input
            className="input text-lg"
            type="text"
            inputMode="decimal"
            pattern="[0-9]*[.,]?[0-9]*"
            autoFocus
            value={kg}
            onChange={(e) => setKg(e.target.value)}
            placeholder="0.00"
          />
        </div>
        {error && <div className="text-sm text-red-600">{error}</div>}
      </form>
    </Sheet>
  );
}
