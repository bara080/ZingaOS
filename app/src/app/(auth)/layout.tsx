import type { Metadata } from 'next';
import { Nav } from '@/components/marketing/Nav';
import { Footer } from '@/components/marketing/Footer';
import { readSession } from '@/lib/auth/session/session';
import { redirect } from 'next/navigation';
import BrandingLogo from '@/components/BrandingLogo';
export const metadata: Metadata = {
  title: 'Sign in',
};

// Homogeneous with the Zinga AI landing: dark-forced shell + the same nav/footer
// (nav in `minimal` mode — no landing section anchors) so /login feels like a
// continuation of the marketing site, not a separate light-themed app.
export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const user = await readSession();
  if (user) redirect('/console');

  return (
    <div className="dark min-h-dvh flex flex-col bg-canvas text-ink">
      <Nav minimal />
      <main className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="w-full text-center">
          <BrandingLogo width={87} height={46} />
        </div>
        <div className="w-full">{children}</div>
      </main>
      <Footer />
    </div>
  );
}
