export interface OverviewSample {
  revenue: number;
  revenuePrev: number;

  activeUsers: number;
  customers: number;
  providers: number;
  stores: number;

  pendingWalletAmount: number;
  transactions: number;

  acceptedBookings: number;
  cancelledBookings: number;
  rejectedAfterAccept: number;

  signups: number;
  visits: number;

  disputes: number;
  deleted: number;

  totalOrganizations: number;
  activeOrganizations: number;

  ratings: {
    avg: number;
    count: number;
  };

  bookings: number;
  churnedCustomers: number;
  supportTickets: number;
  refunds: number;
  cac: number;
  arpu: number;
}
