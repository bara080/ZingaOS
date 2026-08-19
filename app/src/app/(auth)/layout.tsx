import type { Metadata } from 'next';
import NavbarAuth from '@/components/ui/NavBarAuth';
import FooterAuth from '@/components/ui/footerAuth';
import { readSession } from '@/lib/auth/session/session';
import { redirect } from 'next/navigation';
import BrandingLogo from '@/components/BrandingLogo';
export const metadata: Metadata = {
  title: 'Sign in',
};

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const user = await readSession();
  if (user) redirect('/console');

  return (
    <div className="min-h-dvh flex flex-col">
      <NavbarAuth />
      <main className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="w-full text-center">
          <BrandingLogo width={87} height={46} />
          <h1 className="text-lg font-medium hidden">Zinga APP</h1>
        </div>
        <div className="w-full">{children}</div>
      </main>
      <FooterAuth />
    </div>
  );
}
