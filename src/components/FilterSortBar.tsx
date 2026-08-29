import { useTranslation } from 'react-i18next';
import type {
  FilterSortState,
  PaidFilter,
  RoleFilter,
  SortMode,
} from '@/lib/filterSort';
import { WORKER_TYPES } from '@/db/types';

interface Props {
  value: FilterSortState;
  onChange: (patch: Partial<FilterSortState>) => void;
  showRole?: boolean;
  showPaid?: boolean;
  showKgSort?: boolean;
}

export function FilterSortBar({
  value,
  onChange,
  showRole = true,
  showPaid = true,
  showKgSort = true,
}: Props) {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-3 gap-2 mb-3">
      {showRole ? (
        <select
          className="input py-1.5 text-sm"
          value={value.role}
          onChange={(e) => onChange({ role: e.target.value as RoleFilter })}
          aria-label={t('filter.role')}
        >
          <option value="all">{t('filter.allRoles')}</option>
          {WORKER_TYPES.map((wt) => (
            <option key={wt} value={wt}>
              {t(`worker.type.${wt}`)}
            </option>
          ))}
        </select>
      ) : (
        <span />
      )}

      {showPaid ? (
        <select
          className="input py-1.5 text-sm"
          value={value.paid}
          onChange={(e) => onChange({ paid: e.target.value as PaidFilter })}
          aria-label={t('filter.status')}
        >
          <option value="all">{t('filter.allStatus')}</option>
          <option value="unpaid">{t('row.unpaid')}</option>
          <option value="paid">{t('row.paid')}</option>
        </select>
      ) : (
        <span />
      )}

      <select
        className="input py-1.5 text-sm"
        value={value.sort}
        onChange={(e) => onChange({ sort: e.target.value as SortMode })}
        aria-label={t('sort.label')}
      >
        <option value="alpha">{t('sort.alpha')}</option>
        {showKgSort && (
          <>
            <option value="kg_desc">{t('sort.kgDesc')}</option>
            <option value="kg_asc">{t('sort.kgAsc')}</option>
          </>
        )}
      </select>
    </div>
  );
}
