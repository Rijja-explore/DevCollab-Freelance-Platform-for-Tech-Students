import React from 'react';

interface LoadingSkeletonProps {
  rows?: number;
}

export const TableSkeleton: React.FC<LoadingSkeletonProps> = ({ rows = 5 }) => {
  return (
    <div className="card overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
        <div className="skeleton w-32 h-6" />
        <div className="skeleton w-20 h-8" />
      </div>
      <div className="p-6 space-y-4">
        {Array.from({ length: rows }).map((_, idx) => (
          <div key={idx} className="flex items-center justify-between gap-4 py-2 border-b border-slate-800/40 last:border-0">
            <div className="flex-1 space-y-2">
              <div className="skeleton w-1/3 h-5" />
              <div className="skeleton w-1/4 h-3.5" />
            </div>
            <div className="skeleton w-24 h-6" />
            <div className="skeleton w-16 h-8" />
          </div>
        ))}
      </div>
    </div>
  );
};

export const DetailSkeleton: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="skeleton w-1/2 h-8" />
          <div className="skeleton w-20 h-6" />
        </div>
        <div className="skeleton w-full h-24" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card p-6 space-y-4">
          <div className="skeleton w-1/3 h-6" />
          <div className="skeleton w-2/3 h-4" />
          <div className="skeleton w-1/2 h-4" />
        </div>
        <div className="card p-6 space-y-4">
          <div className="skeleton w-1/3 h-6" />
          <div className="skeleton w-full h-12" />
        </div>
      </div>
    </div>
  );
};
