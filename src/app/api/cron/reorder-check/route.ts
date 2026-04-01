import { NextResponse } from "next/server";
import { alertService } from "@/modules/alerts/services/alertService";
import { prisma } from "@/lib/db";

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
    const orgs = await prisma.organization.findMany({ select: { id: true } });
    let totalLowStock = 0;

    for (const org of orgs) {
      const lowStockItems = await alertService.checkStockLevels(org.id);
      const result = await alertService.sendAlerts(org.id, lowStockItems);
      totalLowStock += result.itemCount;
    }

    return NextResponse.json({
      message: "Reorder check completed",
      orgsChecked: orgs.length,
      totalLowStockCount: totalLowStock,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
