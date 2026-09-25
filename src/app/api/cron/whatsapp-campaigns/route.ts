import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import {
  createWhatsAppAutomationWorker,
  createWhatsAppCampaignExecutionService,
  createWhatsAppInvoiceDeliveryService,
} from "@/modules/whatsapp/server";
import { getDeploymentEnvironmentLabel } from "@/modules/whatsapp/invoiceDiagnostics";

export const runtime = "nodejs";
export const maxDuration = 60;
const validSecret = (expected: string | undefined, authorization: string | null) => {
  if (!expected || !authorization?.startsWith("Bearer ")) return false;
  const supplied = authorization.slice(7),
    a = Buffer.from(expected),
    b = Buffer.from(supplied);
  return a.length === b.length && timingSafeEqual(a, b);
};

export async function GET(request: Request) {
  const deploymentEnvironment = getDeploymentEnvironmentLabel();
  const secret = process.env.CRON_SECRET;
  if (!validSecret(secret, request.headers.get("authorization")))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    console.info("[WhatsApp Worker] worker_started", { deploymentEnvironment });
    const service = createWhatsAppCampaignExecutionService();
    const launched = await service.launchDue();
    const processed = await service.processBatch();
    const automation = createWhatsAppAutomationWorker();
    const automationEvents = await automation.scan();
    const automationProcessed = await automation.process();
    const invoices = await createWhatsAppInvoiceDeliveryService().processBatch();
    console.info("[WhatsApp Worker] worker_completed", { deploymentEnvironment, invoices });
    return NextResponse.json({ launched, ...processed, automationEvents, automationProcessed, invoices });
  } catch (error) {
    console.warn("[WhatsApp Worker] worker_failed", {
      deploymentEnvironment,
      errorCode:
        error instanceof Error && /^[A-Z0-9_]+$/.test(error.message)
          ? error.message
          : error instanceof Error
            ? error.name
            : "WHATSAPP_WORKER_FAILED",
    });
    return NextResponse.json({ error: "WhatsApp worker failed" }, { status: 500 });
  }
}
