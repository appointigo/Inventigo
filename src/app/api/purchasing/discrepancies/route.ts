import { resolveAnalyticsStore } from "@/modules/analytics/services/analyticsAccess";
import { purchaseError, requirePurchaseUser } from "@/modules/purchase-orders/purchaseRoute";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const user = await requirePurchaseUser("read");
    const requested = new URL(request.url).searchParams.get("storeId");
    const scope = requested || user.storeId ? await resolveAnalyticsStore(user, requested) : null;
    return Response.json(await prisma.purchaseDiscrepancy.findMany({
      where: { orgId: user.orgId, ...(scope?.storeId ? { storeId: scope.storeId } : {}) },
      include: {
        purchaseOrder: { select: { poNumber: true } },
        receipt: { select: { receiptNumber: true } },
        purchaseOrderItem: { select: { productNameSnapshot: true, sizeLabelSnapshot: true } },
        variant: true,
        claims: true,
      },
      orderBy: { createdAt: "desc" },
    }));
  } catch (error) {
    return purchaseError(error, "Unable to list receipt discrepancies");
  }
}
