import { useEffect, useMemo, useState } from 'react';

export const PAGE_SIZES = [10, 20, 40] as const;
export type PageSize = (typeof PAGE_SIZES)[number];

export interface UsePaginationResult<T> {
  page: number;
  pageSize: PageSize;
  pageCount: number;
  total: number;
  start: number;
  end: number;
  sliced: T[];
  setPage: (n: number) => void;
  setPageSize: (n: PageSize) => void;
  next: () => void;
  prev: () => void;
  canPrev: boolean;
  canNext: boolean;
}

export function usePagination<T>(
  items: T[],
  initialPageSize: PageSize = 10,
): UsePaginationResult<T> {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(initialPageSize);

  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const clampedPage = Math.min(page, pageCount);
  const start = total === 0 ? 0 : (clampedPage - 1) * pageSize;
  const end = Math.min(total, start + pageSize);

  const sliced = useMemo(() => items.slice(start, end), [items, start, end]);

  const handleSetPageSize = (n: PageSize) => {
    setPageSize(n);
    setPage(1);
  };

  return {
    page: clampedPage,
    pageSize,
    pageCount,
    total,
    start,
    end,
    sliced,
    setPage,
    setPageSize: handleSetPageSize,
    next: () => setPage((p) => Math.min(pageCount, p + 1)),
    prev: () => setPage((p) => Math.max(1, p - 1)),
    canPrev: clampedPage > 1,
    canNext: clampedPage < pageCount,
  };
}
