import { NextResponse } from "next/server";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { prisma } from "@/lib/db";
import { createWhatsAppInvoiceDeliveryService } from "@/modules/whatsapp/server";
import { enqueueInvoiceDelivery, prepareInvoiceDelivery } from "@/modules/whatsapp/services/WhatsAppInvoiceDeliveryService";

export async function GET(request: Request) {
  const user = await requireOrgAuth().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const search = new URL(request.url).searchParams;
  const kind = search.get("kind") === "EXCHANGE" ? "EXCHANGE" : "SALE";
  const transactionId = search.get("transactionId");
  if (!transactionId) return NextResponse.json({ error: "Transaction is required" }, { status: 400 });
  const attempts = await prisma.whatsAppMessage.findMany({
    where: {
      organizationId: user.orgId,
      purpose: "INVOICE",
      referenceType: kind === "SALE" ? "SALE" : "RETURN_TRANSACTION",
      referenceId: transactionId,
    },
    select: { id: true, status: true, toPhone: true, errorCode: true, errorMessage: true, queuedAt: true, submittedAt: true, sentAt: true, deliveredAt: true, readAt: true, failedAt: true, templateInstance: { select: { metaTemplateName: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ attempts });
}

export async function POST(request: Request) {
  const user = await requireOrgAuth().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const kind = body?.kind === "EXCHANGE" ? "EXCHANGE" : body?.kind === "SALE" ? "SALE" : null;
  const transactionId = typeof body?.transactionId === "string" ? body.transactionId : null;
  const storeId = typeof body?.storeId === "string" ? body.storeId : user.storeId;
  if (!kind || !transactionId || !storeId) return NextResponse.json({ error: "Transaction and Store are required" }, { status: 400 });
  try {
    const prepared = await prepareInvoiceDelivery(prisma, {
      organizationId: user.orgId,
      storeId,
      selection: {
        enabled: true,
        recipient: typeof body?.recipient === "string" ? body.recipient : undefined,
        templateInstanceId: typeof body?.templateInstanceId === "string" ? body.templateInstanceId : undefined,
        consentConfirmed: body?.consentConfirmed === true,
      },
    });
    if (!prepared) throw new Error("WHATSAPP_INVOICE_DISABLED");
    let transactionInput;
    if (kind === "SALE") {
      const transaction = await prisma.sale.findFirst({ where: { id: transactionId, storeId, store: { orgId: user.orgId } }, select: { id: true, invoiceNumber: true, customerId: true, customerName: true, total: true } });
      if (!transaction) throw new Error("INVOICE_TRANSACTION_NOT_FOUND");
      transactionInput = { kind, id: transaction.id, reference: transaction.invoiceNumber, customerId: transaction.customerId, customerName: transaction.customerName, amount: Number(transaction.total), resend: true } as const;
    } else {
      const transaction = await prisma.returnTransaction.findFirst({ where: { id: transactionId, storeId, store: { orgId: user.orgId } }, select: { id: true, referenceNumber: true, customerId: true, netAmount: true, refundAmount: true, finalPayable: true, sale: { select: { customerName: true } } } });
      if (!transaction) throw new Error("INVOICE_TRANSACTION_NOT_FOUND");
      transactionInput = { kind, id: transaction.id, reference: transaction.referenceNumber, customerId: transaction.customerId, customerName: transaction.sale.customerName, amount: Number(transaction.netAmount || transaction.refundAmount || transaction.finalPayable || 0), resend: true } as const;
    }
    const message = await prisma.$transaction(tx => enqueueInvoiceDelivery(tx, prepared, transactionInput));
    let result: { status: string; errorCode?: string | null; errorMessage?: string | null } = message;
    try {
      result = await createWhatsAppInvoiceDeliveryService().processMessage(message.id);
    } catch {
      result = await prisma.whatsAppMessage.findUniqueOrThrow({ where: { id: message.id }, select: { status: true, errorCode: true, errorMessage: true } });
    }
    return NextResponse.json({ id: message.id, ...result }, { status: result.status === "FAILED" ? 202 : 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invoice delivery could not be queued" }, { status: 400 });
  }
}
