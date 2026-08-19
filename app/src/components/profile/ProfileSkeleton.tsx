import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProfileSkeleton() {
  return (
    <div className="max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" /> {/* "My Profile" */}
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Email field */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" /> {/* Label */}
            <Skeleton className="h-10 w-full rounded-md" />
          </div>

          {/* Display Name field */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>

          {/* Action row */}
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-32 rounded-md" />
            <Skeleton className="h-4 w-28" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
