import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { WithId, Document, Filter } from 'mongodb';
import type { DeploymentEvent, DeploymentState, DeploymentsResponse } from '@/features/vercel/types';

export const runtime = 'nodejs';

function toDeploymentEvent(d: WithId<Document>): DeploymentEvent {
  return {
    id: d._id.toString(),
    deploymentId: String(d.deploymentId ?? ''),
    projectName: String(d.projectName ?? ''),
    url: String(d.url ?? ''),
    state: String(d.state ?? 'BUILDING') as DeploymentState,
    target: (d.target as 'production' | 'preview' | null) ?? null,
    branch: String(d.branch ?? ''),
    commit: String(d.commit ?? ''),
    commitMessage: String(d.commitMessage ?? ''),
    buildDuration: d.buildDuration != null ? Number(d.buildDuration) : null,
    createdAt: (d.createdAt as Date)?.toISOString?.() ?? new Date().toISOString(),
  };
}

export async function GET(req: Request): Promise<NextResponse<DeploymentsResponse | { error: string }>> {
  const { searchParams } = new URL(req.url);
  const page = Math.max(parseInt(searchParams.get('page') ?? '1', 10) || 1, 1);
  const state = searchParams.get('state');
  const target = searchParams.get('target');
  const limit = 20;
  const skip = (page - 1) * limit;

  const filter: Filter<Document> = {};
  if (state) filter.state = state;
  if (target) filter.target = target;

  try {
    const db = await getDb('ZG');
    const col = db.collection<WithId<Document>>('deployment_events');

    const [docs, total] = await Promise.all([
      col.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
      col.countDocuments(filter),
    ]);

    return NextResponse.json({
      data: docs.map(toDeploymentEvent),
      total,
      page,
      pageSize: limit,
    });
  } catch (err) {
    console.error('Vercel deployments error:', err);
    return NextResponse.json({ error: 'Failed to load deployments' }, { status: 500 });
  }
}
