import { Eye, Sparkles, CircleCheck, Send } from 'lucide-react';

const STEPS = [
  {
    icon: Eye,
    kicker: 'Perceive',
    title: 'It reads every message',
    body: 'New DMs, emails, and texts are pulled into one queue and understood in context — who is asking, and what they want.',
  },
  {
    icon: Sparkles,
    kicker: 'Propose',
    title: 'It drafts the right reply',
    body: 'The agent writes a reply grounded in your services and availability — and proposes the booking or follow-up it would send.',
  },
  {
    icon: CircleCheck,
    kicker: 'Approve',
    title: 'You review and approve',
    body: 'Nothing goes out on its own. You see the draft, edit if you want, and approve — or skip it. You stay in control.',
  },
  {
    icon: Send,
    kicker: 'Act',
    title: 'It sends and books',
    body: 'On approval, the agent sends the reply, books the appointment, and keeps watching the thread for what comes next.',
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="border-t border-line bg-canvas">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-brand">
            The agent loop
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            Perceive. Propose. Approve. Act.
          </h2>
          <p className="mt-4 text-lg text-ink2">
            An agent that does the work but never the deciding. Every step is visible, and the
            send is always yours.
          </p>
        </div>

        <ol className="mt-16 grid gap-6 md:grid-cols-4">
          {STEPS.map(({ icon: Icon, kicker, title, body }, i) => (
            <li key={kicker} className="relative flex flex-col">
              {/* connector line to the next step (desktop) */}
              {i < STEPS.length - 1 && (
                <span
                  aria-hidden
                  className="absolute left-11 top-5 hidden h-px w-[calc(100%-1.5rem)] bg-gradient-to-r from-brand/40 to-transparent md:block"
                />
              )}
              <div className="flex items-center gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-panel ring-1 ring-line">
                  <Icon className="size-5 text-brand" />
                </div>
                <span className="font-mono text-xs uppercase tracking-wider text-ink3">
                  {String(i + 1).padStart(2, '0')} · {kicker}
                </span>
              </div>
              <h3 className="mt-4 text-lg font-medium text-ink">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink2">{body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
