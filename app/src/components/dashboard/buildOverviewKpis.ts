import {
  DollarSign,
  Users,
  UserCheck,
  Receipt,
  Ban,
  BookX,
  Handshake,
  UserMinus,
  Star,
  Store,
  Building2,
  Wallet,
} from 'lucide-react';
import { KpiConfig } from '@/components/dashboard/KpiGrid';
import type { OverviewSample } from './types';

const pct = (num?: number, den?: number) => (num && den ? (num / den) * 100 : 0);
const fmt = (n?: number) => (typeof n === 'number' ? n.toLocaleString() : '—');
const money = (n?: number) =>
  typeof n === 'number'
    ? n.toLocaleString(undefined, {
        style: 'currency',
        currency: 'USD',
      })
    : '—';

export function buildOverviewKpis(sample: OverviewSample): KpiConfig[] {
  const signupRate =
    typeof sample.visits === 'number' && sample.visits > 0
      ? `${pct(sample.signups, sample.visits).toFixed(2)}%`
      : '—';

  return [
    {
      key: 'revenue',
      title: 'Total Revenue',
      value: money(sample.revenue),
      changeValue: pct(sample.revenue - sample.revenuePrev, sample.revenuePrev),
      changeText: 'MoM',
      Icon: DollarSign,
    },
    {
      key: 'active-users',
      title: 'Active Users',
      value: fmt(sample.activeUsers),
      changeText: 'rolling 7 days',
      Icon: Users,
    },
    {
      key: 'customers',
      title: 'Total Customers',
      value: fmt(sample.customers),
      changeText: 'lifetime',
      Icon: UserCheck,
    },
    {
      key: 'providers',
      title: 'Service Providers',
      value: fmt(sample.providers),
      changeText: 'active',
      Icon: UserCheck,
    },
    {
      key: 'transactions',
      title: 'Transactions',
      value: fmt(sample.transactions),
      changeText: 'last 30 days',
      Icon: Receipt,
    },
    {
      key: 'dispute-rate',
      title: 'Dispute Rate',
      value: `${pct(sample.disputes, sample.transactions).toFixed(2)}%`,
      changeText: `${fmt(sample.disputes)} disputes`,
      Icon: Ban,
    },
    {
      key: 'deleted',
      title: 'Deleted Records',
      value: fmt(sample.deleted),
      changeText: 'last 30 days',
      Icon: BookX,
    },
    {
      key: 'signup-rate',
      title: 'Signup Rate',
      value: signupRate,
      changeText:
        typeof sample.visits === 'number'
          ? `${fmt(sample.signups)} / ${fmt(sample.visits)} visits`
          : 'Visits not tracked',
    },
    {
      key: 'accepted',
      title: 'Accepted Bookings',
      value: fmt(sample.acceptedBookings),
      changeText: 'MoM',
      Icon: Handshake,
    },
    {
      key: 'cancel-rate',
      title: 'Cancelled Bookings',
      value: `${pct(sample.cancelledBookings, sample.bookings).toFixed(2)}%`,
      changeText: `${fmt(sample.cancelledBookings)} of ${fmt(sample.bookings)}`,
      Icon: BookX,
    },
    {
      key: 'rejected-after-accept',
      title: 'Rejected After Acceptance',
      value: `${pct(sample.rejectedAfterAccept, sample.acceptedBookings).toFixed(2)}%`,
      changeText: `${fmt(sample.rejectedAfterAccept)} of ${fmt(sample.acceptedBookings)}`,
      Icon: UserMinus,
    },
    {
      key: 'rating',
      title: 'Avg. Customer Rating',
      value: `${sample.ratings.avg.toFixed(1)} / 5`,
      changeText: `${fmt(sample.ratings.count)} ratings`,
      Icon: Star,
    },
    {
      key: 'stores',
      title: 'Total Stores',
      value: fmt(sample.stores),
      changeText: 'active',
      Icon: Store,
    },
    {
      key: 'total-organizations',
      title: 'Total Organizations',
      value: fmt(sample.totalOrganizations),
      changeText: 'registered',
      Icon: Building2,
    },
    {
      key: 'active-organizations',
      title: 'Active Organizations',
      value: fmt(sample.activeOrganizations),
      changeText: 'currently active',
      Icon: Building2,
    },
    {
      key: 'pending-wallet',
      title: 'Pending Wallet Amount',
      value: money(sample.pendingWalletAmount),
      changeText: 'awaiting settlement',
      Icon: Wallet,
    },
  ];
}
