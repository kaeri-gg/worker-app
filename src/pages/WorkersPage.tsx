import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import { archiveWorker, createWorker, updateWorker } from '@/db/actions';
import { Sheet } from '@/components/Sheet';
import { Avatar } from '@/components/Avatar';
import { TypeBadge } from '@/components/TypeBadge';
import { WorkerForm } from '@/components/WorkerForm';
import type { Worker } from '@/db/types';
import { usePagination } from '@/hooks/usePagination';
import { Pagination } from '@/components/Pagination';
import { FilterSortBar } from '@/components/FilterSortBar';
import { DEFAULT_FILTER_SORT, type FilterSortState } from '@/lib/filterSort';

export function WorkersPage() {
  const { t } = useTranslation();
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Worker | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [search, setSearch] = useState('');
  const [fs, setFs] = useState<FilterSortState>(DEFAULT_FILTER_SORT);

  const workers = useLiveQuery(() => db.workers.toArray(), []) ?? ([] as Worker[]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return workers
      .filter((w) => showArchived || !w.archived)
      .filter((w) => (q ? w.name.toLowerCase().includes(q) : true))
      .filter((w) => (fs.role === 'all' ? true : w.type === fs.role))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [workers, showArchived, search, fs.role]);
  const pg = usePagination(filtered);

  return (
    <div>
      <header className="flex items-center justify-between mb-3">
        <h1 className="text-xl font-semibold">{t('roster.title')}</h1>
        <button className="btn-primary" onClick={() => setAddOpen(true)}>
          + {t('roster.addNew')}
        </button>
      </header>

      <div className="flex items-center gap-2 mb-3">
        <input
          className="input"
          placeholder="Search…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <label className="flex items-center gap-2 text-sm text-neutral-600 whitespace-nowrap">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
          />
          {t('roster.showArchived')}
        </label>
      </div>

      <FilterSortBar
        value={fs}
        onChange={(p) => setFs((c) => ({ ...c, ...p }))}
        showPaid={false}
        showKgSort={false}
      />

      {filtered.length === 0 ? (
        <div className="card p-6 text-center text-neutral-500">{t('roster.empty')}</div>
      ) : (
        <ul className="space-y-2">
          {pg.sliced.map((w) => (
            <li key={w.id} className="card p-3 flex items-center gap-3">
              <Avatar name={w.name} src={w.photo} size={44} />
              <div className="grow min-w-0">
                <div className="font-medium truncate flex items-center gap-2">
                  {w.name}
                  {w.archived && (
                    <span className="badge bg-neutral-100 text-neutral-500">
                      {t('roster.archived')}
                    </span>
                  )}
                </div>
                <div className="mt-1">
                  <TypeBadge type={w.type} />
                </div>
              </div>
              <div className="flex gap-2">
                <button className="btn-ghost" onClick={() => setEditing(w)}>
                  Edit
                </button>
                <button
                  className="btn-ghost text-neutral-500"
                  onClick={() => void archiveWorker(w.id, !w.archived)}
                >
                  {w.archived ? t('roster.unarchive') : t('roster.archive')}
                </button>
              </div>
            </li>
          ))}
        </ul>
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

      <Sheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title={t('addWorker.title')}
      >
        <WorkerForm
          onSubmit={async (v) => {
            await createWorker(v);
            setAddOpen(false);
          }}
          onCancel={() => setAddOpen(false)}
        />
      </Sheet>

      <Sheet
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing?.name}
      >
        {editing && (
          <WorkerForm
            initial={editing}
            onSubmit={async (v) => {
              await updateWorker(editing.id, v);
              setEditing(null);
            }}
            onCancel={() => setEditing(null)}
          />
        )}
      </Sheet>
    </div>
  );
}
