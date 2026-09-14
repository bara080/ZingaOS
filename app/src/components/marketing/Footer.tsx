import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-[#232833] bg-[#0B0D11]">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-5 py-10 sm:flex-row sm:px-8">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden
            className="size-[7px] rounded-full bg-[#2FD9C9]"
            style={{ boxShadow: '0 0 10px #2FD9C9' }}
          />
          <span className="font-mono text-[13px] uppercase tracking-[0.16em] text-[#E7EBF1]">
            Zinga AI
          </span>
        </div>

        <nav className="flex items-center gap-6 text-sm text-[#98A1AE]">
          <Link href="/login" className="transition-colors hover:text-[#E7EBF1]">
            Sign in
          </Link>
          <Link href="/legal/privacy" className="transition-colors hover:text-[#E7EBF1]">
            Privacy
          </Link>
        </nav>

        <p className="font-mono text-xs text-[#5E6672]">© 2026 Zinga</p>
      </div>
    </footer>
  );
}
