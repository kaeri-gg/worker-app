import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import type { Session } from '@/db/types';
import { formatDate } from '@/lib/format';
import { usePagination } from '@/hooks/usePagination';
import { Pagination } from '@/components/Pagination';

interface SessionWithCounts extends Session {
  workerCount: number;
  totalKg: number;
}

export function SessionsPage() {
  const { t } = useTranslation();
  const sessions =
    useLiveQuery(
      () => db.sessions.orderBy('startedAt').reverse().toArray(),
      [],
    ) ?? ([] as Session[]);

  const enriched = useLiveQuery<SessionWithCounts[]>(
    async () => {
      const rows: SessionWithCounts[] = [];
      for (const s of sessions) {
        const [workerCount, entries] = await Promise.all([
          db.sessionRows.where({ sessionId: s.id }).count(),
          db.entries.where({ sessionId: s.id }).toArray(),
        ]);
        rows.push({
          ...s,
          workerCount,
          totalKg: entries.reduce((a, e) => a + e.kg, 0),
        });
      }
      return rows;
    },
    [sessions],
  );

  const list = enriched ?? [];
  const pg = usePagination(list);

  return (
    <div>
      <h1 className="text-xl font-semibold mb-3">{t('sessions.title')}</h1>
      {list.length === 0 ? (
        <div className="card p-6 text-center text-neutral-500">
          {t('sessions.empty')}
        </div>
      ) : (
        <ul className="space-y-2">
          {pg.sliced.map((s) => (
            <li key={s.id}>
              <Link
                to={`/sessions/${s.id}`}
                className="card p-3 flex items-center justify-between hover:bg-neutral-50"
              >
                <div>
                  <div className="font-medium">{formatDate(s.date)}</div>
                  <div className="text-xs text-neutral-500 mt-0.5">
                    {s.workerCount} {t('sessions.workers')} · {s.totalKg} kg
                  </div>
                </div>
                <span
                  className={`badge ${
                    s.status === 'open'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-neutral-100 text-neutral-600'
                  }`}
                >
                  {s.status === 'open' ? t('sessions.open') : t('sessions.closed')}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {list.length > 0 && (
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
