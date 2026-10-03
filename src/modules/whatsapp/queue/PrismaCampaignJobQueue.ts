import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import type { CampaignJobQueue, ClaimedCampaignJob } from "./CampaignJobQueue.ts";

const LEASE_MS = 5 * 60_000;

export class PrismaCampaignJobQueue implements CampaignJobQueue {
  constructor(private readonly db: PrismaClient) {}

  async claimBatch(limit: number, now = new Date()): Promise<ClaimedCampaignJob[]> {
    const jobs: ClaimedCampaignJob[] = [];
    const staleBefore = new Date(now.getTime() - LEASE_MS);
    for (let index = 0; index < Math.max(0, Math.min(limit, 25)); index += 1) {
      const candidate = await this.db.whatsAppCampaignRecipient.findFirst({
        where: {
          attempts: { lt: 5 },
          OR: [
            { status: "QUEUED", availableAt: { lte: now } },
            { status: "PROCESSING", lockedAt: { lt: staleBefore } },
          ],
          campaign: { status: { in: ["QUEUED", "RUNNING"] } },
        },
        orderBy: [{ availableAt: "asc" }, { id: "asc" }],
        select: {
          id: true,
          campaignId: true,
          attempts: true,
          maxAttempts: true,
          campaign: { select: { organizationId: true } },
        },
      });
      if (!candidate) break;
      const lockToken = randomUUID();
      const claimed = await this.db.whatsAppCampaignRecipient.updateMany({
        where: {
          id: candidate.id,
          status: candidate.attempts ? { in: ["QUEUED", "PROCESSING"] } : "QUEUED",
          attempts: candidate.attempts,
          OR: [{ lockedAt: null }, { lockedAt: { lt: staleBefore } }],
        },
        data: {
          status: "PROCESSING",
          jobId: `whatsapp-campaign:${candidate.campaignId}:${candidate.id}`,
          attempts: { increment: 1 },
          lockedAt: now,
          lockToken,
          lastError: null,
        },
      });
      if (claimed.count)
        jobs.push({
          recipientId: candidate.id,
          campaignId: candidate.campaignId,
          organizationId: candidate.campaign.organizationId,
          lockToken,
          attempt: candidate.attempts + 1,
          maxAttempts: candidate.maxAttempts,
        });
    }
    return jobs;
  }

  async complete(recipientId: string, lockToken: string) {
    await this.updateClaim(recipientId, lockToken, {
      status: "SUBMITTED",
      completedAt: new Date(),
      lockedAt: null,
      lockToken: null,
      lastError: null,
    });
  }

  async skip(recipientId: string, lockToken: string, reason: string) {
    await this.updateClaim(recipientId, lockToken, {
      status: "SKIPPED",
      exclusionReason: reason,
      completedAt: new Date(),
      lockedAt: null,
      lockToken: null,
    });
  }

  async release(recipientId: string, lockToken: string, availableAt: Date) {
    await this.updateClaim(recipientId, lockToken, {
      status: "QUEUED",
      attempts: { decrement: 1 },
      availableAt,
      lockedAt: null,
      lockToken: null,
    });
  }

  async retry(recipientId: string, lockToken: string, error: string, availableAt: Date) {
    await this.updateClaim(recipientId, lockToken, {
      status: "QUEUED",
      availableAt,
      lockedAt: null,
      lockToken: null,
      lastError: error.slice(0, 500),
    });
  }

  async fail(recipientId: string, lockToken: string, error: string) {
    await this.updateClaim(recipientId, lockToken, {
      status: "FAILED",
      completedAt: new Date(),
      lockedAt: null,
      lockToken: null,
      lastError: error.slice(0, 500),
    });
  }

  private async updateClaim(
    recipientId: string,
    lockToken: string,
    data: Parameters<PrismaClient["whatsAppCampaignRecipient"]["updateMany"]>[0]["data"]
  ) {
    const result = await this.db.whatsAppCampaignRecipient.updateMany({
      where: { id: recipientId, status: "PROCESSING", lockToken },
      data,
    });
    // Pause/cancel can deliberately clear a lease while a worker is in flight.
    return result.count > 0;
  }
}
