import { NextResponse } from 'next/server';
import { storeTelemetryEvent } from '@/lib/telemetry';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Vexo sends batches
    const events = body.items || [];

    for (const e of events) {
      await storeTelemetryEvent({
        provider: 'vexo',
        type: e.type || 'event',
        customerUid: e.userId || 'unknown',
        deviceId: e.deviceId,
        sessionId: e.sessionId,
        timestamp: new Date(e.clientCreationDate || Date.now()),
        data: e,
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Vexo webhook failed:', err);
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }
}
