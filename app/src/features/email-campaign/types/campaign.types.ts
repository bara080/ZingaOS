export type CampaignAudienceType = 'customers' | 'providers' | 'all';

export type CampaignStatus = 'draft' | 'sending' | 'sent' | 'failed';

export type Campaign = {
  _id: string;
  title: string;
  subject: string;
  body: string; // HTML content
  audienceType: CampaignAudienceType;
  status: CampaignStatus;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  createdBy: string; // adminUid
  createdAt: string;
  sentAt?: string;
  sendgridBatchId?: string;
  errorMessage?: string;
};

export type CreateCampaignInput = {
  title: string;
  subject: string;
  body: string;
  audienceType: CampaignAudienceType;
};

export type SendCampaignInput = {
  campaignId: string;
};
