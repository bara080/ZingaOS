'use client';

import AppBarChart from '@/components/charts/AppBarChart';
import AppAreaChart from '@/components/charts/AppAreaChart';
import AppPieChart from '@/components/charts/AppPieChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function OverviewChartsSection({
  revenueData,
  loading,
}: {
  revenueData: { label: string; value: number }[];
  loading: boolean;
}) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <Card className="bg-primary-foreground">
        <CardHeader>
          <CardTitle>Revenue (MoM)</CardTitle>
        </CardHeader>
        <CardContent>
          <AppBarChart data={revenueData} loading={loading} />
        </CardContent>
      </Card>

      <Card className="bg-primary-foreground">
        <CardHeader>
          <CardTitle>Users (30d)</CardTitle>
        </CardHeader>
        <CardContent>
          <AppAreaChart />
        </CardContent>
      </Card>

      <Card className="bg-primary-foreground">
        <CardHeader>
          <CardTitle>Bookings by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <AppPieChart />
        </CardContent>
      </Card>
    </div>
  );
}
