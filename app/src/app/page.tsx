import { redirect } from 'next/navigation';
import { readSession } from '@/lib/auth/session/session';

// App root: authed users land on the Zinga OS console, everyone else on login.
export default async function Page() {
  const user = await readSession();
  redirect(user ? '/console' : '/login');
}
