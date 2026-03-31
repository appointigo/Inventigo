import { NextResponse } from "next/server";
import { alertService } from "@/modules/alerts/services/alertService";

/**
 * Cron job: Check stock levels against alert configs and send notifications.
 * Runs daily at 8 AM via Vercel Cron (see vercel.json).
 */
export const GET = async (request: Request) => {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const lowStockItems = await alertService.checkStockLevels("test-org-001");
    const result = await alertService.sendAlerts(lowStockItems);
    return NextResponse.json({
      message: "Reorder check completed",
      lowStockCount: result.itemCount,
      emailSent: result.emailSent,
      smsSent: result.smsSent,
    });
  } 
  catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
