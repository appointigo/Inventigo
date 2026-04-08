import { NextResponse } from "next/server";
import { promoService } from "@/modules/promo-codes/services/promoService";
import { requireOrgAuth } from "@/lib/auth.middleware";

export const PATCH = async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  let user;
  try {
    user = await requireOrgAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();

    if (body.discountPct !== undefined && (typeof body.discountPct !== "number" || body.discountPct <= 0 || body.discountPct > 100)) {
      return NextResponse.json({ error: "discountPct must be a number between 1 and 100" }, { status: 400 });
    }

    const promo = await promoService.update(user.orgId, id, body);
    if (!promo) return NextResponse.json({ error: "Promo not found" }, { status: 404 });
    return NextResponse.json(promo);
  } catch (err: unknown) {
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code: string }).code === "P2002"
    ) {
      return NextResponse.json({ error: "A promo with this code already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
};

export const DELETE = async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
  let user;
  try {
    user = await requireOrgAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const deleted = await promoService.delete(user.orgId, id);
    if (!deleted) return NextResponse.json({ error: "Promo not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
};
