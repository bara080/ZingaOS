import { Instagram, MessageCircle, Mail, MessageSquare, Phone } from 'lucide-react';

const CHANNELS = [
  { label: 'Instagram', icon: Instagram, note: 'DMs' },
  { label: 'Messenger', icon: MessageCircle, note: 'Facebook' },
  { label: 'Email', icon: Mail, note: 'Inbox' },
  { label: 'SMS', icon: MessageSquare, note: 'Text' },
  { label: 'WhatsApp', icon: Phone, note: 'Chat' },
];

export function Channels() {
  return (
    <section id="channels" className="border-t border-line bg-canvas">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            One agent. Every channel your clients already use.
          </h2>
          <p className="mt-4 text-lg text-ink2">
            Your clients reach out wherever they like. Zinga AI meets them there and brings it all
            into a single queue.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {CHANNELS.map(({ label, icon: Icon, note }) => (
            <div
              key={label}
              className="flex flex-col items-center gap-3 rounded-xl border border-line bg-panel px-4 py-8 text-center transition-colors hover:border-brand/40"
            >
              <div className="flex size-12 items-center justify-center rounded-full bg-panel2 ring-1 ring-line">
                <Icon className="size-5 text-brand" />
              </div>
              <div>
                <div className="text-sm font-medium text-ink">{label}</div>
                <div className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-ink3">
                  {note}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
