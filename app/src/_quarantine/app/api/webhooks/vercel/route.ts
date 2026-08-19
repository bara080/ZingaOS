import { NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { getDb, ensureVercelIndexes } from '@/lib/db';
import type { DeploymentState } from '@/features/vercel/types';

export const runtime = 'nodejs';

function verifySignature(rawBody: string, signature: string): boolean {
  const secret = process.env.VERCEL_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = createHmac('sha1', secret).update(rawBody).digest('hex');
  try {
    return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'));
  } catch {
    return false;
  }
}

function stateFromType(type: string): DeploymentState {
  switch (type) {
    case 'deployment.succeeded': return 'READY';
    case 'deployment.error': return 'ERROR';
    case 'deployment.canceled': return 'CANCELED';
    case 'deployment.created': return 'QUEUED';
    default: return 'BUILDING';
  }
}

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get('x-vercel-signature') ?? '';

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const type = String(body.type ?? '');
  const payload = body.payload as Record<string, unknown> | undefined;
  const deployment = payload?.deployment as Record<string, unknown> | undefined;

  if (!deployment) {
    return NextResponse.json({ ok: true });
  }

  const meta = deployment.meta as Record<string, unknown> | undefined;
  const branch = String(
    meta?.githubCommitRef ?? meta?.gitlabCommitRef ?? meta?.bitbucketCommitRef ?? '',
  );
  const commit = String(
    meta?.githubCommitSha ?? meta?.gitlabCommitSha ?? meta?.bitbucketCommitSha ?? '',
  ).slice(0, 7);
  const commitMessage = String(
    meta?.githubCommitMessage ?? meta?.gitlabCommitMessage ?? '',
  );

  const buildingAt = Number(deployment.buildingAt ?? 0);
  const ready = Number(deployment.ready ?? 0);
  const buildDuration =
    buildingAt > 0 && ready > buildingAt
      ? Math.round((ready - buildingAt) / 1000)
      : null;

  try {
    const db = await getDb('ZG');
    await ensureVercelIndexes();

    await db.collection('deployment_events').updateOne(
      { deploymentId: String(deployment.id ?? '') },
      {
        $set: {
          state: stateFromType(type),
          buildDuration,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          deploymentId: String(deployment.id ?? ''),
          projectName: String(deployment.name ?? ''),
          url: String(deployment.url ?? ''),
          target: String(deployment.target ?? '') || null,
          branch,
          commit,
          commitMessage,
          createdAt: new Date(Number(body.createdAt ?? Date.now())),
        },
      },
      { upsert: true },
    );
  } catch (err) {
    console.error('Vercel webhook storage error:', err);
  }

  return NextResponse.json({ ok: true });
}
