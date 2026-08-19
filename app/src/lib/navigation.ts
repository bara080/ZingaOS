import {
  Layout,
  Calendar,
  Settings,
  CircleHelp,
  LucideIcon,
  ShieldUser,
} from 'lucide-react';
import { Permission } from './auth';

export type NavItem = {
  title: string;
  url: string;
  icon: LucideIcon;
  permission?: Permission;
};

export type NavGroup = {
  label: string;
  collapsible?: boolean;
  items: NavItem[];
};

// NOTE (Supabase migration — Bucket B quarantine):
// The nav items for Dashboard/overview, Email Campaigns, Push Notifications,
// Banners, the whole Analytics group, Service Providers, Customers, Bookings,
// Reports, and Logs are COMMENTED OUT below. Their backing API routes were
// moved to `src/_quarantine/` (MongoDB → Supabase rewrite pending), so those
// pages would render but fail on data fetch. Restore each link when its route
// is ported back. Only auth-backed sections (Admin Users, Settings, Help) plus
// static pages (Task, Calendar) remain live.
export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'General',
    items: [
      // { title: 'Dashboard', url: '/overview', icon: Home }, // quarantined backend
      { title: 'Task', url: '/task', icon: Layout },
      { title: 'Calendar', url: '/calendar', icon: Calendar },
    ],
  },

  // Engagement (Email Campaigns / Push Notifications / Banners) — quarantined backend.
  // {
  //   label: 'Engagement',
  //   items: [
  //     { title: 'Email Campaigns', url: '/campaign', icon: Mail },
  //     { title: 'Push Notifications', url: '/push-notifications', icon: MessageSquareDot },
  //     { title: 'Banners', url: '/banners', icon: GalleryHorizontal },
  //   ],
  // },

  // Analytics (Vexo / LogRocket / Sentry / Apple / Play / Vercel / Stripe) — quarantined backend.
  // {
  //   label: 'Analytics',
  //   collapsible: true,
  //   items: [
  //     { title: 'Vexo Events', url: '/analytics/vexo', icon: BarChart3, permission: 'analytics.view' },
  //     { title: 'Session Replays', url: '/analytics/logrocket', icon: Clapperboard, permission: 'analytics.view' },
  //     { title: 'Sentry', url: '/analytics/sentry', icon: Bug, permission: 'analytics.view' },
  //     { title: 'Apple App Store', url: '/analytics/apple', icon: Smartphone, permission: 'analytics.view' },
  //     { title: 'Google Play Store', url: '/analytics/play', icon: PlayCircle, permission: 'analytics.view' },
  //     { title: 'Vercel Deployments', url: '/analytics/vercel', icon: Server, permission: 'analytics.view' },
  //     { title: 'Stripe', url: '/analytics/stripe', icon: CreditCard, permission: 'analytics.view' },
  //   ],
  // },

  {
    label: 'Pages',
    collapsible: true,
    items: [
      {
        title: 'Admin Users',
        url: '/admin-users',
        icon: ShieldUser,
        permission: 'admin-users.view',
      },
      // { title: 'Service Providers', url: '/zinga-sp', icon: Store, permission: 'service-providers.view' }, // quarantined
      // { title: 'Customers', url: '/zinga-zc', icon: Users, permission: 'customers.view' }, // quarantined
      // { title: 'Bookings', url: '/bookings', icon: CalendarDays }, // quarantined
      // { title: 'Reports', url: '/reports', icon: FileText, permission: 'reports.view' }, // quarantined
    ],
  },

  {
    label: 'Others',
    collapsible: true,
    items: [
      // { title: 'Logs', url: '/logs', icon: ScrollText, permission: 'reports.view' }, // quarantined
      {
        title: 'Settings',
        url: '/settings',
        icon: Settings,
      },
      {
        title: 'Help',
        url: '/help',
        icon: CircleHelp,
      },
    ],
  },
];
