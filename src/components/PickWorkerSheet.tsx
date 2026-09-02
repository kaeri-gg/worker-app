import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLiveQuery } from 'dexie-react-hooks';
import { Sheet } from './Sheet';
import { Avatar } from './Avatar';
import { TypeBadge } from './TypeBadge';
import { WorkerForm } from './WorkerForm';
import { db } from '@/db/db';
import {
  addWorkerToSession,
  createWorker,
  removeWorkerFromSession,
  updateWorker,
} from '@/db/actions';
import type { WorkerType } from '@/db/types';

const CHILD_TYPES: WorkerType[] = ['picker', 'shaker'];

interface Props {
  open: boolean;
  onClose: () => void;
  sessionId: string;
  driverRowId: string;
  driverName?: string;
}

export function PickWorkerSheet({
  open,
  onClose,
  sessionId,
  driverRowId,
  driverName,
}: Props) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<'pick' | 'new'>('pick');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<WorkerType | 'all'>('all');
  const [editingTypeFor, setEditingTypeFor] = useState<string | null>(null);

  const workers =
    useLiveQuery(
      () =>
        db.workers
          .filter((w) => !w.archived && w.type !== 'driver')
          .toArray(),
      [],
    ) ?? [];
  const sessionRows =
    useLiveQuery(
      () => db.sessionRows.where({ sessionId }).toArray(),
      [sessionId],
    ) ?? [];
  const takenByThisDriver = useMemo(
    () =>
      new Set(
        sessionRows
          .filter((r) => r.parentDriverRowId === driverRowId)
          .map((r) => r.workerId),
      ),
    [sessionRows, driverRowId],
  );
  const takenByOtherDriver = useMemo(
    () =>
      new Set(
        sessionRows
          .filter(
            (r) =>
              r.type !== 'driver' &&
              r.parentDriverRowId !== driverRowId,
          )
          .map((r) => r.workerId),
      ),
    [sessionRows, driverRowId],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = workers.filter(
      (w) =>
        (typeFilter === 'all' || w.type === typeFilter) &&
        (!q || w.name.toLowerCase().includes(q)),
    );
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }, [workers, search, typeFilter]);

  const handleClose = () => {
    setMode('pick');
    setSearch('');
    setTypeFilter('all');
    setEditingTypeFor(null);
    onClose();
  };

  const add = (workerId: string) =>
    addWorkerToSession(sessionId, workerId, driverRowId);

  const remove = async (workerId: string) => {
    try {
      await removeWorkerFromSession(sessionId, workerId);
    } catch {
      alert(t('pickWorker.cannotRemove'));
    }
  };

  const pickType = async (workerId: string, type: WorkerType) => {
    await updateWorker(workerId, { type });
    setEditingTypeFor(null);
  };

  const createAndAdd = async (v: { name: string; type: WorkerType; photo?: string }) => {
    if (v.type === 'driver') return;
    const w = await createWorker(v);
    await addWorkerToSession(sessionId, w.id, driverRowId);
    handleClose();
  };

  return (
    <Sheet
      open={open}
      onClose={handleClose}
      title={
        driverName
          ? t('pickWorker.titleFor', { driver: driverName })
          : t('pickWorker.title')
      }
    >
      <div className="flex gap-2 mb-3">
        <button
          className={`btn flex-1 ${
            mode === 'pick' ? 'bg-brand-700 text-white' : 'bg-neutral-100 text-neutral-800'
          }`}
          onClick={() => setMode('pick')}
        >
          {t('pickWorker.existing')}
        </button>
        <button
          className={`btn flex-1 ${
            mode === 'new' ? 'bg-brand-700 text-white' : 'bg-neutral-100 text-neutral-800'
          }`}
          onClick={() => setMode('new')}
        >
          {t('pickWorker.createNew')}
        </button>
      </div>

      {mode === 'pick' ? (
        <div className="space-y-2">
          <input
            className="input"
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="flex flex-wrap gap-1.5 pt-1">
            {(['all', ...CHILD_TYPES] as const).map((f) => (
              <button
                key={f}
                type="button"
                className={`badge ${
                  typeFilter === f
                    ? 'bg-brand-700 text-white'
                    : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                }`}
                onClick={() => setTypeFilter(f)}
                aria-pressed={typeFilter === f}
              >
                {f === 'all' ? t('filter.all') : t(`worker.type.${f}`)}
              </button>
            ))}
          </div>
          {filtered.length === 0 && (
            <div className="text-sm text-neutral-500 py-8 text-center">
              {t('roster.empty')}
            </div>
          )}
          <ul className="divide-y divide-neutral-100">
            {filtered.map((w) => {
              const here = takenByThisDriver.has(w.id);
              const elsewhere = takenByOtherDriver.has(w.id);
              const disabled = elsewhere;
              const editing = editingTypeFor === w.id;
              return (
                <li
                  key={w.id}
                  className={`py-2 px-2 -mx-2 rounded-lg ${
                    here ? 'bg-neutral-100' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={disabled || here ? 'opacity-50 grayscale' : ''}>
                      <Avatar name={w.name} src={w.photo} size={40} />
                    </div>
                    <div className="grow min-w-0 flex items-center gap-2">
                      <div
                        className={`font-medium truncate ${
                          disabled || here ? 'text-neutral-400' : ''
                        }`}
                      >
                        {w.name}
                      </div>
                      <span className={disabled || here ? 'opacity-50 grayscale' : ''}>
                        <TypeBadge type={w.type} />
                      </span>
                      {!disabled && (
                        <button
                          type="button"
                          className="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100"
                          onClick={() => setEditingTypeFor(editing ? null : w.id)}
                          aria-label={t('pickWorker.editType')}
                          title={t('pickWorker.editType')}
                          aria-pressed={editing}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="w-3.5 h-3.5"
                            aria-hidden="true"
                          >
                            <path d="M12 20h9" />
                            <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                          </svg>
                        </button>
                      )}
                    </div>
                    {disabled ? (
                      <span className="badge bg-neutral-100 text-neutral-500 shrink-0">
                        {t('pickWorker.underOtherDriver')}
                      </span>
                    ) : here ? (
                      <button
                        className="btn !p-0 !rounded-full w-9 h-9 shrink-0 bg-neutral-200 text-neutral-600 hover:bg-neutral-300"
                        onClick={() => remove(w.id)}
                        aria-label={t('pickWorker.remove')}
                        title={t('pickWorker.remove')}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="w-5 h-5"
                          aria-hidden="true"
                        >
                          <path d="M5 12h14" />
                        </svg>
                      </button>
                    ) : (
                      <button
                        className="btn-primary !p-0 !rounded-full w-9 h-9 shrink-0"
                        onClick={() => add(w.id)}
                        aria-label={t('pickWorker.confirm')}
                        title={t('pickWorker.confirm')}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="w-5 h-5"
                          aria-hidden="true"
                        >
                          <path d="M12 5v14M5 12h14" />
                        </svg>
                      </button>
                    )}
                  </div>
                  {editing && !disabled && (
                    <div className="pl-[3.25rem] pt-2 flex flex-wrap gap-1">
                      {CHILD_TYPES.map((wt) => (
                        <button
                          key={wt}
                          className={`badge ${
                            w.type === wt
                              ? 'bg-brand-700 text-white'
                              : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                          }`}
                          onClick={() => pickType(w.id, wt)}
                        >
                          {t(`worker.type.${wt}`)}
                        </button>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <WorkerForm
          onSubmit={createAndAdd}
          onCancel={() => setMode('pick')}
          submitLabel={t('pickWorker.confirm')}
        />
      )}
    </Sheet>
  );
}
