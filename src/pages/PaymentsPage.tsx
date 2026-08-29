import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import type { Payment, Worker } from '@/db/types';
import { formatDate, formatKg, formatMoney, formatTime } from '@/lib/format';
import { TypeBadge } from '@/components/TypeBadge';
import { useSettings } from '@/hooks/useSettings';
import { usePagination } from '@/hooks/usePagination';
import { Pagination } from '@/components/Pagination';
import { FilterSortBar } from '@/components/FilterSortBar';
import { DEFAULT_FILTER_SORT, type FilterSortState } from '@/lib/filterSort';

export function PaymentsPage() {
  const { t } = useTranslation();
  const settings = useSettings();
  const [filterWorker, setFilterWorker] = useState<string>('');
  const [fs, setFs] = useState<FilterSortState>(DEFAULT_FILTER_SORT);

  const payments =
    useLiveQuery(() => db.payments.orderBy('at').reverse().toArray(), []) ??
    ([] as Payment[]);
  const workers = useLiveQuery(() => db.workers.toArray(), []) ?? ([] as Worker[]);

  const filtered = useMemo(() => {
    let list = filterWorker
      ? payments.filter((p) => p.workerId === filterWorker)
      : payments;
    if (fs.role !== 'all') list = list.filter((p) => p.workerType === fs.role);
    const sorted = [...list].sort((a, b) => {
      switch (fs.sort) {
        case 'alpha':
          return a.workerName.localeCompare(b.workerName);
        case 'kg_desc':
          return b.totalKg - a.totalKg;
        case 'kg_asc':
          return a.totalKg - b.totalKg;
      }
    });
    return sorted;
  }, [payments, filterWorker, fs.role, fs.sort]);
  const pg = usePagination(filtered);

  const total = filtered.reduce((a, p) => a + p.amount, 0);

  return (
    <div>
      <h1 className="text-xl font-semibold mb-3">{t('payments.title')}</h1>

      <div className="flex items-center gap-2 mb-3">
        <select
          className="input"
          value={filterWorker}
          onChange={(e) => setFilterWorker(e.target.value)}
        >
          <option value="">{t('payments.allWorkers')}</option>
          {[...workers]
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
        </select>
      </div>

      <FilterSortBar
        value={fs}
        onChange={(p) => setFs((c) => ({ ...c, ...p }))}
        showPaid={false}
      />

      {filtered.length === 0 ? (
        <div className="card p-6 text-center text-neutral-500">
          {t('payments.empty')}
        </div>
      ) : (
        <>
          <div className="card p-3 mb-3 flex items-center justify-between">
            <span className="text-neutral-600 text-sm">Σ</span>
            <span className="font-semibold">{formatMoney(total, settings.currency)}</span>
          </div>
          <ul className="space-y-2">
            {pg.sliced.map((p) => (
              <li key={p.id} className="card p-3">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{p.workerName}</div>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-neutral-500">
                      <TypeBadge type={p.workerType} />
                      <span>
                        {formatDate(p.at)} · {formatTime(p.at)}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">
                      {formatMoney(p.amount, p.currency || settings.currency)}
                    </div>
                    {p.totalKg > 0 && (
                      <div className="text-xs text-neutral-500 mt-0.5">
                        {formatKg(p.totalKg, settings.weightUnit)}
                      </div>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
      {filtered.length > 0 && (
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
