'use client';

// Zinga OS Operator — React rebuild of the former static console/operator.html.
// Shell = reusable TopNav + collapsible Sidebar + a full-width content area that
// swaps panels by tab. Every panel is backed by a TanStack Query hook hitting the
// existing /api/operator/* routes (unchanged). The whole surface renders in the
// console's near-black dark palette regardless of the app theme.
import { useEffect, useState } from 'react';
import { Facebook, Music2, Twitter } from 'lucide-react';
import { TopNav } from '@/components/operator/TopNav';
import { Sidebar } from '@/components/operator/Sidebar';
import { ScrapePanel } from '@/components/operator/ScrapePanel';
import { AnalyticsPanel } from '@/components/operator/AnalyticsPanel';
import { EmailPanel } from '@/components/operator/EmailPanel';
import { InstagramPanel } from '@/components/operator/InstagramPanel';
import { PlaceholderPanel } from '@/components/operator/PlaceholderPanel';
import type { OperatorTab } from '@/components/operator/tabs';
import { C } from '@/components/operator/theme';

export default function OperatorPage() {
  const [tab, setTab] = useState<OperatorTab>('analytics');
  const [role, setRole] = useState<string | null>(null);

  // Guests (e.g. the Meta reviewer) get the Instagram demo ONLY — no sidebar,
  // no other panels (whose APIs would 403 anyway). Role comes from /whoami.
  useEffect(() => {
    fetch('/api/operator/whoami', { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.role) {
          setRole(d.role);
          if (d.role === 'guest') setTab('ig');
        }
      })
      .catch(() => {});
  }, []);

  const isGuest = role === 'guest';

  if (isGuest) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: `radial-gradient(1100px 600px at 40% 0%, #10151d, ${C.bg} 60%)`,
          color: C.ink,
          fontFamily: C.sans,
        }}
      >
        <style>{`@keyframes operatorPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.35;transform:scale(.6)}}`}</style>
        <TopNav current="operator" note="guest · Instagram demo" />
        <main style={{ maxWidth: 720, margin: '0 auto', padding: '24px 24px 48px' }}>
          <div
            style={{
              fontFamily: 'ui-monospace, Menlo, monospace',
              fontSize: 11,
              color: C.ink3,
              marginBottom: 14,
            }}
          >
            Guest access · Instagram connection + messaging only.
          </div>
          <InstagramPanel active />
        </main>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: `radial-gradient(1100px 600px at 40% 0%, #10151d, ${C.bg} 60%)`,
        color: C.ink,
        fontFamily: C.sans,
      }}
    >
      {/* Keyframes used by spinners across panels. */}
      <style>{`@keyframes operatorPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.35;transform:scale(.6)}}`}</style>

      <TopNav current="operator" />

      <div style={{ display: 'flex', alignItems: 'flex-start' }}>
        <Sidebar active={tab} onSelect={setTab} />
        <main
          style={{
            flex: 1,
            minWidth: 0,
            width: '100%',
            padding: '8px 24px 48px',
          }}
        >
          {tab === 'scrape' && <ScrapePanel />}
          {tab === 'analytics' && <AnalyticsPanel active />}
          {tab === 'email' && <EmailPanel active />}
          {tab === 'ig' && <InstagramPanel active />}
          {tab === 'facebook' && <PlaceholderPanel name="Facebook" icon={Facebook} />}
          {tab === 'x' && <PlaceholderPanel name="X" icon={Twitter} />}
          {tab === 'tiktok' && <PlaceholderPanel name="TikTok" icon={Music2} />}

          <div
            style={{
              fontFamily: C.mono,
              fontSize: 11,
              color: C.ink3,
              marginTop: 32,
              paddingTop: 14,
              borderTop: `1px solid ${C.line}`,
            }}
          >
            Zinga OS Operator · authenticated console — Send / Scrape / DM trigger real actions and
            spend. Every action is capped, confirmed, and audited.
          </div>
        </main>
      </div>
    </div>
  );
}
