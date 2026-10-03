import { NextResponse } from "next/server";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { billingService } from "@/modules/billing/services/billingService";
import { generateInvoicePdf } from "@/modules/billing/services/invoicePdfService";
import { canAccessCustomerInvoice } from "@/modules/customers/customerInvoiceAccess";
import type { InvoiceDocumentKind } from "@/modules/billing/invoiceDocumentModel";

const kinds: InvoiceDocumentKind[] = ["SALE", "RETURN", "EXCHANGE"];

export async function GET(
  request: Request,
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
  const { searchParams } = new URL(request.url);
  const kind = (searchParams.get("kind") ?? "SALE") as InvoiceDocumentKind;
  const transactionId = searchParams.get("transactionId") ?? sale.id;
  if (!kinds.includes(kind))
    return NextResponse.json({ error: "Invalid invoice kind" }, { status: 400 });
  if (
    kind === "SALE"
      ? transactionId !== sale.id
      : !sale.returnTransactions.some(
          (item) =>
            item.id === transactionId &&
            (kind === "EXCHANGE"
              ? item.exchangedItems.length > 0
              : item.exchangedItems.length === 0)
        )
  )
    return NextResponse.json({ error: "Invoice transaction not found" }, { status: 404 });
  try {
    const generated = await generateInvoicePdf({
      organizationId: user.orgId,
      storeId: sale.storeId,
      kind,
      transactionId,
    });
    return new NextResponse(new Uint8Array(generated.buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${generated.filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Invoice PDF could not be generated" }, { status: 500 });
  }
}
