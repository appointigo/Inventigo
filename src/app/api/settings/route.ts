import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { settingsService } from "@/modules/settings/services/settingsService";
import { requireAuth, requireRole } from "@/lib/auth.middleware";

export async function GET() {
  try {
    await requireAuth();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unauthorized";
    return NextResponse.json({ error: msg }, { status: 401 });
  }
  const settings = await settingsService.getSettings();
  return NextResponse.json(settings);
}

export async function PUT(request: Request) {
  try {
    await requireRole(Role.ADMIN);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Forbidden";
    return NextResponse.json({ error: msg }, { status: msg === "Unauthorized" ? 401 : 403 });
  }
  const body = await request.json();
  const config = body.billingConfig ?? body;
  const settings = await settingsService.updateBillingConfig(config);
  return NextResponse.json(settings);
}
