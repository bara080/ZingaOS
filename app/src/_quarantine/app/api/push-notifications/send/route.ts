import { NextResponse } from 'next/server';
import Expo, { ExpoPushMessage } from 'expo-server-sdk';

import { getDb } from '@/lib/db';
import { readSession } from '@/lib/auth';
import { can } from '@/lib/auth/guards';

export const runtime = 'nodejs';

const expo = new Expo();

type Audience = 'customer' | 'service-provider' | 'both';
type TargetType = 'audience' | 'individual' | 'group';

type ExpoTokenDoc = {
  uid?: string;
  displayName?: string;
  email?: string;
  notificationsEnabled?: boolean;
  expoPushTokens?: Array<{ token?: string; platform?: string; lastUpdated?: string }>;
};

type TokenEntry = {
  token: string;
  platform?: string;
  uid?: string;
  audience: 'customer' | 'service-provider' | 'unknown';
};

// ─── Token helpers ────────────────────────────────────────────────────────────

async function getAudienceTokens(audience: Audience): Promise<TokenEntry[]> {
  const clusters: Array<{ cluster: 'ZC' | 'SP'; role: 'customer' | 'service-provider' }> = [];

  if (audience === 'customer' || audience === 'both')
    clusters.push({ cluster: 'ZC', role: 'customer' });
  if (audience === 'service-provider' || audience === 'both')
    clusters.push({ cluster: 'SP', role: 'service-provider' });

  const tokens: TokenEntry[] = [];

  for (const clusterInfo of clusters) {
    const db = await getDb(clusterInfo.cluster);
    const docs = await db
      .collection<ExpoTokenDoc>('firebaseusers')
      .find({
        notificationsEnabled: { $ne: false },
        expoPushTokens: { $exists: true, $type: 'array', $ne: [] },
      })
      .toArray();

    for (const doc of docs) {
      for (const entry of doc.expoPushTokens || []) {
        if (!entry.token || !Expo.isExpoPushToken(entry.token)) continue;
        tokens.push({
          token: entry.token,
          platform: entry.platform,
          uid: doc.uid,
          audience: clusterInfo.role,
        });
      }
    }
  }

  return tokens;
}

async function getIndividualTokens(userId: string): Promise<TokenEntry[]> {
  const tokens: TokenEntry[] = [];

  for (const cluster of ['ZC', 'SP'] as const) {
    const db = await getDb(cluster);
    const doc = await db.collection<ExpoTokenDoc>('firebaseusers').findOne({ uid: userId });

    if (doc) {
      for (const entry of doc.expoPushTokens || []) {
        if (!entry.token || !Expo.isExpoPushToken(entry.token)) continue;
        tokens.push({
          token: entry.token,
          platform: entry.platform,
          uid: doc.uid,
          audience: cluster === 'ZC' ? 'customer' : 'service-provider',
        });
      }
      break;
    }
  }

  return tokens;
}

async function getGroupTokens(groupId: string): Promise<TokenEntry[]> {
  const db = await getDb('ZC');
  const group = await db
    .collection<{ name: string; uids: string[] }>('notification_groups')
    .findOne({ name: groupId });

  if (!group?.uids?.length) return [];

  const tokens: TokenEntry[] = [];
  for (const uid of group.uids) {
    tokens.push(...(await getIndividualTokens(uid)));
  }
  return tokens;
}

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const session = await readSession();
    if (!session || !can(session.role, 'notifications.view')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const title = String(body.title || '').trim();
    const message = String(body.message || body.body || '').trim();
    const imageUrl = String(body.imageUrl || '').trim() || undefined;
    const targetType: TargetType = body.targetType || 'audience';

    if (!title || !message) {
      return NextResponse.json({ error: 'Title and message are required.' }, { status: 400 });
    }

    // ── Resolve tokens ────────────────────────────────────────────────────────
    let tokens: TokenEntry[] = [];
    let targetId: string | undefined;
    let audienceLabel: Audience = 'both';

    if (targetType === 'audience') {
      audienceLabel = (body.audience || 'both') as Audience;
      tokens = await getAudienceTokens(audienceLabel);
    } else if (targetType === 'individual') {
      const userId = String(body.userId || '').trim();
      if (!userId)
        return NextResponse.json(
          { error: 'userId is required for individual targeting.' },
          { status: 400 },
        );
      targetId = userId;
      tokens = await getIndividualTokens(userId);
    } else if (targetType === 'group') {
      const groupId = String(body.groupId || '').trim();
      if (!groupId)
        return NextResponse.json(
          { error: 'groupId is required for group targeting.' },
          { status: 400 },
        );
      targetId = groupId;
      tokens = await getGroupTokens(groupId);
    }

    if (!tokens.length) {
      return NextResponse.json({
        ok: false,
        message: 'No Expo push tokens found for the selected target.',
        delivered: 0,
        failed: 0,
      });
    }

    // ── Build Expo messages ───────────────────────────────────────────────────
    //
    // HOW iOS IMAGES WORK:
    // iOS cannot download images in a standard push notification on its own.
    // A "Notification Service Extension" (NSE) running inside your app intercepts
    // the notification, sees the image URL in `data.imageUrl`, downloads it, and
    // attaches it before the notification is displayed.
    //
    // Two things are REQUIRED from the server side for the NSE to fire:
    //   1. `mutableContent: true`  — tells APNs to wake the NSE
    //   2. The image URL passed inside `data`  — the NSE reads this to know what to download
    //
    // The `attachments` field (used below) is what some Expo/FCM SDKs accept, but
    // without an NSE in the app, iOS will still ignore it. The NSE is mandatory.
    //
    // Android (FCM) DOES support images natively — no extension needed.
    // On Android, Expo forwards `data.imageUrl` through FCM's `notification.image` field.

    const messages: ExpoPushMessage[] = tokens.map((entry) => ({
      to: entry.token,
      title,
      body: message,
      sound: 'default',
      channelId: 'default',

      // ── Critical for iOS image support ──────────────────────────────────────
      // mutableContent wakes the Notification Service Extension so it can
      // download and attach the image before the notification is shown.
      mutableContent: imageUrl ? true : undefined,

      // ── Data payload ────────────────────────────────────────────────────────
      // The NSE in your mobile app reads `data.imageUrl` to download the image.
      // Keep all contextual info here too.
      data: {
        imageUrl: imageUrl ?? '', // ← NSE reads this on iOS
        targetType,
        targetId: targetId ?? '',
        audience: entry.audience,
        uid: entry.uid ?? '',
        source: 'dashboard-admin',
      },
    }));

    // ── Send via Expo ─────────────────────────────────────────────────────────
    const chunks = expo.chunkPushNotifications(messages);
    const deliveryResult: Array<{ token: string; status: string; message?: string; id?: string }> =
      [];
    let delivered = 0;
    let failed = 0;

    for (const chunk of chunks) {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);

      for (const ticket of ticketChunk) {
        const details = ticket as { details?: { expoPushToken?: string } };
        if (ticket.status === 'ok') {
          delivered++;
          deliveryResult.push({
            token: details.details?.expoPushToken ?? '',
            status: 'delivered',
            id: (ticket as { id?: string }).id,
          });
        } else {
          failed++;
          deliveryResult.push({
            token: details.details?.expoPushToken ?? '',
            status: 'failed',
            message: ticket.message ?? 'Push send failed',
          });
        }
      }
    }

    // ── Persist job ───────────────────────────────────────────────────────────
    const db = await getDb('ZC');
    await db.collection('push_notifications').insertOne({
      title,
      message,
      imageUrl,
      targetType,
      targetId,
      audience: targetType === 'audience' ? audienceLabel : undefined,
      totalTargets: tokens.length,
      delivered,
      failed,
      status: failed === tokens.length ? 'failed' : failed > 0 ? 'partial' : 'sent',
      createdAt: new Date(),
      results: deliveryResult.slice(0, 100),
      requestedBy: session.email ?? session.role,
    });

    return NextResponse.json({
      ok: true,
      totalTargets: tokens.length,
      delivered,
      failed,
      status: failed === tokens.length ? 'failed' : failed > 0 ? 'partial' : 'sent',
    });
  } catch (error) {
    console.error('PUSH_NOTIFICATION_SEND_ERROR', error);
    return NextResponse.json({ error: 'Unable to send push notifications.' }, { status: 500 });
  }
}
