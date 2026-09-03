import type { PrismaClient } from "@prisma/client";
import type { CommunicationRequest, CommunicationResult } from "../../communication/types.ts";
import { isWhatsAppError } from "../errors.ts";
import type { CampaignJobQueue, ClaimedCampaignJob } from "../queue/CampaignJobQueue.ts";
import { WhatsAppCampaignMetricsService } from "./WhatsAppCampaignMetricsService.ts";

type CommunicationSender = {
  send(request: CommunicationRequest): Promise<CommunicationResult>;
};

type RecipientSnapshot = { normalizedPhone?: string; customerName?: string | null };

export const CAMPAIGN_BATCH_SIZE = 10;
export const CAMPAIGN_CONCURRENCY = 2;

export class WhatsAppCampaignExecutionService {
  private readonly metricService: WhatsAppCampaignMetricsService;
  constructor(
    private readonly db: PrismaClient,
    private readonly queue: CampaignJobQueue,
    private readonly communication?: CommunicationSender
  ) {
    this.metricService = new WhatsAppCampaignMetricsService(db);
  }

  async launch(organizationId: string, campaignId: string, now = new Date()) {
    const campaign = await this.db.whatsAppCampaign.findFirst({
      where: { id: campaignId, organizationId },
      select: { id: true, status: true },
    });
    if (!campaign) throw new Error("Campaign not found");
    if (["QUEUED", "RUNNING"].includes(campaign.status))
      return this.metrics(organizationId, campaignId);
    if (!["DRAFT", "SCHEDULED"].includes(campaign.status))
      throw new Error("Campaign can no longer be launched");

    const [queued] = await this.db.$transaction([
      this.db.whatsAppCampaignRecipient.updateMany({
        where: { campaignId, status: "ELIGIBLE" },
        data: { status: "QUEUED", availableAt: now, finalizedAt: now },
      }),
      this.db.whatsAppCampaignRecipient.updateMany({
        where: { campaignId, status: "EXCLUDED" },
        data: { status: "SKIPPED", completedAt: now, finalizedAt: now },
      }),
      this.db.whatsAppCampaign.update({
        where: { id: campaignId },
        data: { status: "QUEUED", launchedAt: now, pausedAt: null, completedAt: null },
      }),
    ]);
    if (!queued.count)
      await this.db.whatsAppCampaign.updateMany({
        where: { id: campaignId, status: "QUEUED" },
        data: { status: "COMPLETED", completedAt: now },
      });
    return this.metrics(organizationId, campaignId);
  }

  async launchDue(now = new Date(), limit = 20) {
    const due = await this.db.whatsAppCampaign.findMany({
      where: { status: "SCHEDULED", scheduledAt: { lte: now } },
      orderBy: [{ scheduledAt: "asc" }, { id: "asc" }],
      take: limit,
      select: { id: true, organizationId: true },
    });
    for (const campaign of due) await this.launch(campaign.organizationId, campaign.id, now);
    return due.length;
  }

  async pause(organizationId: string, campaignId: string) {
    const result = await this.db.whatsAppCampaign.updateMany({
      where: { id: campaignId, organizationId, status: { in: ["QUEUED", "RUNNING"] } },
      data: { status: "PAUSED", pausedAt: new Date() },
    });
    if (!result.count) throw new Error("Running campaign not found");
    return this.metrics(organizationId, campaignId);
  }

  async resume(organizationId: string, campaignId: string) {
    const result = await this.db.whatsAppCampaign.updateMany({
      where: { id: campaignId, organizationId, status: "PAUSED" },
      data: { status: "QUEUED", pausedAt: null },
    });
    if (!result.count) throw new Error("Paused campaign not found");
    return this.metrics(organizationId, campaignId);
  }

  async cancel(organizationId: string, campaignId: string) {
    const now = new Date();
    const campaign = await this.db.whatsAppCampaign.findFirst({
      where: { id: campaignId, organizationId },
      select: { id: true, status: true },
    });
    if (!campaign || ["COMPLETED", "FAILED", "CANCELLED"].includes(campaign.status))
      throw new Error("Active campaign not found");
    await this.db.$transaction([
      this.db.whatsAppCampaign.update({
        where: { id: campaignId },
        data: { status: "CANCELLED", cancelledAt: now },
      }),
      this.db.whatsAppCampaignRecipient.updateMany({
        where: { campaignId, status: { in: ["ELIGIBLE", "QUEUED", "PROCESSING"] } },
        data: {
          status: "SKIPPED",
          exclusionReason: "CAMPAIGN_CANCELLED",
          completedAt: now,
          lockedAt: null,
          lockToken: null,
        },
      }),
    ]);
    return this.metrics(organizationId, campaignId);
  }

  async processBatch(limit = CAMPAIGN_BATCH_SIZE) {
    const jobs = await this.queue.claimBatch(limit);
    let cursor = 0;
    const workers = Array.from(
      { length: Math.min(CAMPAIGN_CONCURRENCY, jobs.length) },
      async () => {
        while (cursor < jobs.length) {
          const job = jobs[cursor];
          cursor += 1;
          await this.processJob(job);
        }
      }
    );
    await Promise.all(workers);
    await Promise.all([...new Set(jobs.map((job) => job.campaignId))].map((id) => this.finish(id)));
    return { claimed: jobs.length };
  }

  async metrics(organizationId: string, campaignId: string) {
    return this.metricService.get(organizationId, campaignId);
  }

  private async processJob(job: ClaimedCampaignJob) {
    try {
      const recipient = await this.db.whatsAppCampaignRecipient.findFirst({
        where: { id: job.recipientId, campaign: { organizationId: job.organizationId } },
        include: {
          campaign: {
            include: {
              templateDefinition: true,
              stores: {
                include: { sender: { include: { phoneNumber: true } } },
                orderBy: { storeId: "asc" },
              },
            },
          },
          contact: { include: { stores: true, consents: { where: { purpose: "MARKETING" } } } },
        },
      });
      if (!recipient) return this.queue.fail(job.recipientId, job.lockToken, "Recipient not found");
      if (recipient.campaign.status === "PAUSED")
        return this.queue.release(job.recipientId, job.lockToken, new Date(Date.now() + 60_000));
      if (!["QUEUED", "RUNNING"].includes(recipient.campaign.status))
        return this.queue.skip(
          job.recipientId,
          job.lockToken,
          `CAMPAIGN_${recipient.campaign.status}`
        );
      if (!recipient.contact.consents.some((consent) => consent.status === "GRANTED"))
        return this.queue.skip(job.recipientId, job.lockToken, "MARKETING_CONSENT_NOT_GRANTED");

      const memberStores = new Set(recipient.contact.stores.map((store) => store.storeId));
      const selected = recipient.campaign.stores.find((store) => memberStores.has(store.storeId));
      if (!selected) return this.queue.skip(job.recipientId, job.lockToken, "NO_SELECTED_STORE");
      const instance = await this.db.whatsAppTemplateInstance.findFirst({
        where: {
          definitionId: recipient.campaign.templateDefinitionId,
          wabaId: selected.sender.phoneNumber.wabaId,
          status: "APPROVED",
          waba: { integration: { organizationId: job.organizationId } },
        },
        select: { id: true },
      });
      if (!instance)
        return this.queue.fail(job.recipientId, job.lockToken, "TEMPLATE_NOT_APPROVED");

      const snapshot = (recipient.snapshot ?? {}) as RecipientSnapshot;
      if (!snapshot.normalizedPhone)
        return this.queue.skip(job.recipientId, job.lockToken, "INVALID_RECIPIENT_PHONE");
      await this.db.$transaction([
        this.db.whatsAppCampaignRecipient.update({
          where: { id: recipient.id },
          data: {
            storeId: selected.storeId,
            senderId: selected.senderId,
            templateInstanceId: instance.id,
          },
        }),
        this.db.whatsAppCampaign.updateMany({
          where: { id: recipient.campaignId, status: "QUEUED" },
          data: { status: "RUNNING" },
        }),
      ]);
      if (!this.communication) throw new Error("Campaign transport is unavailable to this worker");
      const result = await this.communication.send({
        channel: "WHATSAPP",
        message: {
          organizationId: job.organizationId,
          storeId: selected.storeId,
          senderMappingId: selected.senderId,
          campaignRecipientId: recipient.id,
          to: snapshot.normalizedPhone,
          purpose: "MARKETING",
          senderPurpose: "MARKETING",
          content: {
            type: "TEMPLATE",
            template: {
              key: recipient.campaign.templateDefinition.key,
              language: recipient.campaign.templateDefinition.language,
              version: recipient.campaign.templateDefinition.version,
            },
          },
          reference: { type: "WHATSAPP_CAMPAIGN_RECIPIENT", id: recipient.id },
        },
      });
      await this.queue.complete(job.recipientId, job.lockToken, result.messageId);
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Campaign dispatch failed";
      const retryable = !isWhatsAppError(error) || error.retryable;
      if (retryable && job.attempt < job.maxAttempts) {
        const delay = Math.min(60 * 60_000, 30_000 * 2 ** (job.attempt - 1));
        await this.queue.retry(
          job.recipientId,
          job.lockToken,
          reason,
          new Date(Date.now() + delay)
        );
      } else await this.queue.fail(job.recipientId, job.lockToken, reason);
    }
  }

  private async finish(campaignId: string) {
    const active = await this.db.whatsAppCampaignRecipient.count({
      where: { campaignId, status: { in: ["ELIGIBLE", "QUEUED", "PROCESSING"] } },
    });
    if (active) return;
    const failed = await this.db.whatsAppCampaignRecipient.count({
      where: { campaignId, status: "FAILED" },
    });
    await this.db.whatsAppCampaign.updateMany({
      where: { id: campaignId, status: { in: ["QUEUED", "RUNNING"] } },
      data: { status: failed ? "FAILED" : "COMPLETED", completedAt: new Date() },
    });
  }
}
