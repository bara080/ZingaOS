import { NextResponse } from 'next/server';
import { requireOperator } from '@/lib/operator/guard';
import { createServiceClient } from '@/lib/supabase/admin';
import * as engine from '@/lib/email/engine';

// GET /api/operator/email-engine/runs/[runId]/recipients?page=&limit=&status=
//     → paginated recipients for the Recipients tab.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: Promise<{ runId: string }> }) {
  const gate = await requireOperator();
  if ('response' in gate) return gate.response;
  const { runId } = await params;
  const url = new URL(req.url);
  const page = Number(url.searchParams.get('page')) || 1;
  const limit = Number(url.searchParams.get('limit')) || 50;
  const status = url.searchParams.get('status') || undefined;
  const admin = createServiceClient();
  try {
    const result = await engine.listRecipients(admin, runId, { page, limit, status });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'failed' }, { status: 500 });
  }
}
