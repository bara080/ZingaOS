'use client';

// Shared primitives + helpers for the Scrape Leads view. Dark palette only (C).
// Everything here is presentational or a pure helper over the real Lead shape —
// no data is invented.
import type { ReactNode } from 'react';
import { Instagram, Globe, MapPin, Search } from 'lucide-react';
import { C } from '@/components/operator/theme';
import type { Lead } from '../../api';

// A small, subtle "Soon" pill for features that aren't wired yet. Always paired
// with a disabled control so the UI is honest about what's real.
export function SoonTag({ style }: { style?: React.CSSProperties }) {
  return (
    <span
      style={{
        fontFamily: C.mono,
        fontSize: 8.5,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: C.ink3,
        border: `1px solid ${C.line}`,
        borderRadius: 5,
        padding: '1px 5px',
        background: C.panel2,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      Soon
    </span>
  );
}

// Numbered step header (badge + title + optional subtitle/right slot).
export function StepHeader({
  n,
  title,
  subtitle,
  right,
}: {
  n: number;
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
      <span
        style={{
          width: 22,
          height: 22,
          borderRadius: 7,
          display: 'grid',
          placeItems: 'center',
          background: 'rgba(47,217,201,0.10)',
          border: `1px solid ${C.teal}`,
          color: C.teal,
          fontFamily: C.mono,
          fontSize: 11,
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        {n}
      </span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: C.sans, fontSize: 14.5, fontWeight: 600, color: C.ink }}>{title}</div>
        {subtitle && <div style={{ fontFamily: C.mono, fontSize: 10.5, color: C.ink3 }}>{subtitle}</div>}
      </div>
      {right && (
        <>
          <span style={{ flex: 1 }} />
          {right}
        </>
      )}
    </div>
  );
}

// Small derived stat tile (Step 2). Value is always real/derived, never a guess.
export function StatTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div style={{ border: `1px solid ${C.line}`, borderRadius: 10, background: C.panel2, padding: '11px 13px', minWidth: 0 }}>
      <div style={{ fontFamily: C.mono, fontSize: 9, letterSpacing: '0.07em', textTransform: 'uppercase', color: C.ink3, marginBottom: 5 }}>
        {label}
      </div>
      <div style={{ fontFamily: C.sans, fontSize: 17, fontWeight: 700, color: C.ink }}>{value}</div>
      {hint && <div style={{ fontFamily: C.mono, fontSize: 9.5, color: C.ink3, marginTop: 2 }}>{hint}</div>}
    </div>
  );
}

// Where clicking a lead's external link goes: IG first, then website, then email.
export function leadUrl(l: Lead): string | null {
  if (l.instagram) return `https://instagram.com/${l.instagram.replace(/^@/, '')}`;
  if (l.website) return l.website.startsWith('http') ? l.website : `https://${l.website}`;
  if (l.email) return `mailto:${l.email}`;
  return null;
}

export function scoreColor(n: number): string {
  return n >= 80 ? C.green : n >= 60 ? C.teal : n >= 40 ? C.amber : C.ink3;
}

export const STAGE_COLOR: Record<string, string> = {
  scraped: C.ink3, prospect: C.ink2, new: C.ink2,
  contacted: C.amber, replied: C.teal, interested: C.teal,
  qualified: C.green, signed: C.green, listed: C.green, won: C.green,
};

// Source glyph for the results table. Maps the real source tags to an icon.
export function SourceIcon({ source }: { source: string | null }) {
  const s = (source || '').toLowerCase();
  if (s.includes('ig') || s.includes('insta')) return <Instagram size={14} color={C.teal} />;
  if (s.includes('google')) return <MapPin size={14} color={C.green} />;
  if (s.includes('tiktok')) return <Search size={14} color={C.ink2} />;
  return <Globe size={14} color={C.ink3} />;
}

// Relative "added" label from an ISO/date string. Returns "—" when absent —
// never fabricates a time.
export function relTime(iso: string | null): string {
  if (!iso) return '—';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '—';
  const diff = Date.now() - t;
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

// ── shared styles ───────────────────────────────────────────────────────────
export const card: React.CSSProperties = {
  border: `1px solid ${C.line}`,
  borderRadius: 12,
  background: 'rgba(18,21,28,0.5)',
  padding: 16,
};
export const field: React.CSSProperties = {
  fontFamily: C.mono,
  fontSize: 12,
  padding: '9px 11px',
  borderRadius: 8,
  background: C.panel2,
  color: C.ink,
  border: `1px solid ${C.line}`,
};
export const eyebrow: React.CSSProperties = {
  fontFamily: C.mono,
  fontSize: 9.5,
  letterSpacing: '0.09em',
  textTransform: 'uppercase',
  color: C.ink3,
  display: 'block',
  marginBottom: 8,
};
export const avatar: React.CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: '50%',
  flexShrink: 0,
  background: C.panel2,
  border: `1px solid ${C.line}`,
  display: 'grid',
  placeItems: 'center',
  fontFamily: C.sans,
  fontSize: 12,
  fontWeight: 700,
  color: C.teal,
};

export function ghostBtn(disabled = false): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    fontFamily: C.mono,
    fontSize: 11,
    fontWeight: 600,
    padding: '7px 11px',
    borderRadius: 8,
    border: `1px solid ${C.line}`,
    background: C.panel2,
    color: disabled ? C.ink3 : C.ink2,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.55 : 1,
  };
}
