import { redirect } from 'next/navigation';
import { readSession } from '@/lib/auth/session/session';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await readSession();
  if (!user) redirect('/login');

  return children;
}
