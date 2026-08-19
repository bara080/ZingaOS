import { Card, CardContent, CardHeader } from '@/components/ui/card';

export function CustomerDetailsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Back */}
      <div className="h-8 w-24 bg-muted rounded" />

      {/* Profile Header */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left profile */}
        <Card className="lg:col-span-2">
          <CardContent className="flex flex-col sm:flex-row gap-6">
            <div className="w-24 h-24 rounded-full bg-muted" />

            <div className="flex-1 space-y-3">
              <div className="h-6 w-48 bg-muted rounded" />
              <div className="flex gap-2 pt-2">
                <div className="h-6 w-24 bg-muted rounded-full" />
                <div className="h-6 w-24 bg-muted rounded-full" />
              </div>

              <div className="space-y-2 pt-3">
                <div className="h-4 w-2/3 bg-muted rounded" />
                <div className="h-4 w-3/4 bg-muted rounded" />
                <div className="h-4 w-1/2 bg-muted rounded" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right profile */}
        <Card>
          <CardHeader>
            <div className="h-5 w-32 bg-muted rounded" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-4 w-full bg-muted rounded" />
            <div className="h-4 w-full bg-muted rounded" />
          </CardContent>
        </Card>
      </div>

      {/* Accounts & Activity */}
      <Card>
        <CardHeader>
          <div className="h-6 w-48 bg-muted rounded" />
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-muted rounded-xl" />
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left column */}
            <div className="space-y-6">
              {/* Linked Accounts */}
              <Card>
                <CardHeader>
                  <div className="h-4 w-40 bg-muted rounded" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="h-4 w-3/4 bg-muted rounded" />
                  <div className="h-4 w-1/2 bg-muted rounded" />
                </CardContent>
              </Card>

              {/* Devices */}
              <Card>
                <CardHeader>
                  <div className="h-4 w-32 bg-muted rounded" />
                </CardHeader>
                <CardContent className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3 bg-muted/50 p-3 rounded-lg">
                      <div className="w-8 h-8 bg-muted rounded-full" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-2/3 bg-muted rounded" />
                        <div className="h-3 w-1/3 bg-muted rounded" />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Right column – Customer Status */}
            <Card>
              <CardHeader>
                <div className="h-4 w-32 bg-muted rounded" />
              </CardHeader>
              <CardContent className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex justify-between">
                    <div className="h-3 w-24 bg-muted rounded" />
                    <div className="h-3 w-20 bg-muted rounded" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
