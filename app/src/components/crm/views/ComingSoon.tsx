'use client';

// Placeholder for CRM views not yet built. Names the next build step so the
// scaffold is honest about what's real vs pending (see docs/outreach-crm-plan.md).
import type { LucideIcon } from 'lucide-react';
import { C } from '@/components/operator/theme';

export function ComingSoon({
  title,
  icon: Icon,
  note,
}: {
  title: string;
  icon: LucideIcon;
  note?: string;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        minHeight: '60vh',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          border: `1px solid ${C.line}`,
          background: C.panel2,
          display: 'grid',
          placeItems: 'center',
          color: C.teal,
        }}
      >
        <Icon size={22} />
      </div>
      <div style={{ fontFamily: C.sans, fontSize: 16, fontWeight: 600, color: C.ink }}>{title}</div>
      <div style={{ fontFamily: C.mono, fontSize: 11.5, color: C.ink3, maxWidth: 380, lineHeight: 1.6 }}>
        {note ?? 'Planned in docs/outreach-crm-plan.md. Built vertically after the DM Queue.'}
      </div>
    </div>
  );
}
