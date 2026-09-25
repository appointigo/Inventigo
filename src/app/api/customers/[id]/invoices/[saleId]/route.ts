import { NextResponse } from "next/server";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { billingService } from "@/modules/billing/services/billingService";
import { canAccessCustomerInvoice } from "@/modules/customers/customerInvoiceAccess";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string; saleId: string }> }
) {
  const user = await requireOrgAuth().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, saleId } = await context.params;
  const sale = await billingService.getSaleById(user.orgId, decodeURIComponent(saleId));
  if (
    !sale ||
    !canAccessCustomerInvoice({
      customerId: decodeURIComponent(id),
      saleCustomerId: sale.customerId,
      saleStoreId: sale.storeId,
      authorizedStoreId: user.storeId,
    })
  )
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  return NextResponse.json(sale);
}
