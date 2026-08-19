import { getDb } from '@/lib/db';
import { ObjectId, WithId, Document } from 'mongodb';
import { Campaign, CampaignStatus, CreateCampaignInput } from '../types/campaign.types';

const COLLECTION = 'email_campaigns';

export async function createCampaign(
  input: CreateCampaignInput,
  createdBy: string,
): Promise<Campaign> {
  const db = await getDb('ZG');

  const doc = {
    title: input.title,
    subject: input.subject,
    body: input.body,
    audienceType: input.audienceType,
    status: 'draft' as CampaignStatus,
    recipientCount: 0,
    sentCount: 0,
    failedCount: 0,
    createdBy,
    createdAt: new Date(),
  };

  const result = await db.collection(COLLECTION).insertOne(doc);

  return {
    ...doc,
    _id: result.insertedId.toString(),
    createdAt: doc.createdAt.toISOString(),
  };
}

export async function getCampaigns(): Promise<Campaign[]> {
  const db = await getDb('ZG');

  const docs = await db
    .collection(COLLECTION)
    .find({})
    .sort({ createdAt: -1 })
    .limit(100)
    .toArray();

  return docs.map(serializeCampaign);
}

export async function getCampaignById(id: string): Promise<Campaign | null> {
  const db = await getDb('ZG');

  const doc = await db.collection(COLLECTION).findOne({ _id: new ObjectId(id) });
  return doc ? serializeCampaign(doc) : null;
}

export async function updateCampaignStatus(
  id: string,
  status: CampaignStatus,
  extras: Partial<
    Pick<
      Campaign,
      'recipientCount' | 'sentCount' | 'failedCount' | 'sentAt' | 'sendgridBatchId' | 'errorMessage'
    >
  > = {},
) {
  const db = await getDb('ZG');

  await db
    .collection(COLLECTION)
    .updateOne({ _id: new ObjectId(id) }, { $set: { status, ...extras, updatedAt: new Date() } });
}

export async function deleteCampaign(id: string) {
  const db = await getDb('ZG');
  await db.collection(COLLECTION).deleteOne({ _id: new ObjectId(id) });
}

function serializeCampaign(doc: WithId<Document>): Campaign {
  return {
    _id: doc._id.toString(),
    title: doc.title,
    subject: doc.subject,
    body: doc.body,
    audienceType: doc.audienceType,
    status: doc.status,
    recipientCount: doc.recipientCount ?? 0,
    sentCount: doc.sentCount ?? 0,
    failedCount: doc.failedCount ?? 0,
    createdBy: doc.createdBy,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : doc.createdAt,
    sentAt: doc.sentAt instanceof Date ? doc.sentAt.toISOString() : doc.sentAt,
    sendgridBatchId: doc.sendgridBatchId,
    errorMessage: doc.errorMessage,
  };
}
