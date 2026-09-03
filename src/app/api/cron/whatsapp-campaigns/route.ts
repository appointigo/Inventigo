import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import {
  createWhatsAppAutomationWorker,
  createWhatsAppCampaignExecutionService,
} from "@/modules/whatsapp/server";

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
  const secret = process.env.CRON_SECRET;
  if (!validSecret(secret, request.headers.get("authorization")))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const service = createWhatsAppCampaignExecutionService();
    const launched = await service.launchDue();
    const processed = await service.processBatch();
    const automation = createWhatsAppAutomationWorker();
    const automationEvents = await automation.scan();
    const automationProcessed = await automation.process();
    return NextResponse.json({ launched, ...processed, automationEvents, automationProcessed });
  } catch {
    return NextResponse.json({ error: "WhatsApp worker failed" }, { status: 500 });
  }
}
