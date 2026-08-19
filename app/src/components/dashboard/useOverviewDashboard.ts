'use client';

import { useQuery } from '@tanstack/react-query';

export type OverviewDashboard = {
  users: {
    customers: number;
    providers: number;
    activeUsers: number;
    stores: number;
  };

  signups: {
    signups: number;
    visits: number;
  };

  bookings: {
    acceptedBookings: number;
    cancelledBookings: number;
    rejectedAfterAccept: number;
  };

  wallets: {
    pendingWalletAmount: number;
    transactions: number;
  };

  meta: {
    disputes: number;
    deleted: number;
    totalOrganizations: number;
    activeOrganizations: number;
  };
};

export function useOverviewDashboard() {
  return useQuery<OverviewDashboard>({
    queryKey: ['overview-dashboard'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/overview');
      if (!res.ok) throw new Error('Failed to fetch overview dashboard');
      return res.json();
    },
    staleTime: 60_000,
  });
}
