import { Role } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { prisma } from "@/lib/db";
import { stockTransferService } from "@/modules/stock-transfers/stockTransferService";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireOrgAuth().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const transfer = await prisma.stockTransfer.findFirst({
    where: { id, orgId: user.orgId },
    select: { destinationStoreId: true },
  });
  if (!transfer) return NextResponse.json({ error: "Transfer not found" }, { status: 404 });
  const organizationRole =
    !user.storeId &&
    (user.role === Role.OWNER || user.role === Role.ADMIN || user.role === Role.MANAGER);
  if (!organizationRole && user.storeId !== transfer.destinationStoreId)
    return NextResponse.json(
      { error: "Only the destination store may receive this transfer" },
      { status: 403 }
    );
  try {
    const body = await request.json();
    return NextResponse.json(
      await stockTransferService.receive(user.orgId, id, user.id, body.items ?? [])
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to receive transfer" },
      { status: 409 }
    );
  }
}
