'use client';

// Collapsible operator sidebar with lucide-react icons. Collapse state persists
// to localStorage. "Social Media" is an expandable group with per-platform
// sub-items (Instagram / Facebook / X / TikTok).
import { useEffect, useState } from 'react';
import {
  BarChart3,
  ChevronDown,
  ChevronRight,
  Facebook,
  Instagram,
  Mail,
  Music2,
  PanelLeftClose,
  PanelLeftOpen,
  Radar,
  Share2,
  Twitter,
  type LucideIcon,
} from 'lucide-react';
import { C } from './theme';
import type { OperatorTab } from './tabs';

const COLLAPSE_KEY = 'zinga.operator.sidebar.collapsed';
const SOCIAL_OPEN_KEY = 'zinga.operator.sidebar.socialOpen';

type Item = { tab: OperatorTab; label: string; icon: LucideIcon };

const TOP: Item[] = [
  { tab: 'scrape', label: 'Scrape', icon: Radar },
  { tab: 'analytics', label: 'Analytics', icon: BarChart3 },
  { tab: 'email', label: 'Email', icon: Mail },
];

const SOCIAL: Item[] = [
  { tab: 'ig', label: 'Instagram', icon: Instagram },
  { tab: 'facebook', label: 'Facebook', icon: Facebook },
  { tab: 'x', label: 'X', icon: Twitter },
  { tab: 'tiktok', label: 'TikTok', icon: Music2 },
];

export function Sidebar({
  active,
  onSelect,
}: {
  active: OperatorTab;
  onSelect: (tab: OperatorTab) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [socialOpen, setSocialOpen] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem(COLLAPSE_KEY) === '1');
    setSocialOpen(localStorage.getItem(SOCIAL_OPEN_KEY) !== '0');
    setHydrated(true);
  }, []);

  const toggleCollapse = () => {
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0');
      return next;
    });
  };
  const toggleSocial = () => {
    setSocialOpen((s) => {
      const next = !s;
      localStorage.setItem(SOCIAL_OPEN_KEY, next ? '1' : '0');
      return next;
    });
  };

  const socialActive = SOCIAL.some((s) => s.tab === active);
  const width = collapsed ? 62 : 232;

  const row = (item: Item, opts?: { indent?: boolean }) => {
    const on = active === item.tab;
    const Icon = item.icon;
    return (
      <button
        key={item.tab}
        onClick={() => onSelect(item.tab)}
        title={item.label}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 11,
          width: '100%',
          fontFamily: C.mono,
          fontSize: 12,
          letterSpacing: '0.03em',
          padding: opts?.indent && !collapsed ? '9px 12px 9px 30px' : '10px 12px',
          borderRadius: 9,
          color: on ? C.bg : C.ink2,
          background: on ? C.teal : 'transparent',
          fontWeight: on ? 600 : 400,
          border: '1px solid transparent',
          cursor: 'pointer',
          justifyContent: collapsed ? 'center' : 'flex-start',
          textAlign: 'left',
        }}
        onMouseEnter={(e) => {
          if (!on) e.currentTarget.style.background = C.panel2;
        }}
        onMouseLeave={(e) => {
          if (!on) e.currentTarget.style.background = 'transparent';
        }}
      >
        <Icon size={16} style={{ flex: '0 0 16px' }} />
        {!collapsed && <span>{item.label}</span>}
      </button>
    );
  };

  return (
    <aside
      style={{
        width,
        flex: `0 0 ${width}px`,
        position: 'sticky',
        top: 41,
        alignSelf: 'flex-start',
        maxHeight: 'calc(100vh - 41px)',
        overflow: 'auto',
        padding: '16px 12px',
        borderRight: `1px solid ${C.line}`,
        background: 'rgba(10,12,16,0.5)',
        transition: 'width 0.18s ease',
        visibility: hydrated ? 'visible' : 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          marginBottom: 14,
          padding: '0 2px',
        }}
      >
        {!collapsed && (
          <span
            style={{
              fontFamily: C.mono,
              fontSize: 10,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: C.ink3,
            }}
          >
            Operator
          </span>
        )}
        <button
          onClick={toggleCollapse}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{
            display: 'flex',
            background: 'transparent',
            border: 'none',
            color: C.ink3,
            cursor: 'pointer',
            padding: 2,
          }}
        >
          {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {TOP.map((i) => row(i))}

        {/* Social Media group */}
        <button
          onClick={collapsed ? () => onSelect('ig') : toggleSocial}
          title="Social Media"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 11,
            width: '100%',
            fontFamily: C.mono,
            fontSize: 12,
            letterSpacing: '0.03em',
            padding: '10px 12px',
            borderRadius: 9,
            color: socialActive ? C.teal : C.ink2,
            background: 'transparent',
            border: '1px solid transparent',
            cursor: 'pointer',
            justifyContent: collapsed ? 'center' : 'flex-start',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = C.panel2)}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <Share2 size={16} style={{ flex: '0 0 16px' }} />
          {!collapsed && (
            <>
              <span style={{ flex: 1, textAlign: 'left' }}>Social Media</span>
              {socialOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </>
          )}
        </button>

        {!collapsed && socialOpen && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {SOCIAL.map((i) => row(i, { indent: true }))}
          </div>
        )}
      </div>
    </aside>
  );
}
