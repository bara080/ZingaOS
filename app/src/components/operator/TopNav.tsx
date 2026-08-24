'use client';

// Reusable Zinga OS top navigation bar. Shared shape for every console surface
// (Knowledge Graph / System Tree / Neural Map / Operator). `current` highlights
// the active destination. The static console pages link here via plain hrefs;
// the operator uses it as the React header.
import { C } from './theme';
import { ProfileMenu } from './ProfileMenu';

export type ConsoleDest = 'graph' | 'tree' | 'neural' | 'operator' | 'crm';

// `standalone` links are visually separated from the console group by a divider
// — CRM is its own product surface, not part of the OS internals.
const LINKS: { key: ConsoleDest; label: string; href: string; standalone?: boolean }[] = [
  { key: 'graph', label: 'Knowledge Graph', href: '/console/graph.html' },
  { key: 'tree', label: 'System Tree', href: '/console/tree.html' },
  { key: 'neural', label: 'Neural Map', href: '/console/neural.html' },
  { key: 'operator', label: 'Operator', href: '/operator' },
  { key: 'crm', label: 'CRM', href: '/crm', standalone: true },
];

export function TopNav({ current, note }: { current: ConsoleDest; note?: string }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 4,
        alignItems: 'center',
        padding: '9px 16px',
        borderBottom: `1px solid ${C.line}`,
        fontFamily: C.mono,
        background: 'rgba(10,12,16,0.7)',
        backdropFilter: 'blur(6px)',
        position: 'sticky',
        top: 0,
        zIndex: 20,
      }}
    >
      <span
        style={{
          fontSize: 12,
          letterSpacing: '0.14em',
          marginRight: 12,
          display: 'flex',
          gap: 7,
          alignItems: 'center',
          color: C.ink,
        }}
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: C.teal,
            boxShadow: `0 0 10px ${C.teal}`,
          }}
        />
        ZINGA OS
      </span>
      {LINKS.map((l) => {
        const cur = l.key === current;
        return (
          <span key={l.key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {l.standalone && (
              <span
                aria-hidden
                style={{
                  width: 1,
                  height: 18,
                  background: C.line,
                  margin: '0 8px',
                }}
              />
            )}
            <a
              href={l.href}
              style={{
                fontSize: 11.5,
                color: cur ? C.bg : C.ink2,
                textDecoration: 'none',
                padding: '6px 10px',
                borderRadius: 7,
                background: cur ? C.teal : 'transparent',
                fontWeight: cur ? 600 : 400,
              }}
            >
              {l.label}
            </a>
          </span>
        );
      })}
      <span style={{ flex: 1 }} />
      <span
        style={{
          color: C.ink3,
          fontSize: 10,
          display: 'flex',
          gap: 7,
          alignItems: 'center',
          marginRight: 12,
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: C.green,
            boxShadow: `0 0 8px ${C.green}`,
          }}
        />
        {note ?? 'authenticated · sends live from the server'}
      </span>
      <ProfileMenu />
    </div>
  );
}
