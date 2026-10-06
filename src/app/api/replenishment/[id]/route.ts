import { Role } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { prisma } from "@/lib/db";
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireOrgAuth().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(user.role === Role.OWNER || user.role === Role.ADMIN || user.role === Role.MANAGER))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const body = await request.json();
  if (!["OPEN", "ACCEPTED", "DISMISSED", "IGNORED"].includes(body.disposition))
    return NextResponse.json({ error: "Invalid disposition" }, { status: 400 });
  const existing = await prisma.replenishmentRecommendation.findFirst({
    where: { id, orgId: user.orgId, ...(user.storeId ? { storeId: user.storeId } : {}) },
    select: { id: true, storeId: true },
  });
  if (!existing) return NextResponse.json({ error: "Recommendation not found" }, { status: 404 });
  if (body.linkedPurchaseOrderId) {
    const purchaseOrder = await prisma.purchaseOrder.findFirst({
      where: {
        id: body.linkedPurchaseOrderId,
        storeId: existing.storeId,
        store: { orgId: user.orgId },
      },
      select: { id: true },
    });
    if (!purchaseOrder)
      return NextResponse.json({ error: "Purchase order not found" }, { status: 404 });
  }
  return NextResponse.json(
    await prisma.replenishmentRecommendation.update({
      where: { id },
      data: {
        disposition: body.disposition,
        linkedPurchaseOrderId: body.linkedPurchaseOrderId || undefined,
      },
    })
  );
}
