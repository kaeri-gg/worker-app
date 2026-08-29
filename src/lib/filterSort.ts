import type { WorkerType } from '@/db/types';

export type RoleFilter = 'all' | WorkerType;
export type PaidFilter = 'all' | 'paid' | 'unpaid';
export type SortMode = 'alpha' | 'kg_desc' | 'kg_asc';

export interface FilterSortState {
  role: RoleFilter;
  paid: PaidFilter;
  sort: SortMode;
}

export const DEFAULT_FILTER_SORT: FilterSortState = {
  role: 'all',
  paid: 'all',
  sort: 'alpha',
};

export interface RowLike {
  workerName: string;
  type: WorkerType;
  totalKg: number;
  isPaid?: boolean;
}

export function applyFilterSort<T extends RowLike>(
  items: T[],
  state: FilterSortState,
  opts: { paidLast?: boolean } = {},
): T[] {
  const filtered = items.filter((item) => {
    if (state.role !== 'all' && item.type !== state.role) return false;
    if (state.paid === 'paid' && !item.isPaid) return false;
    if (state.paid === 'unpaid' && item.isPaid) return false;
    return true;
  });

  const paidLastActive = opts.paidLast && state.sort === 'alpha';
  const sorted = [...filtered].sort((a, b) => {
    if (paidLastActive && (a.isPaid ?? false) !== (b.isPaid ?? false)) {
      return a.isPaid ? 1 : -1;
    }
    switch (state.sort) {
      case 'alpha':
        return a.workerName.localeCompare(b.workerName);
      case 'kg_desc':
        return b.totalKg - a.totalKg;
      case 'kg_asc':
        return a.totalKg - b.totalKg;
    }
  });

  return sorted;
}
