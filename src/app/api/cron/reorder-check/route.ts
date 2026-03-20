import { NextResponse } from "next/server";
import { alertService } from "@/modules/alerts/services/alertService";

/**
 * Cron job: Check stock levels against alert configs and send notifications.
 * Runs daily at 8 AM via Vercel Cron (see vercel.json).
 */
export async function GET(request: Request) {
  // Verify the request is from Vercel Cron
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const lowStockItems = await alertService.checkStockLevels();
  const result = await alertService.sendAlerts(lowStockItems);

  return NextResponse.json({
    message: "Reorder check completed",
    lowStockCount: result.itemCount,
    emailSent: result.emailSent,
    smsSent: result.smsSent,
  });
}
