import { useTranslation } from 'react-i18next';
import { Sheet } from './Sheet';
import { WORKER_TYPES, type WorkerType } from '@/db/types';
import type { SortMode } from '@/lib/filterSort';

interface Props {
  open: boolean;
  onClose: () => void;
  roles: Set<WorkerType>;
  onRolesChange: (roles: Set<WorkerType>) => void;
  sort: SortMode;
  onSortChange: (sort: SortMode) => void;
}

export function FilterSheet({
  open,
  onClose,
  roles,
  onRolesChange,
  sort,
  onSortChange,
}: Props) {
  const { t } = useTranslation();
  const allSelected = roles.size === WORKER_TYPES.length || roles.size === 0;

  const toggleAll = () => {
    onRolesChange(allSelected ? new Set() : new Set(WORKER_TYPES));
  };

  const toggle = (wt: WorkerType) => {
    const next = new Set(roles.size === 0 ? WORKER_TYPES : roles);
    if (next.has(wt)) next.delete(wt);
    else next.add(wt);
    onRolesChange(next);
  };

  const reset = () => {
    onRolesChange(new Set());
    onSortChange('alpha');
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('filter.title')}
      footer={
        <div className="flex gap-2 justify-between">
          <button className="btn-ghost text-neutral-500" onClick={reset}>
            {t('filter.reset')}
          </button>
          <button className="btn-primary" onClick={onClose}>
            {t('filter.apply')}
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        <div>
          <div className="label">{t('filter.roles')}</div>
          <label className="flex items-center gap-3 py-2 border-b border-neutral-100">
            <input
              type="checkbox"
              className="h-4 w-4 accent-brand-700"
              checked={allSelected}
              onChange={toggleAll}
            />
            <span className="font-medium">{t('filter.all')}</span>
          </label>
          {WORKER_TYPES.map((wt) => (
            <label
              key={wt}
              className="flex items-center gap-3 py-2 border-b border-neutral-100 last:border-0"
            >
              <input
                type="checkbox"
                className="h-4 w-4 accent-brand-700"
                checked={roles.size === 0 || roles.has(wt)}
                onChange={() => toggle(wt)}
              />
              <span>{t(`worker.type.${wt}`)}</span>
            </label>
          ))}
        </div>

        <div>
          <div className="label">{t('sort.label')}</div>
          {(['alpha', 'kg_desc', 'kg_asc'] as const).map((mode) => (
            <label
              key={mode}
              className="flex items-center gap-3 py-2 border-b border-neutral-100 last:border-0"
            >
              <input
                type="radio"
                name="sort-mode"
                className="h-4 w-4 accent-brand-700"
                checked={sort === mode}
                onChange={() => onSortChange(mode)}
              />
              <span>
                {mode === 'alpha'
                  ? t('sort.alpha')
                  : mode === 'kg_desc'
                    ? t('sort.kgDesc')
                    : t('sort.kgAsc')}
              </span>
            </label>
          ))}
        </div>
      </div>
    </Sheet>
  );
}
