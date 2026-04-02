import { NextResponse } from "next/server";
import { alertService } from "@/modules/alerts/services/alertService";
import { requireOrgAuth } from "@/lib/auth.middleware";

export async function GET() {
  let user;
  try { user = await requireOrgAuth(); }
  catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  const configs = await alertService.list(user.orgId);
  return NextResponse.json(configs);
}

export async function POST(request: Request) {
  let user;
  try { user = await requireOrgAuth(); }
  catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  const body = await request.json();

  if (body.threshold == null || typeof body.threshold !== "number" || body.threshold < 0) {
    return NextResponse.json({ error: "A valid threshold is required" }, { status: 400 });
  }

  const config = await alertService.create(user.orgId, {
    productId: body.productId,
    categoryId: body.categoryId,
    threshold: body.threshold,
    notifyEmail: body.notifyEmail ?? true,
    notifySMS: body.notifySMS ?? false,
    isActive: body.isActive ?? true,
  });

  return NextResponse.json(config, { status: 201 });
}
