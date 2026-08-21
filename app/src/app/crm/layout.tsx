import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { readSession } from '@/lib/auth/session/session';

// CRM layout. Defensive server-side gate in addition to the middleware matcher
// (`/crm/:path*` → updateSession): only operator roles (superadmin | admin) may
// reach the CRM; everyone else is bounced to /login. Mirrors the operator gate.
export const metadata: Metadata = {
  title: 'CRM',
  robots: { index: false, follow: false },
};

const OPERATOR_ROLES = new Set(['superadmin', 'admin']);

export default async function CrmLayout({ children }: { children: React.ReactNode }) {
  const session = await readSession();
  if (!session) redirect('/login');
  if (!OPERATOR_ROLES.has(session.role)) redirect('/login');
  return children;
}
