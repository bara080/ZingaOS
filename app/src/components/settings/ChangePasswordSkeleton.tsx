import { Skeleton } from '@/components/ui/skeleton';

export default function ChangePasswordSkeleton() {
  return (
    <div className="space-y-4 max-w-md">
      {/* Current password */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-10 w-full" />
      </div>

      {/* New password */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-10 w-full" />
      </div>

      {/* Confirm password */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-10 w-full" />
      </div>

      {/* Button */}
      <Skeleton className="h-10 w-40" />
    </div>
  );
}
