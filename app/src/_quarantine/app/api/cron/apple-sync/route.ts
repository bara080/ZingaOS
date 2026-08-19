import { NextResponse } from 'next/server';
import { SignJWT, importPKCS8 } from 'jose';
import { getDb, ensureAppleIndexes } from '@/lib/db';

export const runtime = 'nodejs';

async function getAppleToken(): Promise<string> {
  const pem = process.env.APPLE_PRIVATE_KEY!.replace(/\\n/g, '\n');
  const privateKey = await importPKCS8(pem, 'ES256');
  return new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: process.env.APPLE_KEY_ID! })
    .setIssuer(process.env.APPLE_ISSUER_ID!)
    .setAudience('appstoreconnect-v1')
    .setIssuedAt()
    .setExpirationTime('20m')
    .sign(privateKey);
}

async function appleFetch(path: string, token: string) {
  const res = await fetch(`https://api.appstoreconnect.apple.com/v1${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`App Store Connect API ${res.status}: ${path}`);
  return res.json();
}

function isoDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function GET(req: Request) {
  const auth = req.headers.get('authorization');
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const appId = process.env.APPLE_APP_ID!;

  try {
    const token = await getAppleToken();

    // Fetch up to 100 most recent reviews
    const reviewsData = await appleFetch(
      `/apps/${appId}/customerReviews?sort=-createdDate&limit=100`,
      token,
    );

    const reviews: {
      id: string;
      attributes: {
        rating: number;
        title: string;
        body: string;
        reviewerNickname: string;
        territory: string;
        createdDate: string;
      };
    }[] = reviewsData?.data ?? [];

    // Aggregate per day (last 7 days)
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const byDay: Record<string, { reviews: number; ratingSum: number }> = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo.getTime() + i * 24 * 60 * 60 * 1000);
      byDay[isoDateOnly(d)] = { reviews: 0, ratingSum: 0 };
    }

    const ratingDist: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
    let ratingSum = 0;

    const db = await getDb('ZG');
    await ensureAppleIndexes();
    const events = db.collection('telemetry_events');

    for (const r of reviews) {
      const attr = r.attributes;
      const rating = attr.rating ?? 0;
      const createdAt = attr.createdDate ?? new Date().toISOString();

      ratingSum += rating;
      const key = String(Math.round(rating));
      if (ratingDist[key] !== undefined) ratingDist[key]++;

      const day = isoDateOnly(new Date(createdAt));
      if (byDay[day]) {
        byDay[day].reviews++;
        byDay[day].ratingSum += rating;
      }

      // Upsert review into telemetry_events (skip if already stored)
      await events.updateOne(
        { provider: 'apple', 'data.reviewId': r.id },
        {
          $setOnInsert: {
            provider: 'apple',
            type: 'review',
            customerUid: attr.reviewerNickname || 'anonymous',
            deviceId: r.id,
            sessionId: r.id,
            timestamp: new Date(createdAt),
            data: {
              reviewId: r.id,
              rating,
              title: attr.title ?? '',
              body: attr.body ?? '',
              userName: attr.reviewerNickname ?? '',
              territory: attr.territory ?? '',
            },
            createdAt: new Date(),
          },
        },
        { upsert: true },
      );
    }

    const totalRatings = reviews.length;
    const averageRating =
      totalRatings > 0 ? Number((ratingSum / totalRatings).toFixed(2)) : null;

    const trend = Object.entries(byDay).map(([date, v]) => ({
      date,
      reviews: v.reviews,
      avgRating:
        v.reviews > 0 ? Number((v.ratingSum / v.reviews).toFixed(2)) : 0,
    }));

    await db.collection('apple_stats').insertOne({
      averageRating,
      totalRatings,
      ratingDistribution: ratingDist,
      trend,
      createdAt: new Date(),
    });

    return NextResponse.json({ ok: true, averageRating, totalRatings });
  } catch (err) {
    console.error('Apple sync failed:', err);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
