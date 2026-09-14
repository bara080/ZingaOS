import { RequestAccessDialog } from './RequestAccessDialog';

export function CTASection() {
  return (
    <section className="border-t border-[#232833] bg-[#0B0D11]">
      <div className="mx-auto max-w-6xl px-5 py-24 sm:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-[#232833] bg-[#12151C] px-6 py-16 text-center sm:px-16">
          {/* teal glow accents */}
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 left-1/2 h-64 w-[640px] -translate-x-1/2 rounded-full bg-[#2FD9C9]/15 blur-3xl"
          />
          <div className="relative">
            <h2 className="mx-auto max-w-2xl text-balance text-3xl font-semibold tracking-tight text-[#E7EBF1] sm:text-4xl lg:text-5xl">
              Put your bookings on autopilot.
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-lg text-[#98A1AE]">
              Zinga AI is invite-only while we onboard providers. Request access and we&apos;ll
              reach out when a spot opens up.
            </p>
            <div className="mt-8 flex justify-center">
              <RequestAccessDialog label="Request access" size="lg" withArrow />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
