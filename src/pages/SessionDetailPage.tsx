import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import { summarizeSession, type RowSummary } from '@/db/actions';
import { Avatar } from '@/components/Avatar';
import { TypeBadge } from '@/components/TypeBadge';
import { formatDate, formatKg, formatMoney } from '@/lib/format';
import { useSettings } from '@/hooks/useSettings';
import { usePagination } from '@/hooks/usePagination';
import { Pagination } from '@/components/Pagination';
import { FilterSortBar } from '@/components/FilterSortBar';
import {
  applyFilterSort,
  DEFAULT_FILTER_SORT,
  type FilterSortState,
} from '@/lib/filterSort';
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
  const processed = useMemo(
    () => applyFilterSort(summaries, fs, { paidLast: true }),
    [summaries, fs],
  );
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
        <FilterSortBar value={fs} onChange={(p) => setFs((c) => ({ ...c, ...p }))} />
      )}

      <ul className="space-y-2">
        {pg.sliced.map((s) => (
          <li key={s.rowId} className="card p-3 flex items-center gap-3">
            <Avatar name={s.workerName} src={s.workerPhoto} size={40} />
            <div className="grow min-w-0">
              <div className="font-medium truncate">{s.workerName}</div>
              <div className="flex items-center gap-2 mt-0.5">
                <TypeBadge type={s.type} />
                {s.rateModel === 'per_kg' && (
                  <span className="text-xs text-neutral-500">
                    {formatKg(s.totalKg, settings.weightUnit)}
                  </span>
                )}
              </div>
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
