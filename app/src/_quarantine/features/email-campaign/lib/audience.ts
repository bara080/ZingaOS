import { getDb } from '@/lib/db';
import { CampaignAudienceType } from '../types/campaign.types';

export type AudienceRecipient = {
  email: string;
  name: string;
};

/**
 * Resolves the list of recipients based on audience type.
 * - 'customers'  → ZC cluster (mobile app users)
 * - 'providers'  → SP cluster (service providers)
 * - 'all'        → both clusters combined, deduplicated by email
 */
export async function resolveAudience(
  audienceType: CampaignAudienceType,
): Promise<AudienceRecipient[]> {
  const recipients: Map<string, AudienceRecipient> = new Map();

  if (audienceType === 'customers' || audienceType === 'all') {
    const db = await getDb('ZC');
    const users = await db
      .collection('users')
      .find(
        { isBlocked: { $ne: true }, email: { $exists: true, $ne: '' } },
        { projection: { email: 1, displayName: 1 } },
      )
      .toArray();

    for (const u of users) {
      if (u.email && !recipients.has(u.email)) {
        recipients.set(u.email, {
          email: u.email,
          name: u.displayName ?? u.email,
        });
      }
    }
  }

  if (audienceType === 'providers' || audienceType === 'all') {
    const db = await getDb('SP');
    // SP cluster stores owners on the store doc; adjust collection name if yours differs
    const stores = await db
      .collection('stores')
      .find(
        { 'owner.isBlocked': { $ne: true }, 'owner.email': { $exists: true, $ne: '' } },
        { projection: { 'owner.email': 1, 'owner.name': 1 } },
      )
      .toArray();

    for (const s of stores) {
      const email = s.owner?.email;
      const name = s.owner?.name ?? email;
      if (email && !recipients.has(email)) {
        recipients.set(email, { email, name });
      }
    }
  }

  return Array.from(recipients.values());
}

/**
 * Returns a rough recipient count without fetching all documents.
 * Used for previewing audience size before sending.
 */
export async function getAudienceCount(audienceType: CampaignAudienceType): Promise<number> {
  let count = 0;

  if (audienceType === 'customers' || audienceType === 'all') {
    const db = await getDb('ZC');
    count += await db
      .collection('users')
      .countDocuments({ isBlocked: { $ne: true }, email: { $exists: true, $ne: '' } });
  }

  if (audienceType === 'providers' || audienceType === 'all') {
    const db = await getDb('SP');
    count += await db
      .collection('stores')
      .countDocuments({ 'owner.isBlocked': { $ne: true }, 'owner.email': { $exists: true } });
  }

  return count;
}
