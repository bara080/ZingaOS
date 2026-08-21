import { NextResponse } from 'next/server';
import { requireOperator } from '@/lib/operator/guard';
import { createServiceClient } from '@/lib/supabase/admin';

// GET  /api/operator/crm/campaigns  → list campaigns with live metrics
// POST /api/operator/crm/campaigns  → create a campaign
// Operator-gated; all DB access via SECURITY DEFINER RPCs (service_role only).
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const gate = await requireOperator();
  if ('response' in gate) return gate.response;

  const admin = createServiceClient();
  const { data, error } = await admin.rpc('operator_campaigns_list');
  if (error) {
    console.error('operator_campaigns_list error', error.message);
    return NextResponse.json({ error: 'Failed to load campaigns' }, { status: 500 });
  }
  return NextResponse.json({ campaigns: data ?? [] });
}

export async function POST(req: Request) {
  const gate = await requireOperator();
  if ('response' in gate) return gate.response;

  let body: {
    name?: string;
    platform?: string;
    goal?: string;
    source?: string;
    sendMode?: string;
    dailyLimit?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }
  const name = (body.name ?? '').trim();
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });

  const admin = createServiceClient();
  const { data, error } = await admin.rpc('operator_campaign_create', {
    p_name: name,
    p_platform: (body.platform ?? 'instagram').toString(),
    p_goal: (body.goal ?? '').toString(),
    p_source: body.source && body.source !== 'all' ? body.source.toString() : null,
    p_send_mode: (body.sendMode ?? 'manual').toString(),
    p_daily_limit: Number(body.dailyLimit) || 40,
    p_actor: gate.session.email,
  });
  if (error) {
    console.error('operator_campaign_create error', error.message);
    return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, id: data });
}
