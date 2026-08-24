import { NextResponse } from 'next/server';
import { requireOperator } from '@/lib/operator/guard';
import { createServiceClient } from '@/lib/supabase/admin';

// GET /api/operator/crm/lead-activity?leadId=123 — outreach send history for one
// lead (DM Queue · Activity tab). Real rows from ops.outreach_messages.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const gate = await requireOperator();
  if ('response' in gate) return gate.response;

  const leadId = Number(new URL(req.url).searchParams.get('leadId'));
  if (!Number.isFinite(leadId) || leadId <= 0) {
    return NextResponse.json({ error: 'leadId required' }, { status: 400 });
  }

  const admin = createServiceClient();
  const { data, error } = await admin.rpc('operator_lead_activity', { p_lead_id: leadId, p_limit: 50 });
  if (error) {
    console.error('operator_lead_activity error', error.message);
    return NextResponse.json({ error: 'Failed to load activity' }, { status: 500 });
  }
  return NextResponse.json({ activity: data ?? [] });
}
