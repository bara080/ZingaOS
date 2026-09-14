'use client';

import * as React from 'react';
import Link from 'next/link';

import { cn } from '@/lib/utils/common';
import { Button } from '@/components/ui/button';
import { RequestAccessDialog } from './RequestAccessDialog';

const NAV_LINKS = [
  { label: 'Product', href: '#product' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Channels', href: '#channels' },
  { label: 'Compliance', href: '#compliance' },
];

// The Zinga AI wordmark lockup — recreates the console TopNav vibe: a glowing
// teal dot + a mono, uppercase, letter-spaced wordmark.
function Wordmark() {
  return (
    <Link href="/" className="flex items-center gap-2.5" aria-label="Zinga AI home">
      <span
        aria-hidden
        className="size-[7px] rounded-full bg-brand"
        style={{ boxShadow: '0 0 10px var(--color-brand)' }}
      />
      <span className="font-mono text-[13px] uppercase tracking-[0.16em] text-ink">
        Zinga AI
      </span>
    </Link>
  );
}

export function Nav({ minimal = false }: { minimal?: boolean } = {}) {
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full border-b transition-colors duration-300',
        scrolled
          ? 'border-line bg-canvas/80 backdrop-blur-md'
          : 'border-transparent bg-transparent',
      )}
    >
      <nav className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-5 sm:px-8">
        <Wordmark />

        {!minimal && (
          <div className="hidden flex-1 items-center justify-center gap-1 md:flex">
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="rounded-md px-3 py-2 text-sm text-ink2 transition-colors hover:text-ink"
              >
                {l.label}
              </a>
            ))}
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          {!minimal && (
            <Button
              asChild
              variant="ghost"
              className="text-ink2 hover:bg-panel2 hover:text-ink"
            >
              <Link href="/login">Sign in</Link>
            </Button>
          )}
          <RequestAccessDialog label="Request access" size="default" />
        </div>
      </nav>
    </header>
  );
}
