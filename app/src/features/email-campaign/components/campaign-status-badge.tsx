import { CampaignStatus } from '../types/campaign.types';

const STATUS_CONFIG: Record<CampaignStatus, { label: string; className: string }> = {
  draft: {
    label: 'Draft',
    className: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
  },
  sending: {
    label: 'Sending…',
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 animate-pulse',
  },
  sent: {
    label: 'Sent',
    className: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
  },
  failed: {
    label: 'Failed',
    className: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  },
};

export function CampaignStatusBadge({ status }: { status: CampaignStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.className}`}
    >
      {cfg.label}
    </span>
  );
}
