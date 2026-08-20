'use client';

// Scaffold panel for social platforms with no backend yet (Facebook / X / TikTok).
// Renders a clear "integration pending" state — no fetches, no dead controls.
import type { LucideIcon } from 'lucide-react';
import { Card, Eyebrow } from './ui';
import { C } from './theme';

export function PlaceholderPanel({
  name,
  icon: Icon,
}: {
  name: string;
  icon: LucideIcon;
}) {
  return (
    <div style={{ width: '100%' }}>
      <Eyebrow style={{ marginTop: 4 }}>{name}</Eyebrow>
      <Card
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 14,
          padding: '54px 20px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: 54,
            height: 54,
            borderRadius: 14,
            background: C.panel2,
            border: `1px solid ${C.line}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: C.ink3,
          }}
        >
          <Icon size={26} />
        </div>
        <div style={{ fontFamily: C.mono, fontSize: 13, color: C.ink }}>
          {name} — not connected yet
        </div>
        <div style={{ fontFamily: C.mono, fontSize: 11.5, color: C.ink3, maxWidth: 360, lineHeight: 1.6 }}>
          Integration pending. Once the {name} API is wired up, conversations and
          posting controls will appear here.
        </div>
        <span
          style={{
            fontFamily: C.mono,
            fontSize: 10,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: C.amber,
            padding: '5px 12px',
            borderRadius: 20,
            border: `1px solid ${C.line}`,
            background: 'rgba(230,178,76,0.06)',
          }}
        >
          integration pending
        </span>
      </Card>
    </div>
  );
}
