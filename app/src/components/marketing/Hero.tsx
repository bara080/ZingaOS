import Link from 'next/link';
import { Eye, Sparkles, Send, MessageCircle, Clock, ShieldCheck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RequestAccessDialog } from './RequestAccessDialog';

// A dark, div-built mock of an "agent proposal" row from the DM queue. No real
// PII, no screenshots — an illustrative Perceive → Propose → Act sequence.
function AgentProposalCard() {
  return (
    <div className="relative mx-auto w-full max-w-md">
      {/* soft teal halo behind the card */}
      <div
        aria-hidden
        className="absolute -inset-6 -z-10 rounded-3xl bg-[#2FD9C9]/10 blur-2xl"
      />
      <div className="overflow-hidden rounded-2xl border border-[#232833] bg-[#12151C] shadow-2xl">
        {/* card header */}
        <div className="flex items-center justify-between border-b border-[#232833] px-4 py-3">
          <div className="flex items-center gap-2">
            <span
              aria-hidden
              className="size-[7px] rounded-full bg-[#2FD9C9]"
              style={{ boxShadow: '0 0 10px #2FD9C9' }}
            />
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#98A1AE]">
              Agent Queue
            </span>
          </div>
          <Badge
            variant="outline"
            className="border-[#2FD9C9]/30 bg-[#2FD9C9]/10 text-[10px] text-[#2FD9C9]"
          >
            Needs approval
          </Badge>
        </div>

        {/* perceive */}
        <div className="flex gap-3 border-b border-[#232833] px-4 py-3.5">
          <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-[#171B23] ring-1 ring-[#232833]">
            <MessageCircle className="size-3.5 text-[#98A1AE]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[11px] text-[#5E6672]">
              <Eye className="size-3 text-[#2FD9C9]" />
              <span className="font-mono uppercase tracking-wider">Perceived · Instagram DM</span>
            </div>
            <p className="mt-1 text-sm text-[#E7EBF1]">
              &ldquo;Do you have anything open Saturday for a fade + beard?&rdquo;
            </p>
          </div>
        </div>

        {/* propose */}
        <div className="flex gap-3 px-4 py-3.5">
          <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-[#2FD9C9]/10 ring-1 ring-[#2FD9C9]/30">
            <Sparkles className="size-3.5 text-[#2FD9C9]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[11px] text-[#5E6672]">
              <span className="font-mono uppercase tracking-wider">Proposed reply</span>
            </div>
            <div className="mt-1 rounded-lg border border-[#232833] bg-[#0B0D11] p-3 text-sm text-[#E7EBF1]">
              Yes — I have 2:30pm Saturday open. That&apos;s a 45-min slot for a fade + beard.
              Want me to book it and send a reminder?
            </div>
            <div className="mt-2 flex items-center gap-2 text-[10px] text-[#5E6672]">
              <Clock className="size-3" />
              <span>Drafted in 1.2s</span>
              <span aria-hidden>·</span>
              <ShieldCheck className="size-3 text-[#4FD08A]" />
              <span>Consent on file</span>
            </div>
          </div>
        </div>

        {/* act */}
        <div className="flex items-center gap-2 border-t border-[#232833] bg-[#0B0D11]/60 px-4 py-3">
          <button
            type="button"
            disabled
            className="flex items-center gap-1.5 rounded-md bg-[#2FD9C9] px-3 py-1.5 text-xs font-semibold text-[#06231F]"
          >
            <Send className="size-3.5" />
            Approve &amp; send
          </button>
          <button
            type="button"
            disabled
            className="rounded-md border border-[#232833] px-3 py-1.5 text-xs text-[#98A1AE]"
          >
            Edit
          </button>
          <span className="ml-auto font-mono text-[10px] uppercase tracking-wider text-[#5E6672]">
            You approve everything
          </span>
        </div>
      </div>
    </div>
  );
}

export function Hero() {
  return (
    <section id="product" className="relative overflow-hidden">
      {/* Animated / static background: radial teal glow + faint grid.
          Motion is opt-in via prefers-reduced-motion (see globals.css). */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="marketing-grid absolute inset-0 opacity-[0.35]" />
        <div className="marketing-glow absolute left-1/2 top-[-10%] h-[520px] w-[820px] -translate-x-1/2 rounded-full" />
      </div>

      <div className="mx-auto max-w-6xl px-5 pb-20 pt-16 sm:px-8 sm:pb-28 sm:pt-24">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="flex flex-col items-start">
            <Badge
              variant="outline"
              className="mb-6 border-[#232833] bg-[#12151C] text-[#98A1AE]"
            >
              <span
                aria-hidden
                className="mr-1.5 size-[6px] rounded-full bg-[#2FD9C9]"
                style={{ boxShadow: '0 0 8px #2FD9C9' }}
              />
              Agentic booking, built for local service pros
            </Badge>

            <h1 className="text-balance text-4xl font-semibold leading-[1.05] tracking-tight text-[#E7EBF1] sm:text-5xl lg:text-6xl">
              The AI that answers, qualifies, and books{' '}
              <span className="bg-gradient-to-r from-[#2FD9C9] to-[#5FE6D9] bg-clip-text text-transparent">
                — across every channel.
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-pretty text-lg text-[#98A1AE]">
              Zinga AI reads every DM, email, and text, drafts the right reply, and books the
              appointment — while you stay in control. It perceives, proposes, and acts only
              after you approve.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <RequestAccessDialog label="Request access" size="lg" withArrow />
              <Button
                asChild
                variant="outline"
                size="lg"
                className="border-[#232833] bg-transparent text-[#E7EBF1] hover:bg-[#171B23] hover:text-[#E7EBF1]"
              >
                <Link href="/login">Sign in</Link>
              </Button>
            </div>

            <p className="mt-5 font-mono text-xs uppercase tracking-wider text-[#5E6672]">
              Consent-first · You approve every send
            </p>
          </div>

          <AgentProposalCard />
        </div>
      </div>
    </section>
  );
}
