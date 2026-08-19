'use client';

import SectionBlock from '@/components/common/SectionBlock';
import KeyValue from '@/components/common/KeyValue';
import { formatDate } from '@/lib/utils/common';
import { AccountSession } from '@/lib/types';

interface Props {
  store: {
    isBlocked?: boolean;
    createdAt?: string;
    updatedAt?: string;
  };
  sessions?: AccountSession[];
}

export function StoreStatusPanel({ store, sessions = [] }: Props) {
  const lastSession = sessions.length
    ? sessions.reduce((latest, s) =>
        new Date(s.createdAt) > new Date(latest.createdAt) ? s : latest,
      )
    : null;

  const uniqueDevices = Array.from(new Set(sessions.map((s) => s.deviceInfo.trim())));

  const deviceCount = uniqueDevices.length;

  return (
    <SectionBlock title="Store Status">
      <KeyValue label="Store Status" value={store.isBlocked ? 'Blocked' : 'Active'} />

      <KeyValue
        label="Last Active"
        value={lastSession ? formatDate(lastSession.createdAt) : 'Never'}
      />

      <KeyValue
        label="Devices"
        value={deviceCount ? `${deviceCount} device${deviceCount > 1 ? 's' : ''}` : 'None'}
      />

      <KeyValue label="Created" value={store.createdAt ? formatDate(store.createdAt) : '-'} />

      <KeyValue label="Last Updated" value={store.updatedAt ? formatDate(store.updatedAt) : '-'} />
    </SectionBlock>
  );
}
