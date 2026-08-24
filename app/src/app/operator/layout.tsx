import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { readSession } from '@/lib/auth/session/session';

// Operator console layout. Defensive server-side gate in addition to the
// middleware matcher (`/operator/:path*` → updateSession): only operator roles
// (superadmin | admin) may reach the page; everyone else is bounced to /login.
export const metadata: Metadata = {
  title: 'Operator',
  robots: { index: false, follow: false },
};

// Operators + the limited `guest` role (Meta reviewer, Instagram demo only).
const OPERATOR_VIEW_ROLES = new Set(['superadmin', 'admin', 'guest']);

export default async function OperatorLayout({ children }: { children: React.ReactNode }) {
  const session = await readSession();
  if (!session) redirect('/login');
  if (!OPERATOR_VIEW_ROLES.has(session.role)) redirect('/login');
  return children;
}
