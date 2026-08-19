'use client';

import SectionBlock from '@/components/common/SectionBlock';
import { formatDate } from '@/lib/utils/common';
import { Smartphone, Laptop, Monitor } from 'lucide-react';

interface Session {
  deviceInfo: string;
  createdAt: string;
}

interface Props {
  sessions: Session[];
}

/* Detect device type for icon */
function getDeviceIcon(device: string) {
  const d = device.toLowerCase();
  if (d.includes('iphone') || d.includes('android')) return Smartphone;
  if (d.includes('mac') || d.includes('windows') || d.includes('linux')) return Laptop;
  return Monitor;
}

export function CustomerDevicesBlock({ sessions }: Props) {
  // Deduplicate by device and keep latest activity
  const devices = Object.values(
    sessions.reduce<Record<string, Session>>((acc, session) => {
      const key = session.deviceInfo.trim();
      if (!acc[key] || new Date(session.createdAt) > new Date(acc[key].createdAt)) {
        acc[key] = session;
      }
      return acc;
    }, {}),
  ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (!devices.length) return null;

  return (
    <SectionBlock title={`Devices (${devices.length})`}>
      <div className="space-y-2">
        {devices.map((device, idx) => {
          const Icon = getDeviceIcon(device.deviceInfo);

          return (
            <div key={idx} className="group flex items-center gap-3 rounded-xl border p-3">
              {/* Icon */}
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground group-hover:text-foreground">
                <Icon className="h-4 w-4" />
              </div>

              {/* Device Info */}
              <div className="flex flex-1 flex-col overflow-hidden">
                <span className="truncate text-sm font-medium">{device.deviceInfo}</span>
                <span className="text-xs text-muted-foreground">
                  Last active · {formatDate(device.createdAt)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </SectionBlock>
  );
}
