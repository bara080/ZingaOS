'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CustomerStats } from './CustomerStats';
import { AccountSession, Customer } from '@/lib/types';
import { LinkedAccountsBlock } from './LinkedAccountsBlock';
import { CustomerStatusPanel } from './CustomerStatusPanel';
import { CustomerDevicesBlock } from './CustomerDevicesBlock';
import { formatCurrency } from '@/lib/utils/common';

interface Props {
  customer: Customer;
  linkedAccounts?: {
    stores?: string[];
    isCustomer?: boolean;
  };
  sessions?: AccountSession[];
}

export function CustomerActivityPanel({ customer, linkedAccounts, sessions = [] }: Props) {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Accounts & Activity</CardTitle>
      </CardHeader>

      <CardContent>
        <CustomerStats
          stats={[
            { label: 'Total Spent', value: formatCurrency(customer.totalSpent ?? 0) },
            { label: 'Wallet Balance', value: formatCurrency(customer.walletBalance ?? 0) },
            { label: 'Booking Requests', value: customer.bookingRequests ?? 0 },
            { label: 'Active Bookings', value: customer.activeBookings ?? 0 },
            { label: 'Completed', value: customer.completedBookings ?? 0 },
          ]}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-5">
          {/* LEFT COLUMN */}
          <div className="space-y-6">
            {/* Linked Accounts */}
            {linkedAccounts && (
              <LinkedAccountsBlock
                stores={linkedAccounts.stores}
                isCustomer={linkedAccounts.isCustomer}
              />
            )}

            {/* Devices */}
            {sessions.length > 0 && <CustomerDevicesBlock sessions={sessions} />}
          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-6">
            <CustomerStatusPanel customer={customer} sessions={sessions} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
