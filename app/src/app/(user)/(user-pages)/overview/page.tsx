'use client';

import { useOverviewRevenue } from '@/components/dashboard/useOverviewRevenue';
import { OverviewKpisSection } from '@/components/dashboard/OverviewKpisSection';
import { OverviewInsightsSection } from '@/components/dashboard/OverviewInsightsSection';
import { OverviewChartsSection } from '@/components/dashboard/OverviewChartsSection';
import { useOverviewDashboard } from '@/components/dashboard/useOverviewDashboard';
import DashboardTabs from '@/components/dashboard/DashboardTabs';
import type { OverviewSample } from '@/components/dashboard/types';
import { PlatformHealthSection } from '@/components/dashboard/PlatformHealthSection';

export default function OverviewPage() {
  const revenue = useOverviewRevenue();
  const { data, isLoading } = useOverviewDashboard();

  const overviewData: OverviewSample = {
    // Revenue
    revenue: revenue.totals.current ?? 0,
    revenuePrev: revenue.totals.previous ?? 0,

    // Users
    activeUsers: data?.users.activeUsers ?? 0,
    customers: data?.users.customers ?? 0,
    providers: data?.users.providers ?? 0,
    stores: data?.users.stores ?? 0,

    // Wallet / Transactions ✅ FIXED
    pendingWalletAmount: data?.wallets.pendingWalletAmount ?? 0,
    transactions: data?.wallets.transactions ?? 0,

    // Bookings
    acceptedBookings: data?.bookings.acceptedBookings ?? 0,
    cancelledBookings: data?.bookings.cancelledBookings ?? 0,
    rejectedAfterAccept: data?.bookings.rejectedAfterAccept ?? 0,

    // Signup rate
    signups: data?.signups.signups ?? 0,
    visits: data?.signups.visits ?? 0,

    // Explicitly disabled
    disputes: 0,
    deleted: 0,

    // Future
    totalOrganizations: data?.meta.totalOrganizations ?? 0,
    activeOrganizations: data?.meta.activeOrganizations ?? 0,

    // Optional placeholders
    ratings: { avg: 0, count: 0 },
    bookings: 0,
    churnedCustomers: 0,
    supportTickets: 0,
    refunds: 0,
    cac: 0,
    arpu: 0,
  };

  return (
    <div className="space-y-6">
      <DashboardTabs />

      <OverviewKpisSection
        overviewData={overviewData}
        revenue={overviewData.revenue}
        revenuePrev={overviewData.revenuePrev}
        loading={isLoading || revenue.isLoading}
      />

      <OverviewInsightsSection sample={overviewData} />

      <OverviewChartsSection revenueData={revenue.chartData} loading={revenue.isLoading} />

      <PlatformHealthSection />
    </div>
  );
}
