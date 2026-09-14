import { Inbox, PenLine, Users, Megaphone, ShieldCheck, RefreshCw } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const FEATURES = [
  {
    icon: Inbox,
    title: 'Multi-channel inbox',
    body: 'Instagram, Messenger, email, and SMS land in one queue — every conversation in a single place, in order.',
  },
  {
    icon: PenLine,
    title: 'AI drafts',
    body: 'The agent writes a ready-to-send reply for each message, grounded in your services, hours, and pricing.',
  },
  {
    icon: Users,
    title: 'Scrape → leads',
    body: 'Turn public business profiles into a clean, deduped lead list you can review and reach out to.',
  },
  {
    icon: Megaphone,
    title: 'Campaigns',
    body: 'Run outreach and follow-up sequences to prospects and past clients — drafted for you, sent on your say-so.',
  },
  {
    icon: ShieldCheck,
    title: 'Consent & compliance',
    body: 'Consent is tracked per contact and opt-outs are honored automatically, so outreach stays within the rules.',
  },
  {
    icon: RefreshCw,
    title: 'Agent loop',
    body: 'Perceive, propose, act — the agent keeps watching new messages and surfaces the next thing that needs you.',
  },
];

export function Features() {
  return (
    <section className="bg-canvas">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            Everything the front desk does — automated, and supervised.
          </h2>
          <p className="mt-4 text-lg text-ink2">
            One agent that watches your channels, drafts the replies, and keeps your pipeline
            moving. You stay the final word on every send.
          </p>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <Card
              key={title}
              className="group border-line bg-panel transition-colors hover:border-brand/40"
            >
              <CardHeader>
                <div className="flex size-10 items-center justify-center rounded-lg bg-panel2 ring-1 ring-line transition-colors group-hover:ring-brand/40">
                  <Icon className="size-5 text-brand" />
                </div>
                <CardTitle className="mt-3 text-ink">{title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-ink2">{body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
