import { NextResponse } from "next/server";
import { promoService } from "@/modules/promo-codes/services/promoService";
import { requireOrgAuth } from "@/lib/auth.middleware";

export const GET = async () => {
  let user;
  try {
    user = await requireOrgAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const promos = await promoService.list(user.orgId);
    return NextResponse.json(promos);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
};

export const POST = async (request: Request) => {
  let user;
  try {
    user = await requireOrgAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();

    if (!body.code || typeof body.code !== "string") {
      return NextResponse.json({ error: "code is required" }, { status: 400 });
    }
    if (!body.label || typeof body.label !== "string") {
      return NextResponse.json({ error: "label is required" }, { status: 400 });
    }
    if (body.discountPct == null || typeof body.discountPct !== "number" || body.discountPct <= 0 || body.discountPct > 100) {
      return NextResponse.json({ error: "discountPct must be a number between 1 and 100" }, { status: 400 });
    }

    const promo = await promoService.create(user.orgId, body);
    return NextResponse.json(promo, { status: 201 });
  } catch (err: unknown) {
    console.error("[promo-codes POST]", err);
    const message = err instanceof Error ? err.message : String(err);
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code: string }).code === "P2002"
    ) {
      return NextResponse.json({ error: "A promo with this code already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
};
