import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function UserDetailsSkeleton() {
  return (
    <div>
      <Skeleton className="h-8 w-24" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full mt-4">
        {/* LEFT */}
        <div>
          <Card>
            <CardHeader className="flex flex-col items-center text-center space-y-4 pt-8">
              <Skeleton className="h-20 w-20 rounded-full" />
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-56" />
              <Skeleton className="h-6 w-24 rounded-full" />
            </CardHeader>
          </Card>
        </div>

        {/* RIGHT */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>

            <CardContent className="divide-y">
              <div className="flex justify-between py-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-56" />
              </div>

              <div className="flex justify-between py-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-32" />
              </div>

              <div className="flex justify-between py-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-40" />
              </div>

              <div className="flex justify-end pt-6">
                <Skeleton className="h-10 w-32" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
