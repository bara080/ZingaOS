import { NextResponse } from 'next/server';
import { SignJWT, importPKCS8 } from 'jose';
import { getDb, ensureGooglePlayIndexes } from '@/lib/db';

export const runtime = 'nodejs';

interface ServiceAccount {
  private_key: string;
  client_email: string;
}

async function getGoogleAccessToken(): Promise<string> {
  const sa: ServiceAccount = JSON.parse(process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON!);
  const privateKey = await importPKCS8(sa.private_key, 'RS256');

  const jwt = await new SignJWT({
    scope: 'https://www.googleapis.com/auth/androidpublisher',
  })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(sa.client_email)
    .setAudience('https://oauth2.googleapis.com/token')
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(privateKey);

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  if (!tokenRes.ok) throw new Error(`Google token exchange failed: ${tokenRes.status}`);
  const { access_token } = (await tokenRes.json()) as { access_token: string };
  return access_token;
}

async function playFetch(path: string, token: string) {
  const res = await fetch(`https://www.googleapis.com/androidpublisher/v3${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Google Play API ${res.status}: ${path}`);
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

  const pkg = process.env.GOOGLE_PLAY_PACKAGE_NAME!;

  try {
    const token = await getGoogleAccessToken();

    const reviewsData = await playFetch(
      `/applications/${pkg}/reviews?maxResults=100&translationLanguage=en`,
      token,
    );

    interface PlayReviewRaw {
      reviewId: string;
      authorName: string;
      comments?: {
        userComment?: {
          starRating?: number;
          text?: string;
          lastModified?: { seconds?: string };
          language?: string;
          thumbsUpCount?: number;
        };
        developerComment?: { text?: string };
      }[];
    }

    const rawReviews: PlayReviewRaw[] = reviewsData?.reviews ?? [];

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
    await ensureGooglePlayIndexes();
    const events = db.collection('telemetry_events');

    for (const r of rawReviews) {
      const userComment = r.comments?.[0]?.userComment;
      const devComment = r.comments?.[1]?.developerComment ?? r.comments?.find((c) => c.developerComment)?.developerComment;
      const rating = userComment?.starRating ?? 0;
      const secondsStr = userComment?.lastModified?.seconds;
      const reviewedAt = secondsStr
        ? new Date(Number(secondsStr) * 1000).toISOString()
        : new Date().toISOString();

      ratingSum += rating;
      const key = String(Math.round(rating));
      if (ratingDist[key] !== undefined) ratingDist[key]++;

      const day = isoDateOnly(new Date(reviewedAt));
      if (byDay[day]) {
        byDay[day].reviews++;
        byDay[day].ratingSum += rating;
      }

      await events.updateOne(
        { provider: 'google_play', 'data.reviewId': r.reviewId },
        {
          $setOnInsert: {
            provider: 'google_play',
            type: 'review',
            customerUid: r.authorName || 'anonymous',
            deviceId: r.reviewId,
            sessionId: r.reviewId,
            timestamp: new Date(reviewedAt),
            data: {
              reviewId: r.reviewId,
              rating,
              text: userComment?.text ?? '',
              authorName: r.authorName ?? '',
              language: userComment?.language ?? '',
              thumbsUpCount: userComment?.thumbsUpCount ?? 0,
              replyText: devComment?.text ?? null,
            },
            createdAt: new Date(),
          },
        },
        { upsert: true },
      );
    }

    const totalRatings = rawReviews.length;
    const averageRating =
      totalRatings > 0 ? Number((ratingSum / totalRatings).toFixed(2)) : null;

    const trend = Object.entries(byDay).map(([date, v]) => ({
      date,
      reviews: v.reviews,
      avgRating: v.reviews > 0 ? Number((v.ratingSum / v.reviews).toFixed(2)) : 0,
    }));

    await db.collection('google_play_stats').insertOne({
      averageRating,
      totalRatings,
      ratingDistribution: ratingDist,
      trend,
      createdAt: new Date(),
    });

    return NextResponse.json({ ok: true, averageRating, totalRatings });
  } catch (err) {
    console.error('Google Play sync failed:', err);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
