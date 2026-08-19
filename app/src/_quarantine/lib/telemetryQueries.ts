import { getDb } from '@/lib/db';

export async function getCustomerTelemetry(customerUid: string, limit = 200) {
  const db = await getDb('ZG');

  return db
    .collection('telemetry_events')
    .find({ customerUid })
    .sort({ timestamp: -1 })
    .limit(limit)
    .toArray();
}

export async function getCustomerDevices(customerUid: string) {
  const db = await getDb('ZG');

  return db
    .collection('telemetry_events')
    .aggregate([
      { $match: { customerUid } },
      {
        $group: {
          _id: '$deviceId',
          lastSeen: { $max: '$timestamp' },
          provider: { $first: '$provider' },
          data: { $first: '$data' },
        },
      },
      { $sort: { lastSeen: -1 } },
    ])
    .toArray();
}
