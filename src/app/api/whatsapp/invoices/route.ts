import { NextResponse } from "next/server";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { prisma } from "@/lib/db";
import { createWhatsAppInvoiceDeliveryService } from "@/modules/whatsapp/server";
import { enqueueInvoiceDelivery, prepareInvoiceDelivery } from "@/modules/whatsapp/services/WhatsAppInvoiceDeliveryService";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  const user = await requireOrgAuth().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized", requestId }, { status: 401, headers: { "x-request-id": requestId } });
  const search = new URL(request.url).searchParams;
  const kind = search.get("kind") === "EXCHANGE" ? "EXCHANGE" : "SALE";
  const transactionId = search.get("transactionId");
  if (!transactionId) return NextResponse.json({ error: "Transaction is required", requestId }, { status: 400, headers: { "x-request-id": requestId } });
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
  return NextResponse.json({ attempts, requestId }, { headers: { "x-request-id": requestId } });
}
export async function POST(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  const startedAt = Date.now();
  const user = await requireOrgAuth().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized", requestId }, { status: 401, headers: { "x-request-id": requestId } });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const kind = body?.kind === "EXCHANGE" ? "EXCHANGE" : body?.kind === "SALE" ? "SALE" : null;
  const transactionId = typeof body?.transactionId === "string" ? body.transactionId : null;
  const storeId = typeof body?.storeId === "string" ? body.storeId : user.storeId;
  if (!kind || !transactionId || !storeId) return NextResponse.json({ error: "Transaction and Store are required", requestId }, { status: 400, headers: { "x-request-id": requestId } });
  console.info("[WhatsApp Invoice] resend_requested", { requestId, organizationId: user.orgId, storeId, transactionId, transactionType: kind });
  try {
    const prepared = await prepareInvoiceDelivery(prisma, {
      organizationId: user.orgId,
      storeId,
      transactionKind: kind,
      selection: {
        enabled: true,
        recipient: typeof body?.recipient === "string" ? body.recipient : undefined,
        templateInstanceId: typeof body?.templateInstanceId === "string" ? body.templateInstanceId : undefined,
        consentConfirmed: body?.consentConfirmed === true,
      },
      correlationId: requestId,
    });
    if (!prepared) throw new Error("WHATSAPP_INVOICE_DISABLED");
    let transactionInput;
    if (kind === "SALE") {
      const transaction = await prisma.sale.findFirst({ where: { id: transactionId, storeId, store: { orgId: user.orgId } }, select: { id: true, invoiceNumber: true, customerId: true, customerName: true, total: true, transactionDate: true } });
      if (!transaction) throw new Error("INVOICE_TRANSACTION_NOT_FOUND");
      transactionInput = { kind, id: transaction.id, reference: transaction.invoiceNumber, customerId: transaction.customerId, customerName: transaction.customerName, amount: Number(transaction.total), transactionDate: transaction.transactionDate, resend: true } as const;
    } else {
      const transaction = await prisma.returnTransaction.findFirst({ where: { id: transactionId, storeId, store: { orgId: user.orgId } }, select: { id: true, referenceNumber: true, customerId: true, netAmount: true, refundAmount: true, finalPayable: true, transactionDate: true, businessDate: true, sale: { select: { customerName: true } } } });
      if (!transaction) throw new Error("INVOICE_TRANSACTION_NOT_FOUND");
      transactionInput = { kind, id: transaction.id, reference: transaction.referenceNumber, customerId: transaction.customerId, customerName: transaction.sale.customerName, amount: Number(transaction.netAmount || transaction.refundAmount || transaction.finalPayable || 0), transactionDate: transaction.transactionDate ?? transaction.businessDate, resend: true } as const;
    }
    const message = await prisma.$transaction(tx => enqueueInvoiceDelivery(tx, prepared, transactionInput));
    let result: { status: string; errorCode?: string | null; errorMessage?: string | null } = message;
    try {
      result = await createWhatsAppInvoiceDeliveryService().processMessage(message.id);
    } catch {
      result = await prisma.whatsAppMessage.findUniqueOrThrow({ where: { id: message.id }, select: { status: true, errorCode: true, errorMessage: true } });
    }
    const status = result.status === "FAILED" ? 202 : 201;
    console.info("[WhatsApp Invoice] resend_response", { requestId, organizationId: user.orgId, storeId, transactionId, transactionType: kind, messageId: message.id, deliveryStatus: result.status, errorCode: result.errorCode, httpStatus: status, durationMs: Date.now() - startedAt });
    return NextResponse.json({ id: message.id, ...result, requestId }, { status, headers: { "x-request-id": requestId } });
  } catch (error) {
    const errorCode = error instanceof Error ? error.message : "INVOICE_DELIVERY_QUEUE_FAILED";
    console.warn("[WhatsApp Invoice] resend_failed", { requestId, organizationId: user.orgId, storeId, transactionId, transactionType: kind, errorCode, httpStatus: 400, durationMs: Date.now() - startedAt });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invoice delivery could not be queued", requestId }, { status: 400, headers: { "x-request-id": requestId } });
  }
}
