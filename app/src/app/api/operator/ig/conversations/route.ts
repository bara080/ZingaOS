import { NextResponse } from 'next/server';
import { requireOperator } from '@/lib/operator/guard';
import { listConversations, metaConfigured } from '@/lib/operator/meta';

// GET /api/operator/ig/conversations
// Auth-gated. Lists OPEN Instagram conversations (with IGSIDs) for @zingaapp via
// the Meta Graph API. These are the only handles that can be DM'd (24h window);
// cold handles cannot. Read-only.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const gate = await requireOperator();
  if ('response' in gate) return gate.response;

  const conf = metaConfigured();
  if (!conf.ok) return NextResponse.json({ error: conf.error, conversations: [] }, { status: 500 });

  const result = await listConversations();
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: 502 });
  return NextResponse.json(result);
}
