import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface PaginationProps {
  currentPage?: number;
  page?: number;
  totalPages?: number;
  totalItems?: number;
  total?: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage: propCurrentPage,
  page: propPage,
  totalPages: propTotalPages,
  totalItems: propTotalItems,
  total: propTotal,
  pageSize = 10,
  onPageChange,
}) => {
  const current = propCurrentPage ?? propPage ?? 1;
  const itemsCount = propTotalItems ?? propTotal ?? 0;
  const computedPages = propTotalPages ?? Math.max(1, Math.ceil(itemsCount / pageSize));

  if (computedPages <= 1 && itemsCount <= pageSize) {
    return (
      <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 sm:px-6">
        <p className="text-xs text-slate-500">
          Showing <span className="font-semibold text-slate-700">{itemsCount}</span> results
        </p>
      </div>
    );
  }

  const startItem = itemsCount === 0 ? 0 : (current - 1) * pageSize + 1;
  const endItem = Math.min(current * pageSize, itemsCount);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-100 px-4 py-3 sm:px-6 gap-3">
      <div className="text-xs text-slate-500">
        Showing <span className="font-semibold text-slate-700">{startItem}</span> to{' '}
        <span className="font-semibold text-slate-700">{endItem}</span> of{' '}
        <span className="font-semibold text-slate-700">{itemsCount}</span> results
      </div>

      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPageChange(current - 1)}
          disabled={current <= 1}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Previous
        </button>

        <div className="flex items-center gap-1 px-2">
          {Array.from({ length: Math.min(5, computedPages) }, (_, idx) => {
            let pageNum = idx + 1;
            if (computedPages > 5 && current > 3) {
              pageNum = current - 2 + idx;
              if (pageNum > computedPages) pageNum = computedPages - 4 + idx;
            }
            if (pageNum <= 0 || pageNum > computedPages) return null;

            return (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                className={`w-8 h-8 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  current === pageNum
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => onPageChange(current + 1)}
          disabled={current >= computedPages}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          Next
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
