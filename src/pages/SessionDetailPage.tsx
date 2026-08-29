import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import { summarizeSession, type RowSummary } from '@/db/actions';
import { Avatar } from '@/components/Avatar';
import { TypeBadge } from '@/components/TypeBadge';
import { formatDate, formatKg, formatKgShort, formatMoney } from '@/lib/format';
import { useSettings } from '@/hooks/useSettings';
import { usePagination } from '@/hooks/usePagination';
import { Pagination } from '@/components/Pagination';
import {
  applyFilterSort,
  DEFAULT_FILTER_SORT,
  type FilterSortState,
} from '@/lib/filterSort';
import { WORKER_TYPES } from '@/db/types';
import { useMemo, useState } from 'react';

export function SessionDetailPage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const settings = useSettings();

  const session = useLiveQuery(() => (id ? db.sessions.get(id) : undefined), [id]);
  const summaries =
    useLiveQuery<RowSummary[]>(
      async () => (id ? await summarizeSession(id) : []),
      [id],
    ) ?? [];
  const [fs, setFs] = useState<FilterSortState>(DEFAULT_FILTER_SORT);
  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch] = useState('');
  const filterActive =
    fs.role !== DEFAULT_FILTER_SORT.role ||
    fs.paid !== DEFAULT_FILTER_SORT.paid ||
    fs.sort !== DEFAULT_FILTER_SORT.sort;
  const processed = useMemo(() => {
    const q = search.trim().toLowerCase();
    const searched = q
      ? summaries.filter((s) => s.workerName.toLowerCase().includes(q))
      : summaries;
    return applyFilterSort(searched, fs, { paidLast: true });
  }, [summaries, fs, search]);
  const pg = usePagination(processed);

  if (!session) {
    return (
      <div className="py-8 text-center text-neutral-500">
        <Link to="/sessions" className="btn-ghost">
          {t('sessions.back')}
        </Link>
      </div>
    );
  }

  const totalPaid = summaries.reduce((a, s) => a + (s.amount - s.unpaidAmount), 0);
  const totalUnpaid = summaries.reduce((a, s) => a + s.unpaidAmount, 0);
  const totalKg = summaries.reduce((a, s) => a + s.totalKg, 0);

  return (
    <div>
      <Link to="/sessions" className="btn-ghost -ml-2 mb-2 inline-flex">
        ← {t('sessions.back')}
      </Link>
      <header className="mb-4">
        <h1 className="text-xl font-semibold">{formatDate(session.date)}</h1>
        <p className="text-sm text-neutral-500">
          {session.status === 'open' ? t('sessions.open') : t('sessions.closed')}
        </p>
      </header>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="card p-3">
          <div className="text-[11px] uppercase text-neutral-500">{t('today.totalKg')}</div>
          <div className="font-semibold">{formatKg(totalKg, settings.weightUnit)}</div>
        </div>
        <div className="card p-3">
          <div className="text-[11px] uppercase text-neutral-500">{t('today.totalPaid')}</div>
          <div className="font-semibold">{formatMoney(totalPaid, settings.currency)}</div>
        </div>
        <div className="card p-3">
          <div className="text-[11px] uppercase text-neutral-500">{t('today.totalUnpaid')}</div>
          <div className="font-semibold">{formatMoney(totalUnpaid, settings.currency)}</div>
        </div>
      </div>

      {summaries.length > 0 && (
        <div className="mb-3 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div />
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
                  showFilters || filterActive
                    ? 'bg-brand-700 text-white hover:bg-brand-800'
                    : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                }`}
                onClick={() => setShowFilters((s) => !s)}
                aria-label={t('filter.title')}
                aria-expanded={showFilters}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5"
                  aria-hidden="true"
                >
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                </svg>
                {filterActive && !showFilters && (
                  <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-amber-400 ring-2 ring-white" />
                )}
              </button>
            </div>
          </div>
          {showFilters && (
            <div className="card p-3 space-y-3">
              <div>
                <div className="text-xs text-neutral-500 mb-1">{t('filter.role')}</div>
                <div className="flex flex-wrap gap-1.5">
                  {(['all', ...WORKER_TYPES] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      className={`badge ${
                        fs.role === f
                          ? 'bg-brand-700 text-white'
                          : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                      }`}
                      onClick={() => setFs((c) => ({ ...c, role: f }))}
                      aria-pressed={fs.role === f}
                    >
                      {f === 'all' ? t('filter.all') : t(`worker.type.${f}`)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs text-neutral-500 mb-1">{t('filter.status')}</div>
                <div className="flex flex-wrap gap-1.5">
                  {(['all', 'unpaid', 'paid'] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={`badge ${
                        fs.paid === s
                          ? 'bg-brand-700 text-white'
                          : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                      }`}
                      onClick={() => setFs((c) => ({ ...c, paid: s }))}
                      aria-pressed={fs.paid === s}
                    >
                      {s === 'all'
                        ? t('filter.all')
                        : s === 'unpaid'
                          ? t('row.unpaid')
                          : t('row.paid')}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs text-neutral-500 mb-1">{t('sort.label')}</div>
                <div className="flex flex-wrap gap-1.5">
                  {(['alpha', 'kg_desc', 'kg_asc'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      className={`badge ${
                        fs.sort === mode
                          ? 'bg-brand-700 text-white'
                          : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                      }`}
                      onClick={() => setFs((c) => ({ ...c, sort: mode }))}
                      aria-pressed={fs.sort === mode}
                    >
                      {mode === 'alpha'
                        ? t('sort.alpha')
                        : mode === 'kg_desc'
                          ? t('sort.kgDesc')
                          : t('sort.kgAsc')}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <ul className="space-y-2">
        {pg.sliced.map((s) => (
          <li key={s.rowId} className="card p-3">
            <div className="flex items-center gap-3">
              <Avatar name={s.workerName} src={s.workerPhoto} size={40} />
              <div className="grow min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-medium truncate">{s.workerName}</span>
                  <TypeBadge type={s.type} />
                </div>
                {s.rateModel === 'per_kg' && (
                  <div className="text-xs text-neutral-500 mt-0.5">
                    {formatKg(s.totalKg, settings.weightUnit)}
                  </div>
                )}
              </div>
              <div className="text-right">
                <div className="font-semibold">
                  {formatMoney(s.amount, settings.currency)}
                </div>
                {s.isPaid ? (
                  <span className="badge bg-neutral-100 text-neutral-600">
                    {t('row.paid')}
                  </span>
                ) : (
                  <span className="badge bg-amber-100 text-amber-800">
                    {t('row.unpaid')}
                  </span>
                )}
              </div>
            </div>
            {s.rateModel === 'per_kg' && s.kgs.length > 0 && (
              <>
                <hr className="my-2 border-neutral-200" />
                <div className="flex flex-wrap gap-1">
                  {s.kgs.map((kg, i) => {
                    const progress =
                      s.kgs.length > 1 ? i / (s.kgs.length - 1) : 1;
                    const lightness = 88 - progress * 46;
                    const bg = `hsl(210, 90%, ${lightness}%)`;
                    const color =
                      lightness > 62 ? 'hsl(210, 90%, 22%)' : 'white';
                    return (
                      <span
                        key={i}
                        className="badge"
                        style={{ backgroundColor: bg, color }}
                      >
                        +{formatKgShort(kg)}
                      </span>
                    );
                  })}
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
      {processed.length > 0 && (
        <Pagination
          page={pg.page}
          pageSize={pg.pageSize}
          pageCount={pg.pageCount}
          total={pg.total}
          start={pg.start}
          end={pg.end}
          canPrev={pg.canPrev}
          canNext={pg.canNext}
          onPageSizeChange={pg.setPageSize}
          onPrev={pg.prev}
          onNext={pg.next}
        />
      )}
    </div>
  );
}
