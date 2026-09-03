import { NextResponse } from 'next/server';
import { requireOperator } from '@/lib/operator/guard';
import { createServiceClient } from '@/lib/supabase/admin';
import * as engine from '@/lib/email/engine';

// GET  /api/operator/email-engine/campaigns → list campaigns (newest first)
// POST /api/operator/email-engine/campaigns → create a campaign + first version
// Operator-gated; all DB access via the SECURITY DEFINER RPCs (service_role only).
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const gate = await requireOperator();
  if ('response' in gate) return gate.response;
  const admin = createServiceClient();
  try {
    return NextResponse.json({ campaigns: await engine.listCampaigns(admin) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'failed' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const gate = await requireOperator();
  if ('response' in gate) return gate.response;

  let body: {
    name?: string;
    subject?: string;
    html?: string;
    text?: string;
    senderKey?: string;
    replyTo?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }
  const name = (body.name ?? '').trim();
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });

  const admin = createServiceClient();
  try {
    const campaign = await engine.createCampaign(admin, { name, createdBy: gate.session.email });
    // Seed the first frozen version so the campaign is immediately launchable.
    const version = await engine.addVersion(admin, campaign.id, {
      subject: body.subject || '',
      html: body.html || '',
      text: body.text || '',
      senderKey: body.senderKey || '',
      replyTo: body.replyTo || '',
    });
    return NextResponse.json({ ok: true, campaign, version });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'failed' }, { status: 500 });
  }
}
