import { Role } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { stockTransferService } from "@/modules/stock-transfers/stockTransferService";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireOrgAuth().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (
    !(user.role === Role.OWNER || user.role === Role.ADMIN || user.role === Role.MANAGER) ||
    user.storeId
  )
    return NextResponse.json(
      { error: "Organization-wide approval permission required" },
      { status: 403 }
    );
  try {
    return NextResponse.json(
      await stockTransferService.approve(user.orgId, (await params).id, user.id)
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to approve transfer" },
      { status: 409 }
    );
  }
}
