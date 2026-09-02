import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PhotoInput } from './PhotoInput';
import { WORKER_TYPES, type WorkerType } from '@/db/types';

export interface WorkerFormValue {
  name: string;
  type: WorkerType;
  photo?: string;
}

interface Props {
  initial?: Partial<WorkerFormValue>;
  onSubmit: (v: WorkerFormValue) => Promise<void> | void;
  onCancel?: () => void;
  submitLabel?: string;
  lockedType?: WorkerType;
}

export function WorkerForm({
  initial,
  onSubmit,
  onCancel,
  submitLabel,
  lockedType,
}: Props) {
  const { t } = useTranslation();
  const [name, setName] = useState(initial?.name ?? '');
  const [type, setType] = useState<WorkerType>(
    lockedType ?? initial?.type ?? 'picker',
  );
  const [photo, setPhoto] = useState<string | undefined>(initial?.photo);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onSubmit({ name: name.trim(), type, photo });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="label">{t('worker.photo')}</label>
        <PhotoInput value={photo} name={name} onChange={setPhoto} />
      </div>
      <div>
        <label className="label">{t('worker.name')} *</label>
        <input
          className="input"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('worker.namePlaceholder')}
        />
      </div>
      <div>
        <label className="label">{t('worker.typeLabel')}</label>
        <div className="grid grid-cols-2 gap-2">
          {WORKER_TYPES.map((wt) => {
            const disabled = lockedType !== undefined && lockedType !== wt;
            return (
              <button
                key={wt}
                type="button"
                disabled={disabled}
                onClick={() => !disabled && setType(wt)}
                className={`btn ${
                  type === wt
                    ? 'bg-brand-700 text-white'
                    : disabled
                      ? 'bg-neutral-50 text-neutral-400 cursor-not-allowed'
                      : 'bg-neutral-100 text-neutral-800'
                }`}
              >
                {t(`worker.type.${wt}`)}
              </button>
            );
          })}
        </div>
      </div>
      {error && <div className="text-sm text-red-600">{error}</div>}
      <div className="flex gap-2 justify-end pt-2">
        {onCancel && (
          <button
            type="button"
            className="btn-secondary"
            onClick={onCancel}
            disabled={busy}
          >
            {t('common.cancel')}
          </button>
        )}
        <button type="submit" className="btn-primary" disabled={busy}>
          {submitLabel ?? t('addWorker.save')}
        </button>
      </div>
    </form>
  );
}
