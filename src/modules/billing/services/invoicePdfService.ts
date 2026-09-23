import "server-only";
import puppeteer from "puppeteer";
import { prisma } from "@/lib/db";
import { buildInvoiceDocumentHtml, type InvoiceDocumentKind } from "../invoiceDocument";

export type GeneratedInvoicePdf = { buffer: Buffer; filename: string; reference: string };

export async function generateInvoicePdf(input: {
  organizationId: string;
  storeId: string;
  kind: InvoiceDocumentKind;
  transactionId: string;
}): Promise<GeneratedInvoicePdf> {
  const store = await prisma.store.findFirst({
    where: { id: input.storeId, orgId: input.organizationId },
    select: { id: true, name: true },
  });
  if (!store) throw new Error("INVOICE_STORE_NOT_FOUND");

  let saleId = input.transactionId;
  if (input.kind === "EXCHANGE") {
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
  const transaction = input.kind === "EXCHANGE"
    ? sale.returnTransactions.find(item => item.id === input.transactionId)
    : undefined;
  const reference = transaction?.referenceNumber || sale.invoiceNumber;
  const html = buildInvoiceDocumentHtml({
    sale,
    storeName: store.name,
    kind: input.kind,
    returnTransactionId: input.kind === "EXCHANGE" ? input.transactionId : undefined,
  });

  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "domcontentloaded" });
    const pdf = await page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true });
    return { buffer: Buffer.from(pdf), filename: `${input.kind === "EXCHANGE" ? "exchange" : "invoice"}-${reference.replace(/[^a-z0-9_-]+/gi, "-")}.pdf`, reference };
  } finally {
    await browser.close();
  }
}
