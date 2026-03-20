import { NextResponse } from "next/server";
import { alertService } from "@/modules/alerts/services/alertService";

export async function GET() {
  const configs = await alertService.list();
  return NextResponse.json(configs);
}

export async function POST(request: Request) {
  const body = await request.json();

  if (body.threshold == null || typeof body.threshold !== "number" || body.threshold < 0) {
    return NextResponse.json({ error: "A valid threshold is required" }, { status: 400 });
  }

  const config = await alertService.create({
    productId: body.productId,
    categoryId: body.categoryId,
    threshold: body.threshold,
    notifyEmail: body.notifyEmail ?? true,
    notifySMS: body.notifySMS ?? false,
    isActive: body.isActive ?? true,
  });

  return NextResponse.json(config, { status: 201 });
}
