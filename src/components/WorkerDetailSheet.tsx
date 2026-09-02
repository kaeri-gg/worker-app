import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLiveQuery } from 'dexie-react-hooks';
import { Sheet } from './Sheet';
import { Avatar } from './Avatar';
import { TypeBadge } from './TypeBadge';
import { AddKgSheet } from './AddKgSheet';
import { ConfirmDialog } from './ConfirmDialog';
import { db } from '@/db/db';
import {
  deleteEntry,
  markRowPaid,
  revertRowLatestPayment,
  summarizeRow,
  updateSessionRowRate,
} from '@/db/actions';
import type { Entry } from '@/db/types';
import { formatKg, formatMoney, formatTime } from '@/lib/format';
import { useSettings } from '@/hooks/useSettings';

const DRIVER_MODE_KEY = {
  per_pax: 'addDriver.driverMode.per_pax',
  fixed: 'addDriver.driverMode.fixed',
  per_kg: 'addDriver.driverMode.per_kg',
} as const;

interface Props {
  open: boolean;
  onClose: () => void;
  rowId: string | null;
}

export function WorkerDetailSheet({ open, onClose, rowId }: Props) {
  const { t } = useTranslation();
  const settings = useSettings();
  const [addKgOpen, setAddKgOpen] = useState(false);
  const [rateDraft, setRateDraft] = useState<string | null>(null);
  const [confirmPay, setConfirmPay] = useState(false);
  const [confirmRevert, setConfirmRevert] = useState(false);

  const row = useLiveQuery(
    () => (rowId ? db.sessionRows.get(rowId) : undefined),
    [rowId],
  );
  const summary = useLiveQuery(
    async () => (row ? await summarizeRow(row) : undefined),
    [row],
  );
  const entries = useLiveQuery<Entry[]>(
    async () =>
      rowId ? await db.entries.where({ sessionRowId: rowId }).sortBy('at') : [],
    [rowId],
  );
  const session = useLiveQuery(
    () => (row ? db.sessions.get(row.sessionId) : undefined),
    [row?.sessionId],
  );

  if (!row || !summary) return <Sheet open={open} onClose={onClose}>{null}</Sheet>;

  const commitRate = async () => {
    if (rateDraft == null) return;
    const value = Number(rateDraft.replace(',', '.'));
    if (Number.isFinite(value) && value >= 0) {
      await updateSessionRowRate(row.id, value);
    }
    setRateDraft(null);
  };

  return (
    <>
      <Sheet
        open={open}
        onClose={onClose}
        title={
          <div className="flex items-center gap-3">
            <Avatar name={summary.workerName} src={summary.workerPhoto} size={40} />
            <div>
              <div>{summary.workerName}</div>
              <div className="mt-0.5">
                <TypeBadge type={summary.type} />
              </div>
            </div>
          </div>
        }
        footer={
          <div className="flex gap-2 justify-between items-center">
            <button className="btn-ghost" onClick={onClose}>
              {t('workerDetail.close')}
            </button>
            <div className="flex gap-2">
              {row.type !== 'driver' && row.rateModel === 'per_kg' && (
                <button
                  className="btn-secondary"
                  disabled={summary.isPaid}
                  onClick={() => setAddKgOpen(true)}
                >
                  {t('row.addKg')}
                </button>
              )}
              {summary.isPaid ? (
                <button
                  className="btn bg-amber-600 text-white hover:bg-amber-700 disabled:bg-amber-300"
                  disabled={session?.status !== 'open'}
                  onClick={() => setConfirmRevert(true)}
                >
                  {t('row.revert')}
                </button>
              ) : (
                <button
                  className="btn-primary"
                  disabled={
                    (row.type !== 'driver' &&
                      row.rateModel === 'per_kg' &&
                      summary.unpaidEntryCount === 0) ||
                    summary.amount <= 0
                  }
                  onClick={() => setConfirmPay(true)}
                >
                  {t('row.markPaid')}
                </button>
              )}
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <div className="card p-3">
              <div className="text-xs text-neutral-500">{t('today.totalKg')}</div>
              <div className="font-semibold">{formatKg(summary.totalKg, settings.weightUnit)}</div>
            </div>
            <div className="card p-3">
              <div className="text-xs text-neutral-500">{t('today.totalPaid')}</div>
              <div className="font-semibold">
                {formatMoney(summary.amount - summary.unpaidAmount, settings.currency)}
              </div>
            </div>
            <div className="card p-3">
              <div className="text-xs text-neutral-500">{t('today.totalUnpaid')}</div>
              <div className="font-semibold">{formatMoney(summary.unpaidAmount, settings.currency)}</div>
            </div>
          </div>

          {row.type === 'driver' ? (
            <div className="card p-3 space-y-1 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-neutral-500">
                  {t('addDriver.driverPayMode')}
                </span>
                <span className="font-medium">
                  {row.driverPayMode
                    ? t(DRIVER_MODE_KEY[row.driverPayMode])
                    : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-500">
                  {row.driverPayMode
                    ? t(`addDriver.driverRateLabel.${row.driverPayMode}`)
                    : t('workerDetail.flatPay')}
                </span>
                <span className="font-medium">
                  {formatMoney(row.rate, settings.currency)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-500">
                  {t('addDriver.workerPayMode')}
                </span>
                <span className="font-medium">
                  {row.workerPayMode
                    ? t(`addDriver.workerMode.${row.workerPayMode}`)
                    : '—'}
                </span>
              </div>
              {row.workerPayMode === 'flat' && (
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">
                    {t('addDriver.pickerFlatRate')}
                  </span>
                  <span className="font-medium">
                    {formatMoney(row.pickerFlatRate ?? 0, settings.currency)}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between pt-1 border-t border-neutral-100">
                <span className="text-neutral-500">
                  {t('workerDetail.driverAmount')}
                </span>
                <span className="font-semibold">
                  {formatMoney(summary.amount, settings.currency)}
                </span>
              </div>
            </div>
          ) : (
            <div>
              <label className="label">
                {row.rateModel === 'per_kg'
                  ? `${t('workerDetail.editRateForToday')} (${settings.currency}/kg)`
                  : `${t('workerDetail.flatPay')} (${settings.currency})`}
              </label>
              <input
                className="input"
                type="text"
                inputMode="decimal"
                value={rateDraft ?? String(row.rate)}
                onFocus={() => setRateDraft(String(row.rate))}
                onChange={(e) => setRateDraft(e.target.value)}
                onBlur={commitRate}
              />
            </div>
          )}

          {row.type !== 'driver' && row.rateModel === 'per_kg' && (
            <div>
              <div className="text-sm font-semibold mb-2">{t('workerDetail.history')}</div>
              {(!entries || entries.length === 0) && (
                <div className="text-sm text-neutral-500 py-6 text-center">
                  {t('workerDetail.noEntries')}
                </div>
              )}
              <ul className="divide-y divide-neutral-100">
                {(entries ?? []).map((e) => (
                  <li key={e.id} className="py-2 flex items-center justify-between text-sm">
                    <div>
                      <span className="font-medium">{formatKg(e.kg, settings.weightUnit)}</span>
                      <span className="text-neutral-500 ml-2">{formatTime(e.at)}</span>
                      {e.paymentId && (
                        <span className="badge bg-neutral-100 text-neutral-600 ml-2">
                          {t('row.paid')}
                        </span>
                      )}
                    </div>
                    {!e.paymentId && (
                      <button
                        className="btn-ghost text-red-600"
                        onClick={() => deleteEntry(e.id)}
                      >
                        {t('common.delete')}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Sheet>
      <AddKgSheet
        open={addKgOpen}
        onClose={() => setAddKgOpen(false)}
        rowId={row.id}
        workerName={summary.workerName}
      />
      <ConfirmDialog
        open={confirmPay}
        onClose={() => setConfirmPay(false)}
        onConfirm={async () => {
          await markRowPaid(row.id);
        }}
        title={t('row.confirmPaidTitle', { name: summary.workerName })}
        body={t('row.confirmPaidBody', {
          name: summary.workerName,
          amount: formatMoney(summary.unpaidAmount, settings.currency),
        })}
        confirmLabel={t('row.markPaid')}
      />
      <ConfirmDialog
        open={confirmRevert}
        onClose={() => setConfirmRevert(false)}
        onConfirm={async () => {
          await revertRowLatestPayment(row.id);
        }}
        title={t('row.confirmRevertTitle', { name: summary.workerName })}
        body={t('row.confirmRevertBody', {
          name: summary.workerName,
          amount: formatMoney(summary.amount, settings.currency),
        })}
        confirmLabel={t('row.revert')}
      />
    </>
  );
}
