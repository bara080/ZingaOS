import { Skeleton } from '@/components/ui/skeleton';

type Props = {
  lines?: number;
  avatar?: boolean;
  withActions?: boolean;
};

export function CardSkeleton({ lines = 2, avatar, withActions }: Props) {
  return (
    <div className="rounded-lg border p-3 space-y-3">
      <div className="flex items-start justify-between gap-3">
        {/* Left */}
        <div className="flex items-center gap-3">
          {avatar && <Skeleton className="h-8 w-8 rounded-full" />}
          <Skeleton className="h-4 w-32" />
        </div>

        {/* Actions placeholder */}
        {withActions && <Skeleton className="h-8 w-8 rounded-md" />}
      </div>

      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className="h-3 w-40" />
      ))}
    </div>
  );
}
