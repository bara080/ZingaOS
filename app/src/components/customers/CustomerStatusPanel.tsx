'use client';

import SectionBlock from '@/components/common/SectionBlock';
import KeyValue from '@/components/common/KeyValue';
import { AccountSession, Customer } from '@/lib/types';
import { formatDate } from '@/lib/utils/common';

interface Props {
  customer: Customer;
  sessions?: AccountSession[];
}

export function CustomerStatusPanel({ customer, sessions = [] }: Props) {
  const lastSession = sessions.length
    ? sessions.reduce((latest, s) =>
        new Date(s.createdAt) > new Date(latest.createdAt) ? s : latest,
      )
    : null;

  // 🔑 Count only unique devices
  const uniqueDevices = Array.from(new Set(sessions.map((s) => s.deviceInfo.trim())));

  const deviceCount = uniqueDevices.length;

  return (
    <SectionBlock title="Customer Status">
      <KeyValue label="Account Status" value={customer.isBlocked ? 'Blocked' : 'Active'} />

      <KeyValue
        label="Last Active"
        value={lastSession ? formatDate(lastSession.createdAt) : 'Never'}
      />

      <KeyValue
        label="Devices"
        value={deviceCount ? `${deviceCount} device${deviceCount > 1 ? 's' : ''}` : 'None'}
      />

      <KeyValue
        label="Notifications"
        value={customer.notificationsEnabled ? 'Enabled' : 'Disabled'}
      />

      <KeyValue label="Joined" value={customer.createdAt ? formatDate(customer.createdAt) : '-'} />
    </SectionBlock>
  );
}
