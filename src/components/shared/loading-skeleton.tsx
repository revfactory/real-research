'use client';

import { Skeleton } from '@/components/ui/skeleton';

export function CardSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-6 space-y-3">
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  );
}

export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 rounded-lg border">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ReportSkeleton() {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-blue-50/50 dark:bg-blue-950/20 p-6 space-y-3">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-4/5" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-7 w-48 mt-6" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-6 space-y-2">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-8 w-16" />
    </div>
  );
}
