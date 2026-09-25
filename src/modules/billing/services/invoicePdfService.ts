import "server-only";
import { prisma } from "@/lib/db";
import { renderInvoicePdf } from "../invoicePdfDocument";
import type { InvoiceDocumentKind } from "../invoiceDocumentModel";
import { getDeploymentEnvironmentLabel } from "@/modules/whatsapp/invoiceDiagnostics";

export type GeneratedInvoicePdf = { buffer: Buffer; filename: string; reference: string };

export async function generateInvoicePdf(input: {
  correlationId?: string;
  messageId?: string;
  organizationId: string;
  storeId: string;
  kind: InvoiceDocumentKind;
  transactionId: string;
}): Promise<GeneratedInvoicePdf> {
  const startedAt = Date.now();
  const deploymentEnvironment = getDeploymentEnvironmentLabel();
  const store = await prisma.store.findFirst({
    where: { id: input.storeId, orgId: input.organizationId },
    select: { id: true, name: true, address: true, phone: true },
  });
  if (!store) throw new Error("INVOICE_STORE_NOT_FOUND");

  let saleId = input.transactionId;
  if (input.kind !== "SALE") {
    const transaction = await prisma.returnTransaction.findFirst({
      where: { id: input.transactionId, storeId: input.storeId, store: { orgId: input.organizationId } },
      select: { originalSaleId: true },
    });
    if (!transaction) throw new Error("INVOICE_TRANSACTION_NOT_FOUND");
    saleId = transaction.originalSaleId;
  }
  const { billingService } = await import("./billingService");
  const sale = await billingService.getSaleById(input.organizationId, saleId);
  if (!sale) throw new Error("INVOICE_TRANSACTION_NOT_FOUND");
  const transaction = input.kind !== "SALE"
    ? sale.returnTransactions.find(item => item.id === input.transactionId)
    : undefined;
  const reference = transaction?.referenceNumber || sale.invoiceNumber;
  console.info("[WhatsApp Invoice] invoice_data_loaded", {
    requestId: input.correlationId,
    deliveryId: input.messageId,
    deploymentEnvironment,
    organizationId: input.organizationId,
    storeId: input.storeId,
    transactionId: input.transactionId,
    transactionType: input.kind,
    reference,
    transactionStatus: input.kind === "SALE" ? sale.status : transaction?.type,
    paymentStatus: sale.paymentStatus,
    elapsedMs: Date.now() - startedAt,
  });
  console.info("[WhatsApp Invoice] invoice_render_started", {
    requestId: input.correlationId,
    deliveryId: input.messageId,
    deploymentEnvironment,
    transactionId: input.transactionId,
    reference,
  });
  const buffer = await renderInvoicePdf({
    sale,
    merchant: store,
    kind: input.kind,
    returnTransactionId: input.kind !== "SALE" ? input.transactionId : undefined,
    configuration: transaction?.invoiceSnapshot ?? sale.invoiceSnapshot,
  });
  console.info("[WhatsApp Invoice] invoice_render_completed", {
    requestId: input.correlationId,
    deliveryId: input.messageId,
    deploymentEnvironment,
    transactionId: input.transactionId,
    reference,
    elapsedMs: Date.now() - startedAt,
  });

  console.info("[WhatsApp Invoice] pdf_generation_started", {
    requestId: input.correlationId,
    deliveryId: input.messageId,
    deploymentEnvironment,
    transactionId: input.transactionId,
    reference,
  });
  const filename = `${input.kind === "SALE" ? "invoice" : input.kind.toLowerCase()}-${reference.replace(/[^a-z0-9_-]+/gi, "-")}.pdf`;
  console.info("[WhatsApp Invoice] pdf_generation_completed", {
    requestId: input.correlationId,
    deliveryId: input.messageId,
    deploymentEnvironment,
    transactionId: input.transactionId,
    reference,
    filename,
    byteLength: buffer.byteLength,
    elapsedMs: Date.now() - startedAt,
  });
  const signatureValid = buffer.subarray(0, 5).toString("ascii") === "%PDF-";
  console.info("[WhatsApp Invoice] pdf_validation_completed", {
    requestId: input.correlationId,
    deliveryId: input.messageId,
    deploymentEnvironment,
    transactionId: input.transactionId,
    reference,
    filename,
    byteLength: buffer.byteLength,
    signatureValid,
    elapsedMs: Date.now() - startedAt,
  });
  if (!signatureValid) throw new Error("INVOICE_PDF_INVALID");
  return { buffer, filename, reference };
}
