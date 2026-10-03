import { NextResponse } from "next/server";
import {
  createWhatsAppAutomationWorker,
  createWhatsAppCampaignExecutionService,
} from "@/modules/whatsapp/server";
import { getDeploymentEnvironmentLabel } from "@/modules/whatsapp/invoiceDiagnostics";
import { hasValidCronAuthorization } from "@/lib/server/cronAuth";

export const runtime = "nodejs";
export const maxDuration = 60;
export async function GET(request: Request) {
  const deploymentEnvironment = getDeploymentEnvironmentLabel();
  const secret = process.env.CRON_SECRET;
  if (!hasValidCronAuthorization(secret, request.headers.get("authorization")))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    console.info("[WhatsApp Worker] worker_started", { deploymentEnvironment });
    const service = createWhatsAppCampaignExecutionService();
    const launched = await service.launchDue();
    const processed = await service.processBatch();
    const automation = createWhatsAppAutomationWorker();
    const automationEvents = await automation.scan();
    const automationProcessed = await automation.process();
    console.info("[WhatsApp Worker] worker_completed", { deploymentEnvironment });
    return NextResponse.json({ launched, ...processed, automationEvents, automationProcessed });
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
