import { NextResponse } from "next/server";
import {
  createWhatsAppAutomationWorker,
  createWhatsAppCampaignExecutionService,
} from "@/modules/whatsapp/server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const service = createWhatsAppCampaignExecutionService();
    const launched = await service.launchDue();
    const processed = await service.processBatch();
    const automation = createWhatsAppAutomationWorker();
    const automationEvents = await automation.scan();
    const automationProcessed = await automation.process();
    return NextResponse.json({ launched, ...processed, automationEvents, automationProcessed });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Campaign worker failed" },
      { status: 500 }
    );
  }
}
