import type { PrismaClient } from "@prisma/client";

export class WhatsAppCampaignMetricsService {
  constructor(private readonly db: PrismaClient) {}

  async get(organizationId: string, campaignId: string) {
    const campaign = await this.db.whatsAppCampaign.findFirst({
      where: { id: campaignId, organizationId },
      select: { id: true, status: true },
    });
    if (!campaign) throw new Error("Campaign not found");
    const grouped = await this.db.whatsAppCampaignRecipient.groupBy({
      by: ["status"],
      where: { campaignId },
      _count: true,
    });
    const metrics = { queued: 0, sent: 0, delivered: 0, read: 0, failed: 0, skipped: 0 };
    for (const row of grouped) {
      if (row.status === "SKIPPED" || row.status === "EXCLUDED") metrics.skipped += row._count;
      else if (row.status === "FAILED") metrics.failed += row._count;
      else if (row.status === "READ") metrics.read += row._count;
      else if (row.status === "DELIVERED") metrics.delivered += row._count;
      else if (row.status === "SENT" || row.status === "SUBMITTED") metrics.sent += row._count;
      else metrics.queued += row._count;
    }
    return { campaignId, status: campaign.status, ...metrics };
  }
}
