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
import { AddDriverSheet } from '@/components/AddDriverSheet';
import { WorkerDetailSheet } from '@/components/WorkerDetailSheet';
import { AddKgSheet } from '@/components/AddKgSheet';
import { formatKg, formatKgShort, formatMoney } from '@/lib/format';
import { todayISO } from '@/lib/id';
import { useSettings } from '@/hooks/useSettings';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import type { DriverPayMode } from '@/db/types';

const DRIVER_MODE_KEY: Record<DriverPayMode, string> = {
  per_pax: 'addDriver.driverMode.per_pax',
  fixed: 'addDriver.driverMode.fixed',
  per_kg: 'addDriver.driverMode.per_kg',
};

export function TodayPage() {
  const { t } = useTranslation();
  const settings = useSettings();
  const [addDriverOpen, setAddDriverOpen] = useState(false);
  const [pickWorkerForDriver, setPickWorkerForDriver] = useState<{
    rowId: string;
    name: string;
  } | null>(null);
  const [detailRowId, setDetailRowId] = useState<string | null>(null);
  const [kgRow, setKgRow] = useState<{ id: string; name: string } | null>(null);
  const [confirming, setConfirming] = useState(false);
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

  const drivers = useMemo(
    () =>
      [...summaries]
        .filter((s) => s.type === 'driver')
        .sort((a, b) => a.workerName.localeCompare(b.workerName)),
    [summaries],
  );
  const workersByDriver = useMemo(() => {
    const map = new Map<string, RowSummary[]>();
    for (const s of summaries) {
      if (s.type === 'driver') continue;
      const key = s.parentDriverRowId ?? '';
      if (!key) continue;
      const list = map.get(key) ?? [];
      list.push(s);
      map.set(key, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.workerName.localeCompare(b.workerName));
    }
    return map;
  }, [summaries]);

  const totals = useMemo(() => {
    let totalKg = 0;
    let paid = 0;
    let unpaid = 0;
    for (const s of summaries) {
      totalKg += s.type === 'driver' ? 0 : s.totalKg;
      if (s.isPaid) paid += s.amount;
      else unpaid += s.unpaidAmount;
    }
    return { totalKg, paid, unpaid };
  }, [summaries]);

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
          disabled={drivers.length === 0}
          onClick={() => setConfirming(true)}
        >
          {t('today.endSession')}
        </button>
      </header>

      {drivers.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="card p-3">
            <div className="text-[11px] uppercase text-neutral-500">
              {t('today.totalKg')}
            </div>
            <div className="font-semibold">
              {formatKg(totals.totalKg, settings.weightUnit)}
            </div>
          </div>
          <div className="card p-3">
            <div className="text-[11px] uppercase text-neutral-500">
              {t('today.totalPaid')}
            </div>
            <div className="font-semibold">
              {formatMoney(totals.paid, settings.currency)}
            </div>
          </div>
          <div className="card p-3">
            <div className="text-[11px] uppercase text-neutral-500">
              {t('today.totalUnpaid')}
            </div>
            <div className="font-semibold">
              {formatMoney(totals.unpaid, settings.currency)}
            </div>
          </div>
        </div>
      )}

      <div className="mb-4">
        <button
          className="btn-primary w-full"
          onClick={() => setAddDriverOpen(true)}
        >
          + {t('today.addDriver')}
        </button>
      </div>

      {drivers.length === 0 ? (
        <div className="card p-6 text-center text-neutral-500">
          {t('today.emptyDrivers')}
        </div>
      ) : (
        <ul className="space-y-4">
          {drivers.map((d) => {
            const workers = workersByDriver.get(d.rowId) ?? [];
            return (
              <li key={d.rowId} className="card p-3 space-y-3">
                <div className="flex items-center gap-3">
                  <button
                    className="flex items-center gap-3 grow min-w-0 text-left"
                    onClick={() => setDetailRowId(d.rowId)}
                  >
                    <Avatar name={d.workerName} src={d.workerPhoto} size={44} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-medium truncate">
                          {d.workerName}
                        </span>
                        <TypeBadge type="driver" />
                      </div>
                      <div className="text-xs text-neutral-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                        {d.driverPayMode && (
                          <span className="badge bg-blue-50 text-blue-700">
                            {t(DRIVER_MODE_KEY[d.driverPayMode])}
                          </span>
                        )}
                        {d.workerPayMode && (
                          <span className="badge bg-neutral-100 text-neutral-600">
                            {t(`addDriver.workerMode.${d.workerPayMode}`)}
                          </span>
                        )}
                        <span>· {workers.length} {t('sessions.workers')}</span>
                        {d.driverPayMode === 'per_kg' && (
                          <span>
                            · {formatKg(d.totalKg, settings.weightUnit)}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <div className="font-semibold">
                      {formatMoney(d.amount, settings.currency)}
                    </div>
                    {d.isPaid ? (
                      <button
                        className="btn bg-amber-600 text-white hover:bg-amber-700 text-xs px-2 py-1"
                        onClick={() =>
                          setRevertingRow({
                            id: d.rowId,
                            name: d.workerName,
                            amount: d.amount,
                          })
                        }
                      >
                        {t('row.revert')}
                      </button>
                    ) : (
                      <button
                        className="btn-primary text-xs px-2 py-1"
                        disabled={d.amount <= 0}
                        onClick={() =>
                          setPayingRow({
                            id: d.rowId,
                            name: d.workerName,
                            amount: d.unpaidAmount,
                          })
                        }
                      >
                        {t('row.markPaid')}
                      </button>
                    )}
                  </div>
                </div>

                <div className="pl-2 border-l-2 border-neutral-100 space-y-2">
                  {workers.length === 0 ? (
                    <div className="text-sm text-neutral-500 py-2 px-1">
                      {t('today.driverEmpty')}
                    </div>
                  ) : (
                    workers.map((s) => (
                      <div key={s.rowId} className="flex items-center gap-3">
                        <button
                          className="flex items-center gap-3 grow min-w-0 text-left"
                          onClick={() => setDetailRowId(s.rowId)}
                        >
                          <Avatar
                            name={s.workerName}
                            src={s.workerPhoto}
                            size={36}
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-medium truncate">
                                {s.workerName}
                              </span>
                              <TypeBadge type={s.type} />
                            </div>
                            {s.rateModel === 'per_kg' ? (
                              s.kgs.length > 0 ? (
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
                              ) : (
                                <div className="text-xs text-neutral-500 mt-0.5">
                                  {formatMoney(s.rate, settings.currency)}/kg
                                </div>
                              )
                            ) : (
                              <div className="text-xs text-neutral-500 mt-0.5">
                                {formatMoney(s.rate, settings.currency)} ·{' '}
                                {t('row.flatRate')}
                              </div>
                            )}
                          </div>
                        </button>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <div className="font-semibold text-sm">
                            {formatMoney(s.amount, settings.currency)}
                          </div>
                          <div className="flex gap-1">
                          {s.rateModel === 'per_kg' && (
                            <button
                              className="btn-secondary text-xs px-2 py-1"
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
                              className="btn bg-amber-600 text-white hover:bg-amber-700 text-xs px-2 py-1"
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
                              className="btn-primary text-xs px-2 py-1"
                              disabled={
                                s.rateModel === 'per_kg' &&
                                s.unpaidEntryCount === 0
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
                    ))
                  )}
                  <button
                    className="btn-ghost text-brand-700 text-sm w-full text-left"
                    onClick={() =>
                      setPickWorkerForDriver({
                        rowId: d.rowId,
                        name: d.workerName,
                      })
                    }
                  >
                    + {t('today.addWorker')}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
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

      <AddDriverSheet
        open={addDriverOpen}
        onClose={() => setAddDriverOpen(false)}
        sessionId={session.id}
      />
      {pickWorkerForDriver && (
        <PickWorkerSheet
          open={pickWorkerForDriver !== null}
          onClose={() => setPickWorkerForDriver(null)}
          sessionId={session.id}
          driverRowId={pickWorkerForDriver.rowId}
          driverName={pickWorkerForDriver.name}
        />
      )}
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
