import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLiveQuery } from 'dexie-react-hooks';
import { Sheet } from './Sheet';
import { Avatar } from './Avatar';
import { WorkerForm } from './WorkerForm';
import { db } from '@/db/db';
import { addDriverToSession, createWorker } from '@/db/actions';
import {
  DRIVER_PAY_MODES,
  WORKER_PAY_MODES,
  type DriverPayMode,
  type WorkerPayMode,
} from '@/db/types';

interface Props {
  open: boolean;
  onClose: () => void;
  sessionId: string;
}

export function AddDriverSheet({ open, onClose, sessionId }: Props) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<'pick' | 'new'>('pick');
  const [search, setSearch] = useState('');
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [driverPayMode, setDriverPayMode] = useState<DriverPayMode>('fixed');
  const [driverRate, setDriverRate] = useState<string>('');
  const [workerPayMode, setWorkerPayMode] =
    useState<WorkerPayMode>('per_weight');
  const [pickerFlatRate, setPickerFlatRate] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const drivers =
    useLiveQuery(
      () =>
        db.workers
          .filter((w) => !w.archived && w.type === 'driver')
          .toArray(),
      [],
    ) ?? [];
  const taken =
    useLiveQuery(
      async () => {
        const rows = await db.sessionRows.where({ sessionId }).toArray();
        return new Set(rows.map((r) => r.workerId));
      },
      [sessionId],
    ) ?? new Set<string>();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...drivers]
      .filter((w) => (q ? w.name.toLowerCase().includes(q) : true))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [drivers, search]);

  useEffect(() => {
    if (!open) {
      setMode('pick');
      setSearch('');
      setSelectedDriverId(null);
      setDriverPayMode('fixed');
      setDriverRate('');
      setWorkerPayMode('per_weight');
      setPickerFlatRate('');
      setError(null);
      setBusy(false);
    }
  }, [open]);

  const parseNum = (s: string): number | null => {
    const n = Number(s.replace(',', '.'));
    return Number.isFinite(n) && n >= 0 ? n : null;
  };

  const canSave = (() => {
    if (!selectedDriverId) return false;
    if (parseNum(driverRate) === null) return false;
    if (workerPayMode === 'flat' && parseNum(pickerFlatRate) === null) return false;
    return true;
  })();

  const save = async () => {
    if (!selectedDriverId) return;
    const rate = parseNum(driverRate);
    if (rate === null) return;
    const flat =
      workerPayMode === 'flat' ? parseNum(pickerFlatRate) ?? undefined : undefined;
    setBusy(true);
    setError(null);
    try {
      await addDriverToSession({
        sessionId,
        workerId: selectedDriverId,
        driverPayMode,
        driverRate: rate,
        workerPayMode,
        pickerFlatRate: flat,
      });
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const createAndSelect = async (v: { name: string; photo?: string }) => {
    const w = await createWorker({ ...v, type: 'driver' });
    setSelectedDriverId(w.id);
    setMode('pick');
  };

  return (
    <Sheet open={open} onClose={onClose} title={t('addDriver.title')}>
      <div className="flex gap-2 mb-3">
        <button
          className={`btn flex-1 ${
            mode === 'pick' ? 'bg-brand-700 text-white' : 'bg-neutral-100 text-neutral-800'
          }`}
          onClick={() => setMode('pick')}
        >
          {t('addDriver.pickExisting')}
        </button>
        <button
          className={`btn flex-1 ${
            mode === 'new' ? 'bg-brand-700 text-white' : 'bg-neutral-100 text-neutral-800'
          }`}
          onClick={() => setMode('new')}
        >
          {t('addDriver.createNew')}
        </button>
      </div>

      {mode === 'new' ? (
        <WorkerForm
          lockedType="driver"
          onSubmit={createAndSelect}
          onCancel={() => setMode('pick')}
          submitLabel={t('addDriver.saveDriver')}
        />
      ) : (
        <div className="space-y-4">
          <input
            className="input"
            placeholder={t('addDriver.searchDriver')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {filtered.length === 0 ? (
            <div className="text-sm text-neutral-500 py-4 text-center">
              {t('addDriver.noDrivers')}
            </div>
          ) : (
            <ul className="divide-y divide-neutral-100 max-h-56 overflow-y-auto">
              {filtered.map((w) => {
                const already = taken.has(w.id);
                const selected = selectedDriverId === w.id;
                return (
                  <li key={w.id}>
                    <button
                      type="button"
                      disabled={already}
                      onClick={() => setSelectedDriverId(w.id)}
                      className={`w-full flex items-center gap-3 py-2 px-2 -mx-2 rounded-lg text-left ${
                        already
                          ? 'opacity-50 cursor-not-allowed'
                          : selected
                            ? 'bg-brand-50 ring-1 ring-brand-700'
                            : 'hover:bg-neutral-50'
                      }`}
                    >
                      <Avatar name={w.name} src={w.photo} size={36} />
                      <span className="font-medium truncate grow">{w.name}</span>
                      {already && (
                        <span className="badge bg-neutral-100 text-neutral-500 shrink-0">
                          {t('addDriver.alreadyAdded')}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="pt-2 border-t border-neutral-100 space-y-3">
            <div>
              <label className="label">{t('addDriver.driverPayMode')}</label>
              <div className="grid grid-cols-3 gap-2">
                {DRIVER_PAY_MODES.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setDriverPayMode(m)}
                    className={`btn text-sm ${
                      driverPayMode === m
                        ? 'bg-brand-700 text-white'
                        : 'bg-neutral-100 text-neutral-800'
                    }`}
                  >
                    {t(`addDriver.driverMode.${m}`)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">
                {t(`addDriver.driverRateLabel.${driverPayMode}`)}
              </label>
              <input
                className="input"
                type="text"
                inputMode="decimal"
                value={driverRate}
                onChange={(e) => setDriverRate(e.target.value)}
                placeholder="0"
              />
            </div>
            <div>
              <label className="label">{t('addDriver.workerPayMode')}</label>
              <div className="grid grid-cols-2 gap-2">
                {WORKER_PAY_MODES.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setWorkerPayMode(m)}
                    className={`btn text-sm ${
                      workerPayMode === m
                        ? 'bg-brand-700 text-white'
                        : 'bg-neutral-100 text-neutral-800'
                    }`}
                  >
                    {t(`addDriver.workerMode.${m}`)}
                  </button>
                ))}
              </div>
            </div>
            {workerPayMode === 'flat' && (
              <div>
                <label className="label">{t('addDriver.pickerFlatRate')}</label>
                <input
                  className="input"
                  type="text"
                  inputMode="decimal"
                  value={pickerFlatRate}
                  onChange={(e) => setPickerFlatRate(e.target.value)}
                  placeholder="0"
                />
              </div>
            )}
            {error && <div className="text-sm text-red-600">{error}</div>}
            <div className="flex gap-2 justify-end pt-2">
              <button className="btn-secondary" onClick={onClose} disabled={busy}>
                {t('common.cancel')}
              </button>
              <button
                className="btn-primary"
                onClick={save}
                disabled={!canSave || busy}
              >
                {t('addDriver.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </Sheet>
  );
}
