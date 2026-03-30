interface LoadingSkeletonProps {
  rows?: number;
  type?: 'table' | 'cards' | 'chart';
}

export function LoadingSkeleton({ rows = 5, type = 'table' }: LoadingSkeletonProps) {
  if (type === 'cards') {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="admin-card p-6">
            <div className="skeleton h-4 w-24" />
            <div className="skeleton mt-2 h-8 w-16" />
          </div>
        ))}
      </div>
    );
  }

  if (type === 'chart') {
    return (
      <div className="admin-card p-6">
        <div className="skeleton h-4 w-32 mb-4" />
        <div className="skeleton h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="admin-card overflow-hidden">
      <div className="space-y-0">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-[var(--admin-border)] px-4 py-3">
            <div className="skeleton h-4 w-32" />
            <div className="skeleton h-4 w-24" />
            <div className="skeleton h-4 w-20" />
            <div className="skeleton h-4 w-16 ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}
