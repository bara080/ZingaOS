'use client';

// CRM left navigation. Dense, Linear/Attio-style. Highlights the active view.
// Collapsible: shrinks to an icon rail (labels hidden, tooltips via title). The
// collapse preference is owned + persisted by CrmShell.
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { CRM_NAV, type CrmView } from './nav';
import { C } from '@/components/operator/theme';

export function CrmSidebar({
  active,
  onSelect,
  collapsed,
  onToggle,
}: {
  active: CrmView;
  onSelect: (v: CrmView) => void;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const ToggleIcon = collapsed ? PanelLeftOpen : PanelLeftClose;

  return (
    <aside
      style={{
        width: collapsed ? 60 : 210,
        flexShrink: 0,
        borderRight: `1px solid ${C.line}`,
        minHeight: 'calc(100vh - 40px)',
        padding: collapsed ? '14px 8px' : '14px 10px',
        position: 'sticky',
        top: 40,
        alignSelf: 'flex-start',
        transition: 'width 160ms ease, padding 160ms ease',
      }}
    >
      {/* Header row: section label + collapse toggle */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          padding: collapsed ? '2px 0 12px' : '2px 4px 12px 8px',
        }}
      >
        {!collapsed && (
          <span
            style={{
              fontFamily: C.mono,
              fontSize: 9.5,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: C.ink3,
            }}
          >
            CRM
          </span>
        )}
        <button
          onClick={onToggle}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 26,
            height: 26,
            borderRadius: 7,
            border: '1px solid transparent',
            background: 'transparent',
            color: C.ink3,
            cursor: 'pointer',
            transition: 'background 120ms, color 120ms',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
            e.currentTarget.style.color = C.ink2;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = C.ink3;
          }}
        >
          <ToggleIcon size={16} strokeWidth={2} />
        </button>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {CRM_NAV.map((item) => {
          const on = item.key === active;
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              onClick={() => onSelect(item.key)}
              title={collapsed ? item.label : undefined}
              aria-label={item.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: collapsed ? 'center' : 'flex-start',
                gap: collapsed ? 0 : 10,
                textAlign: 'left',
                padding: collapsed ? '9px 0' : '8px 10px',
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
              <Icon size={16} strokeWidth={2} style={{ flexShrink: 0 }} />
              {!collapsed && item.label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
