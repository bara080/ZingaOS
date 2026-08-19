import { NextResponse } from 'next/server';
import { getDb, ensureVercelIndexes } from '@/lib/db';
import type { DeploymentState } from '@/features/vercel/types';

export const runtime = 'nodejs';

function mapVercelState(state: string): DeploymentState {
  switch (state?.toUpperCase()) {
    case 'READY': return 'READY';
    case 'ERROR': return 'ERROR';
    case 'CANCELED': return 'CANCELED';
    case 'QUEUED': return 'QUEUED';
    default: return 'BUILDING';
  }
}

export async function GET(req: Request) {
  const auth = req.headers.get('authorization');
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const projectId = process.env.VERCEL_PROJECT_ID!;
  const teamId = process.env.VERCEL_TEAM_ID;

  try {
    const params = new URLSearchParams({ projectId, limit: '50' });
    if (teamId) params.set('teamId', teamId);

    const res = await fetch(`https://api.vercel.com/v6/deployments?${params}`, {
      headers: { Authorization: `Bearer ${process.env.VERCEL_ACCESS_TOKEN}` },
    });
    if (!res.ok) throw new Error(`Vercel API ${res.status}`);

    const data = await res.json() as {
      deployments: {
        uid: string;
        name: string;
        url: string;
        state: string;
        target?: string;
        meta?: {
          githubCommitRef?: string;
          githubCommitSha?: string;
          githubCommitMessage?: string;
          gitlabCommitRef?: string;
          gitlabCommitSha?: string;
        };
        buildingAt?: number;
        ready?: number;
        created: number;
      }[];
    };

    const db = await getDb('ZG');
    await ensureVercelIndexes();
    const col = db.collection('deployment_events');

    let synced = 0;
    for (const d of data.deployments ?? []) {
      const branch = String(d.meta?.githubCommitRef ?? d.meta?.gitlabCommitRef ?? '');
      const commit = String(d.meta?.githubCommitSha ?? d.meta?.gitlabCommitSha ?? '').slice(0, 7);
      const commitMessage = String(d.meta?.githubCommitMessage ?? '');
      const buildDuration =
        d.buildingAt && d.ready && d.ready > d.buildingAt
          ? Math.round((d.ready - d.buildingAt) / 1000)
          : null;

      await col.updateOne(
        { deploymentId: d.uid },
        {
          $set: {
            state: mapVercelState(d.state),
            buildDuration,
            updatedAt: new Date(),
          },
          $setOnInsert: {
            deploymentId: d.uid,
            projectName: d.name,
            url: d.url,
            target: d.target ?? null,
            branch,
            commit,
            commitMessage,
            createdAt: new Date(d.created),
          },
        },
        { upsert: true },
      );
      synced++;
    }

    return NextResponse.json({ ok: true, synced });
  } catch (err) {
    console.error('Vercel sync failed:', err);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
