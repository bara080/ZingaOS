'use client';

// Zinga CRM shell. Reuses the console TopNav (current="crm") + a CRM-specific
// left sidebar, and routes the 9 views. DM Queue + Leads are wired to real
// ops.leads data; the rest are honest "build-up" placeholders per
// docs/outreach-crm-plan.md. Same near-black palette as the operator.
import { useState } from 'react';
import { TopNav } from '@/components/operator/TopNav';
import { C } from '@/components/operator/theme';
import { CrmSidebar } from './CrmSidebar';
import { CRM_NAV, DEFAULT_VIEW, type CrmView } from './nav';
import { DmQueueView } from './views/DmQueueView';
import { LeadsView } from './views/LeadsView';
import { DashboardView } from './views/DashboardView';
import { InboxView } from './views/InboxView';
import { CampaignsView } from './views/CampaignsView';
import { ComingSoon } from './views/ComingSoon';

const ICON = Object.fromEntries(CRM_NAV.map((n) => [n.key, n.icon]));
const LABEL = Object.fromEntries(CRM_NAV.map((n) => [n.key, n.label]));

const NOTES: Partial<Record<CrmView, string>> = {
  agents: 'AI agents (Qualifier, Setter, Follow-up) on the OpenAI Responses API — no LLM key wired yet. §5.',
  automations: 'Visual trigger/action rules (no reply 3d → follow-up, etc.). §6.',
  analytics: 'Sent / replies / reply rate / qualification / conversion, by platform + campaign. §8.',
  settings: 'Channels (capabilities as data), integrations, AI, limits & safety, team. §9.',
};

export function CrmShell() {
  const [view, setView] = useState<CrmView>(DEFAULT_VIEW);

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

      <TopNav current="crm" note="CRM · outreach execution" />

      <div style={{ display: 'flex', alignItems: 'flex-start' }}>
        <CrmSidebar active={view} onSelect={setView} />
        <main style={{ flex: 1, minWidth: 0, width: '100%', padding: '18px 24px 48px' }}>
          {view === 'dashboard' && <DashboardView />}
          {view === 'dm-queue' && <DmQueueView />}
          {view === 'leads' && <LeadsView />}
          {view === 'inbox' && <InboxView />}
          {view === 'campaigns' && <CampaignsView />}
          {view !== 'dashboard' &&
            view !== 'dm-queue' &&
            view !== 'leads' &&
            view !== 'inbox' &&
            view !== 'campaigns' && (
              <ComingSoon title={LABEL[view]} icon={ICON[view]} note={NOTES[view]} />
            )}
        </main>
      </div>
    </div>
  );
}
