import { Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('h-4 w-4 animate-spin', className)} />;
}

export function LoadingOverlay({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-gray-400">
      <Spinner className="h-6 w-6" />
      {message && <p className="text-sm">{message}</p>}
    </div>
  );
}

export function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={cn('animate-pulse rounded bg-gray-200 dark:bg-gray-800', className)} style={style} />;
}

export function SkeletonRows({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-1.5 p-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-3 w-10" />
          <Skeleton className="h-3 flex-1" />
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-14" />
        </div>
      ))}
    </div>
  );
}
