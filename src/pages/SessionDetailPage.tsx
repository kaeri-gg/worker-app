import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import { summarizeSession, type RowSummary } from '@/db/actions';
import { Avatar } from '@/components/Avatar';
import { TypeBadge } from '@/components/TypeBadge';
import { formatDate, formatKg, formatKgShort, formatMoney } from '@/lib/format';
import { useSettings } from '@/hooks/useSettings';
import { useMemo } from 'react';
import type { DriverPayMode } from '@/db/types';

const DRIVER_MODE_KEY: Record<DriverPayMode, string> = {
  per_pax: 'addDriver.driverMode.per_pax',
  fixed: 'addDriver.driverMode.fixed',
  per_kg: 'addDriver.driverMode.per_kg',
};

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
  const totalKg = summaries
    .filter((s) => s.type !== 'driver')
    .reduce((a, s) => a + s.totalKg, 0);

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
                  <Avatar name={d.workerName} src={d.workerPhoto} size={44} />
                  <div className="grow min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-medium truncate">{d.workerName}</span>
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
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-semibold">
                      {formatMoney(d.amount, settings.currency)}
                    </div>
                    {d.isPaid ? (
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

                <div className="pl-2 border-l-2 border-neutral-100 space-y-2">
                  {workers.length === 0 ? (
                    <div className="text-sm text-neutral-500 py-2 px-1">
                      {t('today.driverEmpty')}
                    </div>
                  ) : (
                    workers.map((s) => (
                      <div key={s.rowId}>
                        <div className="flex items-center gap-3">
                          <Avatar name={s.workerName} src={s.workerPhoto} size={36} />
                          <div className="grow min-w-0">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-medium truncate">
                                {s.workerName}
                              </span>
                              <TypeBadge type={s.type} />
                            </div>
                            {s.rateModel === 'per_kg' && (
                              <div className="text-xs text-neutral-500 mt-0.5">
                                {formatKg(s.totalKg, settings.weightUnit)}
                              </div>
                            )}
                          </div>
                          <div className="text-right shrink-0">
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
                          <div className="flex flex-wrap gap-1 mt-2 pl-11">
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
                        )}
                      </div>
                    ))
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
