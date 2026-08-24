import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth/session/session';

// GET /api/operator/whoami — the signed-in user's role (any authenticated role),
// so the operator UI can restrict guests to the Instagram demo tab.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ role: session.role, email: session.email });
}
