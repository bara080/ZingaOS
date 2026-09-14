import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-line bg-canvas">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-5 py-10 sm:flex-row sm:px-8">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden
            className="size-[7px] rounded-full bg-brand"
            style={{ boxShadow: '0 0 10px var(--color-brand)' }}
          />
          <span className="font-mono text-[13px] uppercase tracking-[0.16em] text-ink">
            Zinga AI
          </span>
        </div>

        <nav className="flex items-center gap-6 text-sm text-ink2">
          <Link href="/login" className="transition-colors hover:text-ink">
            Sign in
          </Link>
          <Link href="/legal/privacy" className="transition-colors hover:text-ink">
            Privacy
          </Link>
        </nav>

        <p className="font-mono text-xs text-ink3">© 2026 Zinga</p>
      </div>
    </footer>
  );
}
