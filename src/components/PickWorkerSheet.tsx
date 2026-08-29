import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLiveQuery } from 'dexie-react-hooks';
import { Sheet } from './Sheet';
import { Avatar } from './Avatar';
import { TypeBadge } from './TypeBadge';
import { WorkerForm } from './WorkerForm';
import { db } from '@/db/db';
import { addWorkerToSession, createWorker } from '@/db/actions';
import { WORKER_TYPES, type WorkerType } from '@/db/types';

interface Props {
  open: boolean;
  onClose: () => void;
  sessionId: string;
}

export function PickWorkerSheet({ open, onClose, sessionId }: Props) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<'pick' | 'new'>('pick');
  const [search, setSearch] = useState('');
  const [typeOverrides, setTypeOverrides] = useState<Record<string, WorkerType>>({});

  const workers =
    useLiveQuery(() => db.workers.filter((w) => !w.archived).toArray(), []) ?? [];
  const takenRows =
    useLiveQuery(
      () => db.sessionRows.where({ sessionId }).toArray(),
      [sessionId],
    ) ?? [];
  const taken = useMemo(() => new Set(takenRows.map((r) => r.workerId)), [takenRows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? workers.filter((w) => w.name.toLowerCase().includes(q))
      : workers;
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }, [workers, search]);

  const handleClose = () => {
    setMode('pick');
    setSearch('');
    setTypeOverrides({});
    onClose();
  };

  const add = async (workerId: string) => {
    await addWorkerToSession(sessionId, workerId, typeOverrides[workerId]);
  };

  const createAndAdd = async (v: { name: string; type: WorkerType; photo?: string }) => {
    const w = await createWorker(v);
    await addWorkerToSession(sessionId, w.id);
    handleClose();
  };

  return (
    <Sheet open={open} onClose={handleClose} title={t('pickWorker.title')}>
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
          {filtered.length === 0 && (
            <div className="text-sm text-neutral-500 py-8 text-center">
              {t('roster.empty')}
            </div>
          )}
          <ul className="divide-y divide-neutral-100">
            {filtered.map((w) => {
              const already = taken.has(w.id);
              const activeType = typeOverrides[w.id] ?? w.type;
              return (
                <li key={w.id} className="py-2">
                  <div className="flex items-center gap-3">
                    <Avatar name={w.name} src={w.photo} size={40} />
                    <div className="grow min-w-0">
                      <div className="font-medium truncate">{w.name}</div>
                      <div className="mt-0.5">
                        <TypeBadge type={activeType} />
                      </div>
                    </div>
                    <button
                      className="btn-primary"
                      disabled={already}
                      onClick={() => add(w.id)}
                    >
                      {already ? t('pickWorker.alreadyAdded') : t('pickWorker.confirm')}
                    </button>
                  </div>
                  {!already && (
                    <div className="pl-[3.25rem] pt-2 flex flex-wrap gap-1">
                      <span className="text-xs text-neutral-500 pr-1 self-center">
                        {t('pickWorker.typePrompt')}:
                      </span>
                      {WORKER_TYPES.map((wt) => (
                        <button
                          key={wt}
                          className={`badge ${
                            activeType === wt
                              ? 'bg-brand-700 text-white'
                              : 'bg-neutral-100 text-neutral-700'
                          }`}
                          onClick={() =>
                            setTypeOverrides((cur) => ({ ...cur, [w.id]: wt }))
                          }
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
