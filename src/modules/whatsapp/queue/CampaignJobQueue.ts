export type ClaimedCampaignJob = {
  recipientId: string;
  campaignId: string;
  organizationId: string;
  lockToken: string;
  attempt: number;
  maxAttempts: number;
};

export interface CampaignJobQueue {
  claimBatch(limit: number, now?: Date): Promise<ClaimedCampaignJob[]>;
  complete(recipientId: string, lockToken: string, messageId: string): Promise<void>;
  release(recipientId: string, lockToken: string, availableAt: Date): Promise<void>;
  skip(recipientId: string, lockToken: string, reason: string): Promise<void>;
  retry(recipientId: string, lockToken: string, error: string, availableAt: Date): Promise<void>;
  fail(recipientId: string, lockToken: string, error: string): Promise<void>;
}
