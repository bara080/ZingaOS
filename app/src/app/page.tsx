import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { readSession } from '@/lib/auth/session/session';
import { Landing } from '@/components/marketing/Landing';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL;

const TITLE = 'Zinga AI — The AI that answers, qualifies, and books';
const DESCRIPTION =
  'Zinga AI reads every DM, email, and text, drafts the right reply, and books the appointment — across every channel, and only after you approve. Consent-first automation for local service businesses.';

export const metadata: Metadata = {
  ...(APP_URL ? { metadataBase: new URL(APP_URL) } : {}),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    type: 'website',
    title: TITLE,
    description: DESCRIPTION,
    siteName: 'Zinga AI',
    ...(APP_URL ? { url: APP_URL } : {}),
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
  },
};

// App root. Authenticated users go straight to the Zinga OS console; everyone
// else sees the public "Zinga AI" marketing landing (this route is NOT
// middleware-gated, so it's safe to render publicly).
export default async function Page() {
  const user = await readSession();
  if (user) redirect('/console');
  return <Landing />;
}
