import { Role } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { stockTransferService } from "@/modules/stock-transfers/stockTransferService";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireOrgAuth().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (
    !(user.role === Role.OWNER || user.role === Role.ADMIN || user.role === Role.MANAGER) ||
    user.storeId
  )
    return NextResponse.json(
      { error: "Organization-wide transfer permission required" },
      { status: 403 }
    );
  const body = await request.json();
  if (body.action !== "CANCEL")
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  try {
    return NextResponse.json(await stockTransferService.cancel(user.orgId, (await params).id));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to cancel transfer" },
      { status: 409 }
    );
  }
}
