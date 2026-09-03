import { NextResponse } from 'next/server';
import { requireOperator } from '@/lib/operator/guard';
import { createServiceClient } from '@/lib/supabase/admin';
import * as engine from '@/lib/email/engine';

// GET /api/operator/email-engine/campaigns/[id] → a single campaign.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireOperator();
  if ('response' in gate) return gate.response;
  const { id } = await params;
  const admin = createServiceClient();
  try {
    const campaign = await engine.getCampaign(admin, id);
    if (!campaign) return NextResponse.json({ error: 'not found' }, { status: 404 });
    return NextResponse.json({ campaign });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'failed' }, { status: 500 });
  }
}
