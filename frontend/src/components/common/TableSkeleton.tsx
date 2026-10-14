import React from 'react';

interface TableSkeletonProps {
  rows?: number;
  cols?: number;
  columns?: number;
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({ rows = 5, cols, columns }) => {
  const columnCount = cols ?? columns ?? 5;

  return (
    <div className="w-full bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm animate-pulse">
      {/* Table Header Skeleton */}
      <div className="flex border-b border-slate-100 bg-slate-50/50 p-4 gap-4">
        {Array.from({ length: columnCount }).map((_, i) => (
          <div key={i} className="h-4 bg-slate-200 rounded flex-1" />
        ))}
      </div>
      {/* Rows */}
      <div className="divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex p-4 gap-4 items-center">
            {Array.from({ length: columnCount }).map((_, c) => (
              <div
                key={c}
                className="h-4 bg-slate-100 rounded flex-1"
                style={{ width: `${Math.floor(Math.random() * 30 + 70)}%` }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export const LoadingSpinner: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const sizeMap = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-10 h-10 border-3',
  };

  return (
    <div
      className={`${sizeMap[size]} border-brand-primary border-t-transparent rounded-full animate-spin`}
    />
  );
};

export default TableSkeleton;
