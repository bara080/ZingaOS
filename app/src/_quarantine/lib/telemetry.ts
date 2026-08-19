import { getDb } from './db';

export type TelemetryProvider = 'vexo' | 'sentry' | 'logrocket';

export async function storeTelemetryEvent(event: {
  provider: TelemetryProvider;
  type: string;
  customerUid: string;
  deviceId: string;
  sessionId: string;
  timestamp: Date;
  data: Record<string, unknown>;
}) {
  const db = await getDb('ZG');

  return db.collection('telemetry_events').insertOne({
    provider: event.provider,
    type: event.type,
    customerUid: event.customerUid,
    deviceId: event.deviceId,
    sessionId: event.sessionId,
    timestamp: event.timestamp,
    data: event.data,
    createdAt: new Date(),
  });
}
