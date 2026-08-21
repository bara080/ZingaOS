import { NextResponse } from 'next/server';
import { requireOperator } from '@/lib/operator/guard';
import { createServiceClient } from '@/lib/supabase/admin';

// GET /api/operator/crm/segments — every lead source + counts (for the campaign
// audience picker). Reuses operator_source_counts (all sources, not just
// emailable). Returns { segments: [{ source, n, emailable }] }.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const gate = await requireOperator();
  if ('response' in gate) return gate.response;

  const admin = createServiceClient();
  const { data, error } = await admin.rpc('operator_source_counts');
  if (error) {
    console.error('operator_source_counts error', error.message);
    return NextResponse.json({ error: 'Failed to load segments', segments: [] }, { status: 500 });
  }
  const segments = (data ?? []) as { source: string; n: number; emailable: number }[];
  return NextResponse.json({ segments });
}
