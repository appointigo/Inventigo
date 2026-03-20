import { NextResponse } from "next/server";

/**
 * Cron job: Check stock levels and create alerts for low-stock items.
 * Runs daily via Vercel Cron. Full implementation in Phase 6.
 */
export async function GET(request: Request) {
  // Verify the request is from Vercel Cron
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // TODO: Phase 6 — query AlertConfig, check stock levels, send notifications
  return NextResponse.json({ message: "Reorder check stub — Phase 6" });
}
