import { Scissors, Sparkles, Hand, Camera, Flower2, Car } from 'lucide-react';

// Honest category strip — the service verticals Zinga serves. Deliberately NOT
// fake company logos; these are the categories, not customers.
const VERTICALS = [
  { label: 'Barber', icon: Scissors },
  { label: 'Beauty', icon: Sparkles },
  { label: 'Nails', icon: Hand },
  { label: 'Photography', icon: Camera },
  { label: 'Massage', icon: Flower2 },
  { label: 'Auto', icon: Car },
];

export function Verticals() {
  return (
    <section className="border-y border-[#232833] bg-[#0B0D11]">
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
        <p className="text-center font-mono text-xs uppercase tracking-[0.18em] text-[#5E6672]">
          Built for local service businesses
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {VERTICALS.map(({ label, icon: Icon }) => (
            <div
              key={label}
              className="flex items-center gap-2 rounded-full border border-[#232833] bg-[#12151C] px-4 py-2 text-sm text-[#98A1AE] transition-colors hover:border-[#2FD9C9]/40 hover:text-[#E7EBF1]"
            >
              <Icon className="size-4 text-[#2FD9C9]" />
              {label}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
