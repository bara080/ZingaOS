import { NextResponse } from 'next/server';
import { requireOperator } from '@/lib/operator/guard';
import { apifyStatus } from '@/lib/operator/apify';

// GET /api/operator/scrape/status?runId=...
// Auth-gated. Returns the Apify run status (RUNNING | SUCCEEDED | FAILED | ...).
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const gate = await requireOperator();
  if ('response' in gate) return gate.response;

  const runId = new URL(req.url).searchParams.get('runId') ?? '';
  const result = await apifyStatus(runId);
  if (result.error) return NextResponse.json({ error: result.error }, { status: 502 });
  return NextResponse.json({ status: result.status });
}
