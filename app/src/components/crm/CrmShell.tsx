'use client';

// Zinga CRM shell. Reuses the console TopNav (current="crm") + a CRM-specific
// left sidebar, and routes the 9 views — all wired to real ops.* data via the
// /api/operator/* routes. Same near-black palette as the operator.
import { useState } from 'react';
import { TopNav } from '@/components/operator/TopNav';
import { C } from '@/components/operator/theme';
import { CrmSidebar } from './CrmSidebar';
import { DEFAULT_VIEW, type CrmView } from './nav';
import { DashboardView } from './views/DashboardView';
import { DmQueueView } from './views/DmQueueView';
import { LeadsView } from './views/LeadsView';
import { InboxView } from './views/InboxView';
import { CampaignsView } from './views/CampaignsView';
import { AgentsView } from './views/AgentsView';
import { AutomationsView } from './views/AutomationsView';
import { AnalyticsView } from './views/AnalyticsView';
import { SettingsView } from './views/SettingsView';

const VIEWS: Record<CrmView, React.ComponentType<{ onNavigate?: (v: CrmView) => void }>> = {
  dashboard: DashboardView,
  'dm-queue': DmQueueView,
  leads: LeadsView,
  inbox: InboxView,
  campaigns: CampaignsView,
  agents: AgentsView,
  automations: AutomationsView,
  analytics: AnalyticsView,
  settings: SettingsView,
};

export function CrmShell() {
  const [view, setView] = useState<CrmView>(DEFAULT_VIEW);
  const View = VIEWS[view];

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
          <View onNavigate={setView} />
        </main>
      </div>
    </div>
  );
}
