import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { WithId, Document } from 'mongodb';
import type { DeploymentEvent, DeploymentState, VercelSummary } from '@/features/vercel/types';

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

function isoDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function GET(): Promise<NextResponse<VercelSummary | { error: string }>> {
  try {
    const db = await getDb('ZG');
    const col = db.collection<WithId<Document>>('deployment_events');

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentFilter = { createdAt: { $gte: sevenDaysAgo } };

    const [lastDoc, recentDocs, totalDeployments, successfulDeployments, failedDeployments] =
      await Promise.all([
        col.findOne({}, { sort: { createdAt: -1 } }),
        col.find(recentFilter).sort({ createdAt: -1 }).limit(10).toArray(),
        col.countDocuments(recentFilter),
        col.countDocuments({ ...recentFilter, state: 'READY' }),
        col.countDocuments({ ...recentFilter, state: 'ERROR' }),
      ]);

    // 7-day trend
    const byDay: Record<string, { deployments: number; failures: number }> = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo.getTime() + i * 24 * 60 * 60 * 1000);
      byDay[isoDateOnly(d)] = { deployments: 0, failures: 0 };
    }
    for (const d of recentDocs) {
      const day = isoDateOnly(d.createdAt as Date);
      if (byDay[day]) {
        byDay[day].deployments++;
        if (d.state === 'ERROR') byDay[day].failures++;
      }
    }
    const trend = Object.entries(byDay).map(([date, v]) => ({ date, ...v }));

    // Avg build duration from successful deployments in range
    const durationDocs = await col
      .find({ ...recentFilter, state: 'READY', buildDuration: { $ne: null } })
      .project({ buildDuration: 1 })
      .toArray();
    const avgBuildDuration =
      durationDocs.length > 0
        ? Math.round(
            durationDocs.reduce((s, d) => s + Number(d.buildDuration ?? 0), 0) /
              durationDocs.length,
          )
        : null;

    return NextResponse.json({
      lastDeployment: lastDoc ? toDeploymentEvent(lastDoc) : null,
      totalDeployments,
      successfulDeployments,
      failedDeployments,
      avgBuildDuration,
      trend,
      recentDeployments: recentDocs.map(toDeploymentEvent),
    });
  } catch (err) {
    console.error('Vercel summary error:', err);
    return NextResponse.json({ error: 'Failed to load Vercel summary' }, { status: 500 });
  }
}
