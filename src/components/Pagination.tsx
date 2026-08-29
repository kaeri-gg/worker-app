import { PAGE_SIZES, type PageSize } from '@/hooks/usePagination';

interface Props {
  page: number;
  pageSize: PageSize;
  pageCount: number;
  total: number;
  start: number;
  end: number;
  canPrev: boolean;
  canNext: boolean;
  onPageSizeChange: (n: PageSize) => void;
  onPrev: () => void;
  onNext: () => void;
}

export function Pagination({
  page,
  pageSize,
  pageCount,
  total,
  start,
  end,
  canPrev,
  canNext,
  onPageSizeChange,
  onPrev,
  onNext,
}: Props) {
  if (total === 0) return null;
  return (
    <div className="mt-4 flex flex-col gap-2 items-stretch">
      <div className="flex items-center justify-between text-xs text-neutral-500">
        <span>
          {start + 1}–{end} / {total}
        </span>
        <span>
          {page} / {pageCount}
        </span>
      </div>
      <div className="flex gap-1">
        {PAGE_SIZES.map((n) => (
          <button
            key={n}
            onClick={() => onPageSizeChange(n)}
            className={`btn flex-1 text-xs ${
              pageSize === n
                ? 'bg-brand-700 text-white'
                : 'bg-neutral-100 text-neutral-700'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <button
          onClick={onPrev}
          disabled={!canPrev}
          className="btn-secondary flex-1"
        >
          ← Prev
        </button>
        <button
          onClick={onNext}
          disabled={!canNext}
          className="btn-secondary flex-1"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
