import { CrmShell } from '@/components/crm/CrmShell';

// Zinga CRM — outreach-execution surface. Nav destination "CRM" on the console
// top bar. See docs/outreach-crm-plan.md for the full build plan. Built
// vertically: DM Queue first, then Leads/Inbox/Campaigns/etc. Every view binds to
// real ops.leads data via the existing /api/operator/* routes — no static screens.
export default function CrmPage() {
  return <CrmShell />;
}
