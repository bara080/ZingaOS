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
    <section className="border-y border-line bg-canvas">
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
        <p className="text-center font-mono text-xs uppercase tracking-[0.18em] text-ink3">
          Built for local service businesses
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {VERTICALS.map(({ label, icon: Icon }) => (
            <div
              key={label}
              className="flex items-center gap-2 rounded-full border border-line bg-panel px-4 py-2 text-sm text-ink2 transition-colors hover:border-brand/40 hover:text-ink"
            >
              <Icon className="size-4 text-brand" />
              {label}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
