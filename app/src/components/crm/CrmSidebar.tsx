'use client';

// CRM left navigation. Dense, Linear/Attio-style. Highlights the active view.
import { CRM_NAV, type CrmView } from './nav';
import { C } from '@/components/operator/theme';

export function CrmSidebar({
  active,
  onSelect,
}: {
  active: CrmView;
  onSelect: (v: CrmView) => void;
}) {
  return (
    <aside
      style={{
        width: 210,
        flexShrink: 0,
        borderRight: `1px solid ${C.line}`,
        minHeight: 'calc(100vh - 40px)',
        padding: '14px 10px',
        position: 'sticky',
        top: 40,
        alignSelf: 'flex-start',
      }}
    >
      <div
        style={{
          fontFamily: C.mono,
          fontSize: 9.5,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: C.ink3,
          padding: '2px 8px 12px',
        }}
      >
        CRM
      </div>
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {CRM_NAV.map((item) => {
          const on = item.key === active;
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              onClick={() => onSelect(item.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                textAlign: 'left',
                padding: '8px 10px',
                borderRadius: 8,
                border: '1px solid transparent',
                background: on ? 'rgba(47,217,201,0.10)' : 'transparent',
                color: on ? C.teal : C.ink2,
                fontFamily: C.sans,
                fontSize: 13,
                fontWeight: on ? 600 : 500,
                cursor: 'pointer',
                transition: 'background 120ms',
              }}
            >
              <Icon size={16} strokeWidth={2} />
              {item.label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
