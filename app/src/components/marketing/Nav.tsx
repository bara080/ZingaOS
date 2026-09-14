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
        className="size-[7px] rounded-full bg-[#2FD9C9]"
        style={{ boxShadow: '0 0 10px #2FD9C9' }}
      />
      <span className="font-mono text-[13px] uppercase tracking-[0.16em] text-[#E7EBF1]">
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
          ? 'border-[#232833] bg-[#0B0D11]/80 backdrop-blur-md'
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
                className="rounded-md px-3 py-2 text-sm text-[#98A1AE] transition-colors hover:text-[#E7EBF1]"
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
              className="text-[#98A1AE] hover:bg-[#171B23] hover:text-[#E7EBF1]"
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
