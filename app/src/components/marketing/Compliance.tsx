import { ShieldCheck, CircleCheck, HandshakeIcon, Ban } from 'lucide-react';

const POINTS = [
  {
    icon: CircleCheck,
    title: 'You approve everything',
    body: 'The agent drafts and proposes — but nothing sends until you say so. No surprise messages going out under your name.',
  },
  {
    icon: HandshakeIcon,
    title: 'Consent-first outreach',
    body: 'Consent is tracked per contact and opt-outs are honored automatically. Reaching people the right way is the default, not an add-on.',
  },
  {
    icon: Ban,
    title: 'Built to not get you banned',
    body: 'Outreach respects platform rules and pacing instead of blasting cold messages — the way to stay on the channels you depend on.',
  },
];

export function Compliance() {
  return (
    <section id="compliance" className="border-t border-[#232833] bg-[#0B0D11]">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr] lg:items-center lg:gap-16">
          <div>
            <div className="flex size-12 items-center justify-center rounded-xl bg-[#2FD9C9]/10 ring-1 ring-[#2FD9C9]/30">
              <ShieldCheck className="size-6 text-[#2FD9C9]" />
            </div>
            <h2 className="mt-6 text-3xl font-semibold tracking-tight text-[#E7EBF1] sm:text-4xl">
              Won&apos;t get you banned. Consent-first. You approve everything.
            </h2>
            <p className="mt-4 text-lg text-[#98A1AE]">
              Automation only helps if it keeps your accounts — and your reputation — intact.
              That&apos;s the whole point of keeping you in the loop.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            {POINTS.map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="flex gap-4 rounded-xl border border-[#232833] bg-[#12151C] p-5"
              >
                <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#171B23] ring-1 ring-[#232833]">
                  <Icon className="size-4 text-[#2FD9C9]" />
                </div>
                <div>
                  <h3 className="text-base font-medium text-[#E7EBF1]">{title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-[#98A1AE]">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
