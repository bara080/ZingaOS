import { Skeleton } from '@/components/ui/skeleton';

export function AvatarSkeleton({ size = 8 }: { size?: number }) {
  return <Skeleton className={`h-${size} w-${size} rounded-full`} />;
}

export function LineSkeleton({ w = 'w-32', h = 'h-4' }: { w?: string; h?: string }) {
  return <Skeleton className={`${h} ${w}`} />;
}
