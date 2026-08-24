// CRM navigation model. Order + labels follow docs/outreach-crm-plan.md.
// DM Queue is the priority surface and the default view.
import type { LucideIcon } from 'lucide-react';
import {
  Home,
  Send,
  Users,
  Inbox,
  Megaphone,
  Bot,
  Workflow,
  BarChart3,
  Settings,
} from 'lucide-react';

export type CrmView =
  | 'dashboard'
  | 'dm-queue'
  | 'leads'
  | 'inbox'
  | 'campaigns'
  | 'agents'
  | 'automations'
  | 'analytics'
  | 'settings';

export const CRM_NAV: { key: CrmView; label: string; icon: LucideIcon }[] = [
  { key: 'dashboard', label: 'Home', icon: Home },
  { key: 'dm-queue', label: 'DM Queue', icon: Send },
  { key: 'leads', label: 'Leads', icon: Users },
  { key: 'inbox', label: 'Inbox', icon: Inbox },
  { key: 'campaigns', label: 'Campaigns', icon: Megaphone },
  { key: 'agents', label: 'AI Agents', icon: Bot },
  { key: 'automations', label: 'Automations', icon: Workflow },
  { key: 'analytics', label: 'Analytics', icon: BarChart3 },
  { key: 'settings', label: 'Settings', icon: Settings },
];

export const DEFAULT_VIEW: CrmView = 'dm-queue';
