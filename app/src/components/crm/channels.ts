// Channel capability config — the single source of truth for what each platform
// can do. Per docs/outreach-crm-plan.md: capabilities are DATA, never hardcoded
// into components. Adapters + the DM Queue + Settings all read from here.

export type ChannelCapability = {
  platform: string;
  label: string;
  manualSend: boolean; // human copy-paste send (first-class, not a workaround)
  apiSend: boolean; // direct API/SMTP send
  automatedReplies: boolean; // AI may auto-respond to inbound
  note: string;
};

export const CHANNELS: ChannelCapability[] = [
  {
    platform: 'instagram',
    label: 'Instagram',
    manualSend: true,
    apiSend: false,
    automatedReplies: true,
    note: 'Cold DMs are manual-assist only (Meta 24h rule). Replies send via API inside the window.',
  },
  {
    platform: 'email',
    label: 'Email',
    manualSend: false,
    apiSend: true,
    automatedReplies: true,
    note: 'Cold-volume channel. SMTP send, CAN-SPAM footer + opt-out. The scale lane.',
  },
  {
    platform: 'x',
    label: 'X',
    manualSend: true,
    apiSend: true,
    automatedReplies: true,
    note: 'X permits API DMs to non-followers — the real API cold-send lane.',
  },
  {
    platform: 'tiktok',
    label: 'TikTok',
    manualSend: true,
    apiSend: false,
    automatedReplies: false,
    note: 'Manual-assist only for now.',
  },
  {
    platform: 'facebook',
    label: 'Facebook',
    manualSend: false,
    apiSend: true,
    automatedReplies: true,
    note: 'Page messaging via API.',
  },
];

// Manual-DM daily cap (shared with the DM Queue guardrail).
export const DAILY_DM_CAP = 200;
