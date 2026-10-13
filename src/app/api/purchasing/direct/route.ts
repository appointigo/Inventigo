import { resolveAnalyticsStore } from "@/modules/analytics/services/analyticsAccess";
import { createPurchaseOrderSchema } from "@/modules/purchase-orders/purchaseContracts";
import { directPurchaseDetailsSchema } from "@/modules/purchase-orders/purchaseManagementContracts";
import { purchaseError, requirePurchaseUser } from "@/modules/purchase-orders/purchaseRoute";
import { directPurchaseService } from "@/modules/purchase-orders/services/directPurchaseService";

export async function POST(request: Request) {
  try {
    const user = await requirePurchaseUser("manage");
    const body = await request.json();
    const purchase = createPurchaseOrderSchema.parse({
      storeId: body.storeId,
      supplierId: body.supplierId,
      notes: body.notes,
      deliveryInstructions: body.deliveryInstructions,
      orderDate: body.orderDate,
      expectedDeliveryDate: body.expectedDeliveryDate,
      items: body.items,
    });
    const details = directPurchaseDetailsSchema.parse({
      idempotencyKey: body.idempotencyKey,
      supplierInvoiceNumber: body.supplierInvoiceNumber,
      invoiceDate: body.invoiceDate,
      dueDate: body.dueDate,
      payment: body.payment,
      resolutions: body.resolutions,
    });
    const scope = await resolveAnalyticsStore(user, purchase.storeId);
    return Response.json(await directPurchaseService.confirm(user.orgId, user.id, { ...purchase, ...details }, scope.storeId), { status: 201 });
  } catch (error) {
    return purchaseError(error, "Unable to confirm direct purchase");
  }
}
