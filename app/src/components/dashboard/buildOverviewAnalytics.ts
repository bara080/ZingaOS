import type { OverviewSample } from './types';

const pct = (num: number, den: number) => (den ? (num / den) * 100 : 0);

export type OverviewAnalytics = {
  signupRate: number;
  bookingFromSignup: number;
  conversion: number;
  churnRate: number;
  refundRate: number;
  ticketPer1kUsers: number;
  disputeRate: number;
  rejectAfterAcceptRate: number;
};

export function buildOverviewAnalytics(sample: OverviewSample): OverviewAnalytics {
  return {
    signupRate: pct(sample.signups, sample.visits),
    bookingFromSignup: pct(sample.bookings, sample.signups),
    conversion: pct(sample.bookings, sample.visits),

    churnRate: pct(sample.churnedCustomers, sample.customers),
    refundRate: pct(sample.refunds, sample.transactions),
    ticketPer1kUsers: sample.activeUsers ? (sample.supportTickets / sample.activeUsers) * 1000 : 0,

    disputeRate: pct(sample.disputes, sample.transactions),
    rejectAfterAcceptRate: pct(sample.rejectedAfterAccept, sample.acceptedBookings),
  };
}
