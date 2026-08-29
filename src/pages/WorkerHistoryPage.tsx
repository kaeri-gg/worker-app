import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import { Avatar } from '@/components/Avatar';
import { TypeBadge } from '@/components/TypeBadge';
import { useSettings } from '@/hooks/useSettings';
import { formatMoney } from '@/lib/format';
import {
  WORKER_TYPES,
  type WorkerChange,
  type WorkerChangeKind,
  type WorkerType,
} from '@/db/types';

interface WorkerRow {
  workerId: string;
  workerName: string;
  workerPhoto?: string;
  currentType: WorkerType;
  archived: boolean;
  totalPaid: number;
  changes: WorkerChange[];
}

const KIND_FILTERS: (WorkerChangeKind | 'all')[] = ['all', 'type', 'name', 'photo'];

export function WorkerHistoryPage() {
  const { t, i18n } = useTranslation();
  const settings = useSettings();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<WorkerType | 'all'>('all');
  const [kindFilter, setKindFilter] = useState<WorkerChangeKind | 'all'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const filtersActive = typeFilter !== 'all' || kindFilter !== 'all';

  const workers = useLiveQuery(() => db.workers.toArray(), []) ?? [];
  const changes =
    useLiveQuery(() => db.workerChanges.orderBy('at').reverse().toArray(), []) ?? [];
  const payments = useLiveQuery(() => db.payments.toArray(), []) ?? [];

  const rows: WorkerRow[] = useMemo(() => {
    const paidByWorker = new Map<string, number>();
    for (const p of payments) {
      paidByWorker.set(p.workerId, (paidByWorker.get(p.workerId) ?? 0) + p.amount);
    }
    const byWorker = new Map<string, WorkerRow>();
    for (const w of workers) {
      byWorker.set(w.id, {
        workerId: w.id,
        workerName: w.name,
        workerPhoto: w.photo,
        currentType: w.type,
        archived: !!w.archived,
        totalPaid: paidByWorker.get(w.id) ?? 0,
        changes: [],
      });
    }
    for (const c of changes) {
      byWorker.get(c.workerId)?.changes.push(c);
    }
    return [...byWorker.values()]
      .filter((r) => r.changes.some((c) => c.from !== null))
      .sort((a, b) => a.workerName.localeCompare(b.workerName));
  }, [workers, changes, payments]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows
      .filter((r) => !q || r.workerName.toLowerCase().includes(q))
      .filter((r) => {
        if (kindFilter === 'all') return true;
        return r.changes.some((c) => c.kind === kindFilter && c.from !== null);
      })
      .filter((r) => {
        if (typeFilter === 'all') return true;
        return r.changes.some(
          (c) => c.kind === 'type' && (c.from === typeFilter || c.to === typeFilter),
        );
      });
  }, [rows, search, kindFilter, typeFilter]);

  const dateTimeFmt = new Intl.DateTimeFormat(
    i18n.language === 'ka' ? 'ka-GE' : 'en-GB',
    { dateStyle: 'medium', timeStyle: 'short' },
  );

  return (
    <div className="space-y-4">
      <Link to="/settings" className="btn-ghost -ml-2 inline-flex">
        ← {t('settings.title')}
      </Link>
      <h1 className="text-xl font-semibold">{t('history.title')}</h1>

      <div className="card p-3 space-y-3">
        <div className="flex items-center gap-2">
          <input
            className="input"
            placeholder={t('history.searchWorker')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button
            type="button"
            className={`btn shrink-0 !p-0 w-10 h-10 relative ${
              showFilters || filtersActive
                ? 'bg-brand-700 text-white hover:bg-brand-800'
                : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
            }`}
            onClick={() => setShowFilters((s) => !s)}
            aria-label={t('filter.title')}
            title={t('filter.title')}
            aria-expanded={showFilters}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-5 h-5"
              aria-hidden="true"
            >
              <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
            </svg>
            {filtersActive && !showFilters && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-white" />
            )}
          </button>
        </div>
        {showFilters && (
          <div className="space-y-3">
            <div>
              <div className="text-xs text-neutral-500 mb-1">{t('history.filterKind')}</div>
              <div className="flex flex-wrap gap-1.5">
                {KIND_FILTERS.map((k) => (
                  <button
                    key={k}
                    type="button"
                    className={`badge ${
                      kindFilter === k
                        ? 'bg-brand-700 text-white'
                        : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                    }`}
                    onClick={() => setKindFilter(k)}
                    aria-pressed={kindFilter === k}
                  >
                    {k === 'all' ? t('filter.all') : t(`history.kind.${k}`)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs text-neutral-500 mb-1">{t('history.filterType')}</div>
              <div className="flex flex-wrap gap-1.5">
                {(['all', ...WORKER_TYPES] as const).map((f) => (
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
            </div>
          </div>
        )}
      </div>

      {filtered.length === 0 && (
        <div className="text-sm text-neutral-500 py-8 text-center">
          {t('history.empty')}
        </div>
      )}

      <ul className="space-y-2">
        {filtered.map((r) => {
          const realChanges = r.changes.filter((c) => c.from !== null);
          const countByKind: Record<WorkerChangeKind, number> = {
            type: 0,
            name: 0,
            photo: 0,
          };
          for (const c of realChanges) countByKind[c.kind]++;
          return (
            <li key={r.workerId} className="card p-3">
              <div className="flex items-center gap-3">
                <Avatar name={r.workerName} src={r.workerPhoto} size={40} />
                <div className="grow min-w-0">
                  <div className="font-medium truncate">{r.workerName}</div>
                  <div className="text-xs text-neutral-500 mt-0.5">
                    {t('history.changeCount', { count: realChanges.length })}
                    {(['type', 'name', 'photo'] as const)
                      .filter((k) => countByKind[k] > 0)
                      .map((k) => ` · ${countByKind[k]} ${t(`history.kind.${k}`).toLowerCase()}`)
                      .join('')}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[11px] uppercase text-neutral-500">
                    {t('history.totalPaid')}
                  </div>
                  <div className="font-semibold">
                    {formatMoney(r.totalPaid, settings.currency)}
                  </div>
                </div>
              </div>

              <ol className="mt-3 pl-[3.25rem] space-y-1.5">
                {realChanges.map((c) => (
                  <li key={c.id} className="flex items-center gap-2 text-sm flex-wrap">
                    <ChangeLine change={c} />
                    <span className="text-xs text-neutral-500">
                      {dateTimeFmt.format(new Date(c.at))}
                    </span>
                  </li>
                ))}
              </ol>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ChangeLine({ change }: { change: WorkerChange }) {
  const { t } = useTranslation();
  if (change.kind === 'type') {
    return (
      <>
        {change.from && <TypeBadge type={change.from as WorkerType} />}
        <span className="text-neutral-400">→</span>
        <TypeBadge type={change.to as WorkerType} />
      </>
    );
  }
  if (change.kind === 'name') {
    return (
      <>
        <span className="badge bg-neutral-100 text-neutral-700">
          {t('history.kind.name')}
        </span>
        <span className="text-neutral-600 line-through">{change.from}</span>
        <span className="text-neutral-400">→</span>
        <span className="font-medium">{change.to}</span>
      </>
    );
  }
  return (
    <>
      <span className="badge bg-neutral-100 text-neutral-700">
        {t('history.kind.photo')}
      </span>
      <span className="text-neutral-600">{t('history.photoUpdated')}</span>
    </>
  );
}
