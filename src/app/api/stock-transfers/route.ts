import { Role, StockTransferStatus, type Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { stockTransferService } from "@/modules/stock-transfers/stockTransferService";

export async function GET(request: Request) {
  const user = await requireOrgAuth().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rawStatus = new URL(request.url).searchParams.get("status");
  const status =
    rawStatus && Object.values(StockTransferStatus).includes(rawStatus as StockTransferStatus)
      ? (rawStatus as StockTransferStatus)
      : undefined;
  return NextResponse.json(await stockTransferService.list(user.orgId, user.storeId, status));
}

export async function POST(request: Request) {
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
  try {
    const body = await request.json();
    return NextResponse.json(
      await stockTransferService.create({
        orgId: user.orgId,
        sourceStoreId: body.sourceStoreId,
        destinationStoreId: body.destinationStoreId,
        requestedById: user.id,
        notes: body.notes,
        expectedArrivalAt: body.expectedArrivalAt ? new Date(body.expectedArrivalAt) : undefined,
        recommendationEvidence: body.recommendationEvidence as Prisma.InputJsonValue,
        items: body.items ?? [],
      }),
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create transfer" },
      { status: 400 }
    );
  }
}
