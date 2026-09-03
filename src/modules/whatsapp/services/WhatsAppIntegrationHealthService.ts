import type { PrismaClient } from "@prisma/client";

export class WhatsAppIntegrationHealthService {
  constructor(private readonly prisma: PrismaClient) {}
  async get(organizationId: string) {
    const [integration, webhook, lastSend, templates] = await Promise.all([
      this.prisma.whatsAppIntegration.findFirst({
        where: { organizationId },
        orderBy: { updatedAt: "desc" },
        select: {
          status: true,
          lastSyncedAt: true,
          businessAccounts: {
            select: {
              id: true,
              businessName: true,
              status: true,
              lastSyncedAt: true,
              phoneNumbers: {
                select: {
                  id: true,
                  displayPhoneNumber: true,
                  verifiedName: true,
                  status: true,
                  qualityRating: true,
                  lastSyncedAt: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.whatsAppWebhookEvent.findFirst({
        where: { organizationId, processingStatus: "PROCESSED" },
        orderBy: { processedAt: "desc" },
        select: { processedAt: true, eventType: true },
      }),
      this.prisma.whatsAppMessage.findFirst({
        where: {
          organizationId,
          direction: "OUTBOUND",
          status: { in: ["SUBMITTED", "SENT", "DELIVERED", "READ"] },
        },
        orderBy: { submittedAt: "desc" },
        select: {
          id: true,
          status: true,
          submittedAt: true,
          phoneNumber: { select: { displayPhoneNumber: true } },
        },
      }),
      this.prisma.whatsAppTemplateInstance.groupBy({
        by: ["status"],
        where: { waba: { integration: { organizationId } } },
        _count: { _all: true },
      }),
    ]);
    const phones = integration?.businessAccounts.flatMap((w) => w.phoneNumbers) ?? [],
      now = Date.now();
    const issues: Array<{
      code: string;
      severity: "warning" | "error";
      message: string;
      actionHref: string;
    }> = [];
    if (!integration || integration.status !== "CONNECTED")
      issues.push({
        code: "META_NOT_CONNECTED",
        severity: "error",
        message: "Connect or repair the Meta integration.",
        actionHref: "/dashboard/whatsapp",
      });
    if (integration?.businessAccounts.some((w) => w.status !== "ACTIVE"))
      issues.push({
        code: "WABA_NOT_ACTIVE",
        severity: "error",
        message: "A WhatsApp Business Account needs attention.",
        actionHref: "/dashboard/whatsapp/accounts",
      });
    if (phones.some((p) => p.status !== "ACTIVE"))
      issues.push({
        code: "PHONE_NOT_ACTIVE",
        severity: "error",
        message: "A phone number is not active.",
        actionHref: "/dashboard/whatsapp/phone-numbers",
      });
    if (!webhook)
      issues.push({
        code: "WEBHOOK_NEVER_RECEIVED",
        severity: "warning",
        message: "No processed webhook has been observed for this organization.",
        actionHref: "/dashboard/whatsapp/health",
      });
    else if (webhook.processedAt && now - webhook.processedAt.getTime() > 24 * 60 * 60_000)
      issues.push({
        code: "WEBHOOK_STALE",
        severity: "warning",
        message: "Webhook activity has not been observed in the last 24 hours.",
        actionHref: "/dashboard/whatsapp/health",
      });
    if (
      templates.some(
        (t) => t.status === "REJECTED" || t.status === "DISABLED" || t.status === "PAUSED"
      )
    )
      issues.push({
        code: "TEMPLATE_ACTION_REQUIRED",
        severity: "error",
        message: "One or more templates require action.",
        actionHref: "/dashboard/whatsapp/templates",
      });
    return {
      overallStatus: issues.some((i) => i.severity === "error")
        ? "ACTION_REQUIRED"
        : issues.length
          ? "ATTENTION"
          : "HEALTHY",
      connection: integration
        ? { status: integration.status, lastSyncedAt: integration.lastSyncedAt }
        : null,
      wabas: integration?.businessAccounts ?? [],
      phones,
      webhook: webhook ?? null,
      templates: templates.map((t) => ({ status: t.status, count: t._count._all })),
      lastSuccessfulSend: lastSend,
      issues,
    };
  }
}
