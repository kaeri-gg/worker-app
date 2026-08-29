import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import {
  endSession,
  getOrStartTodaySession,
  markRowPaid,
  revertRowLatestPayment,
  summarizeSession,
  type RowSummary,
} from '@/db/actions';
import { Avatar } from '@/components/Avatar';
import { TypeBadge } from '@/components/TypeBadge';
import { PickWorkerSheet } from '@/components/PickWorkerSheet';
import { WorkerDetailSheet } from '@/components/WorkerDetailSheet';
import { AddKgSheet } from '@/components/AddKgSheet';
import { formatKg, formatKgShort, formatMoney } from '@/lib/format';
import { todayISO } from '@/lib/id';
import { useSettings } from '@/hooks/useSettings';
import { usePagination } from '@/hooks/usePagination';
import { Pagination } from '@/components/Pagination';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import type { SortMode } from '@/lib/filterSort';
import { WORKER_TYPES, type WorkerType } from '@/db/types';

export function TodayPage() {
  const { t } = useTranslation();
  const settings = useSettings();
  const [pickOpen, setPickOpen] = useState(false);
  const [detailRowId, setDetailRowId] = useState<string | null>(null);
  const [kgRow, setKgRow] = useState<{ id: string; name: string } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [tab, setTab] = useState<'unpaid' | 'paid'>('unpaid');
  const [roleFilter, setRoleFilter] = useState<WorkerType | 'all'>('all');
  const [sort, setSort] = useState<SortMode>('alpha');
  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch] = useState('');
  const [payingRow, setPayingRow] = useState<{
    id: string;
    name: string;
    amount: number;
  } | null>(null);
  const [revertingRow, setRevertingRow] = useState<{
    id: string;
    name: string;
    amount: number;
  } | null>(null);

  const sessionResult = useLiveQuery(
    async () => {
      const s = await db.sessions
        .where({ date: todayISO(), status: 'open' })
        .first();
      return { session: s ?? null };
    },
    [],
  );
  const session = sessionResult?.session ?? null;

  const summaries =
    useLiveQuery<RowSummary[]>(
      async () => (session ? await summarizeSession(session.id) : []),
      [session?.id],
    ) ?? [];

  const tabSummary = useMemo(() => {
    let paidCount = 0;
    let unpaidCount = 0;
    let paidAmount = 0;
    let unpaidAmount = 0;
    let totalKg = 0;
    for (const s of summaries) {
      totalKg += s.totalKg;
      if (s.isPaid) {
        paidCount += 1;
        paidAmount += s.amount;
      } else {
        unpaidCount += 1;
        unpaidAmount += s.unpaidAmount;
      }
    }
    return { paidCount, unpaidCount, paidAmount, unpaidAmount, totalKg };
  }, [summaries]);

  const processed = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = summaries.filter((s) => {
      if (tab === 'paid' ? !s.isPaid : s.isPaid) return false;
      if (roleFilter !== 'all' && s.type !== roleFilter) return false;
      if (q && !s.workerName.toLowerCase().includes(q)) return false;
      return true;
    });
    return [...filtered].sort((a, b) => {
      switch (sort) {
        case 'alpha':
          return a.workerName.localeCompare(b.workerName);
        case 'kg_desc':
          return b.totalKg - a.totalKg;
        case 'kg_asc':
          return a.totalKg - b.totalKg;
      }
    });
  }, [summaries, tab, roleFilter, sort, search]);
  const pg = usePagination(processed);

  const totals = {
    totalKg: tabSummary.totalKg,
    paid: tabSummary.paidAmount,
    unpaid: tabSummary.unpaidAmount,
  };

  const filterActive = roleFilter !== 'all' || sort !== 'alpha';

  if (sessionResult === undefined) return null;

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
        <h1 className="text-xl font-semibold">{t('today.title')}</h1>
        <p className="text-neutral-600 max-w-xs">{t('today.empty')}</p>
        <button className="btn-primary" onClick={() => void getOrStartTodaySession()}>
          {t('today.startSession')}
        </button>
      </div>
    );
  }

  return (
    <div>
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold">{t('today.title')}</h1>
          <p className="text-sm text-neutral-500">{session.date}</p>
        </div>
        <button
          className="btn bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300 shrink-0"
          disabled={summaries.length === 0}
          onClick={() => setConfirming(true)}
        >
          {t('today.endSession')}
        </button>
      </header>

      {summaries.length > 0 && (
        <div className="card p-3 mb-4 flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-wide text-neutral-500">
            {t('today.totalKg')}
          </span>
          <span className="font-semibold">
            {formatKg(totals.totalKg, settings.weightUnit)}
          </span>
        </div>
      )}

      <div className="flex items-center gap-2 mb-3">
        <button
          className="btn-primary shrink-0"
          onClick={() => setPickOpen(true)}
        >
          + {t('today.addWorker')}
        </button>
        {summaries.length > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <input
              className="input w-40"
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
        )}
      </div>

      {summaries.length > 0 && showFilters && (
        <div className="card p-3 mb-3 space-y-3">
          <div>
            <div className="text-xs text-neutral-500 mb-1">{t('filter.role')}</div>
            <div className="flex flex-wrap gap-1.5">
              {(['all', ...WORKER_TYPES] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  className={`badge ${
                    roleFilter === f
                      ? 'bg-brand-700 text-white'
                      : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                  }`}
                  onClick={() => setRoleFilter(f)}
                  aria-pressed={roleFilter === f}
                >
                  {f === 'all' ? t('filter.all') : t(`worker.type.${f}`)}
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
                    sort === mode
                      ? 'bg-brand-700 text-white'
                      : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                  }`}
                  onClick={() => setSort(mode)}
                  aria-pressed={sort === mode}
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

      {summaries.length > 0 && (
        <div className="flex gap-1 p-1 rounded-xl bg-neutral-100 mb-3">
          <button
            className={`flex-1 py-2 px-2 rounded-lg text-left transition ${
              tab === 'unpaid' ? 'bg-white shadow-sm' : ''
            }`}
            onClick={() => setTab('unpaid')}
          >
            <div className="text-sm font-medium">{t('row.unpaid')}</div>
            <div className="text-[11px] text-neutral-500">
              {tabSummary.unpaidCount} ·{' '}
              {formatMoney(tabSummary.unpaidAmount, settings.currency)}
            </div>
          </button>
          <button
            className={`flex-1 py-2 px-2 rounded-lg text-left transition ${
              tab === 'paid' ? 'bg-white shadow-sm' : ''
            }`}
            onClick={() => setTab('paid')}
          >
            <div className="text-sm font-medium">{t('row.paid')}</div>
            <div className="text-[11px] text-neutral-500">
              {tabSummary.paidCount} ·{' '}
              {formatMoney(tabSummary.paidAmount, settings.currency)}
            </div>
          </button>
        </div>
      )}

      {summaries.length === 0 ? (
        <div className="card p-6 text-center text-neutral-500">{t('today.empty')}</div>
      ) : processed.length === 0 ? (
        <div className="card p-6 text-center text-neutral-500">—</div>
      ) : (
        <ul className="space-y-2">
          {pg.sliced.map((s) => (
            <li key={s.rowId}>
              <div className="card p-3">
                <div className="flex items-center gap-3">
                  <button
                    className="flex items-center gap-3 grow min-w-0 text-left"
                    onClick={() => setDetailRowId(s.rowId)}
                  >
                    <Avatar name={s.workerName} src={s.workerPhoto} size={44} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-medium truncate">{s.workerName}</span>
                        <TypeBadge type={s.type} />
                      </div>
                      {s.rateModel === 'per_kg' ? (
                        s.kgs.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {s.kgs.map((kg, i) => (
                              <span
                                key={i}
                                className="badge bg-neutral-100 text-neutral-600"
                              >
                                +{formatKgShort(kg)}
                              </span>
                            ))}
                            <span className="badge bg-amber-100 text-amber-800">
                              = {formatKg(s.totalKg, settings.weightUnit)}
                            </span>
                          </div>
                        )
                      ) : (
                        <div className="text-xs text-neutral-500 mt-0.5">
                          {t('row.flatRate')}
                        </div>
                      )}
                    </div>
                  </button>
                  <div className="flex gap-2 shrink-0">
                    {s.rateModel === 'per_kg' && (
                      <button
                        className="btn-secondary"
                        disabled={s.isPaid}
                        onClick={() =>
                          setKgRow({ id: s.rowId, name: s.workerName })
                        }
                      >
                        {t('row.addKg')}
                      </button>
                    )}
                    {s.isPaid ? (
                      <button
                        className="btn bg-amber-600 text-white hover:bg-amber-700"
                        onClick={() =>
                          setRevertingRow({
                            id: s.rowId,
                            name: s.workerName,
                            amount: s.amount,
                          })
                        }
                      >
                        {t('row.revert')}
                      </button>
                    ) : (
                      <button
                        className="btn-primary"
                        disabled={
                          s.rateModel === 'per_kg' && s.unpaidEntryCount === 0
                        }
                        onClick={() =>
                          setPayingRow({
                            id: s.rowId,
                            name: s.workerName,
                            amount: s.unpaidAmount,
                          })
                        }
                      >
                        {t('row.markPaid')}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

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

      <ConfirmDialog
        open={payingRow !== null}
        onClose={() => setPayingRow(null)}
        onConfirm={async () => {
          if (payingRow) await markRowPaid(payingRow.id);
        }}
        title={
          payingRow
            ? t('row.confirmPaidTitle', { name: payingRow.name })
            : ''
        }
        body={
          payingRow
            ? t('row.confirmPaidBody', {
                name: payingRow.name,
                amount: formatMoney(payingRow.amount, settings.currency),
              })
            : null
        }
        confirmLabel={t('row.markPaid')}
      />

      <ConfirmDialog
        open={revertingRow !== null}
        onClose={() => setRevertingRow(null)}
        onConfirm={async () => {
          if (revertingRow) await revertRowLatestPayment(revertingRow.id);
        }}
        title={
          revertingRow
            ? t('row.confirmRevertTitle', { name: revertingRow.name })
            : ''
        }
        body={
          revertingRow
            ? t('row.confirmRevertBody', {
                name: revertingRow.name,
                amount: formatMoney(revertingRow.amount, settings.currency),
              })
            : null
        }
        confirmLabel={t('row.revert')}
      />

      <PickWorkerSheet
        open={pickOpen}
        onClose={() => setPickOpen(false)}
        sessionId={session.id}
      />
      <WorkerDetailSheet
        open={detailRowId !== null}
        onClose={() => setDetailRowId(null)}
        rowId={detailRowId}
      />
      {kgRow && (
        <AddKgSheet
          open={kgRow !== null}
          onClose={() => setKgRow(null)}
          rowId={kgRow.id}
          workerName={kgRow.name}
        />
      )}

      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setConfirming(false)}
          />
          <div className="relative bg-white rounded-2xl p-5 max-w-sm w-full shadow-xl">
            <div className="text-base font-semibold mb-1">{t('today.endSession')}</div>
            <p className="text-sm text-neutral-600">
              {t('today.endSessionConfirm')}
            </p>
            <div className="flex gap-2 justify-end mt-4">
              <button className="btn-secondary" onClick={() => setConfirming(false)}>
                {t('common.cancel')}
              </button>
              <button
                className="btn-primary"
                onClick={async () => {
                  await endSession(session.id);
                  setConfirming(false);
                }}
              >
                {t('common.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
