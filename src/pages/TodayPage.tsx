import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import {
  endSession,
  getOrStartTodaySession,
  markRowPaid,
  summarizeSession,
  type RowSummary,
} from '@/db/actions';
import { Avatar } from '@/components/Avatar';
import { TypeBadge } from '@/components/TypeBadge';
import { PickWorkerSheet } from '@/components/PickWorkerSheet';
import { WorkerDetailSheet } from '@/components/WorkerDetailSheet';
import { AddKgSheet } from '@/components/AddKgSheet';
import { formatKg, formatMoney } from '@/lib/format';
import { todayISO } from '@/lib/id';
import { useSettings } from '@/hooks/useSettings';
import { usePagination } from '@/hooks/usePagination';
import { Pagination } from '@/components/Pagination';
import { FilterSheet } from '@/components/FilterSheet';
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
  const [roles, setRoles] = useState<Set<WorkerType>>(new Set());
  const [sort, setSort] = useState<SortMode>('alpha');
  const [filterOpen, setFilterOpen] = useState(false);
  const [payingRow, setPayingRow] = useState<{
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
    const effectiveRoles = roles.size === 0 ? new Set(WORKER_TYPES) : roles;
    const filtered = summaries.filter((s) => {
      if (tab === 'paid' ? !s.isPaid : s.isPaid) return false;
      if (!effectiveRoles.has(s.type)) return false;
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
  }, [summaries, tab, roles, sort]);
  const pg = usePagination(processed);

  const totals = {
    totalKg: tabSummary.totalKg,
    paid: tabSummary.paidAmount,
    unpaid: tabSummary.unpaidAmount,
  };

  const filterActive =
    (roles.size > 0 && roles.size < WORKER_TYPES.length) || sort !== 'alpha';

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
        <div className="flex gap-2 shrink-0">
          <button
            className="btn-primary text-xs px-2.5 py-1.5"
            onClick={() => setPickOpen(true)}
          >
            + {t('today.addWorker')}
          </button>
          <button
            className="btn text-xs px-2.5 py-1.5 bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300"
            disabled={summaries.length === 0}
            onClick={() => setConfirming(true)}
          >
            {t('today.endSession')}
          </button>
        </div>
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

      {summaries.length > 0 && (
        <div className="flex items-stretch gap-2 mb-3">
          <div className="grow flex gap-1 p-1 rounded-xl bg-neutral-100">
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
          <button
            className={`shrink-0 rounded-xl border p-2 relative ${
              filterActive
                ? 'border-brand-700 text-brand-700 bg-brand-50'
                : 'border-neutral-200 text-neutral-600 bg-white'
            }`}
            onClick={() => setFilterOpen(true)}
            aria-label={t('filter.title')}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
            >
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            {filterActive && (
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-brand-700" />
            )}
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
                      <div className="font-medium truncate">{s.workerName}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <TypeBadge type={s.type} />
                        {s.rateModel === 'per_kg' ? (
                          <span className="text-xs text-neutral-500">
                            {formatKg(s.totalKg, settings.weightUnit)}
                          </span>
                        ) : (
                          <span className="text-xs text-neutral-500">
                            {t('row.flatRate')}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                  <div className="text-right">
                    <div
                      className={`font-semibold ${
                        s.isPaid ? 'text-neutral-400 line-through' : 'text-neutral-900'
                      }`}
                    >
                      {formatMoney(s.amount, settings.currency)}
                    </div>
                    <div className="text-[11px] mt-0.5">
                      {s.isPaid ? (
                        <span className="badge bg-neutral-100 text-neutral-600">
                          {t('row.paid')}
                        </span>
                      ) : s.unpaidAmount > 0 ? (
                        <span className="badge bg-amber-100 text-amber-800">
                          {t('row.unpaid')}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  {s.rateModel === 'per_kg' && (
                    <button
                      className="btn-secondary flex-1"
                      onClick={() =>
                        setKgRow({ id: s.rowId, name: s.workerName })
                      }
                    >
                      {t('row.addKg')}
                    </button>
                  )}
                  <button
                    className="btn-primary flex-1"
                    disabled={s.isPaid || s.unpaidAmount <= 0}
                    onClick={() =>
                      setPayingRow({
                        id: s.rowId,
                        name: s.workerName,
                        amount: s.unpaidAmount,
                      })
                    }
                  >
                    {s.isPaid ? t('row.paid') : t('row.markPaid')}
                  </button>
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

      <FilterSheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        roles={roles}
        onRolesChange={setRoles}
        sort={sort}
        onSortChange={setSort}
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
