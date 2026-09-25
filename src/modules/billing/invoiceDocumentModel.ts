import type { ReturnTransactionHistory, ReturnTransactionItem, Sale, SaleItem } from "./types";
import type { InvoiceConfigurationSnapshot } from "@/modules/invoice-management/types";

export type InvoiceDocumentKind = "SALE" | "EXCHANGE";

export type InvoiceMerchant = {
  name: string;
  address?: string | null;
  phone?: string | null;
};

export type InvoiceDocumentInput = {
  sale: Sale;
  merchant: InvoiceMerchant;
  kind?: InvoiceDocumentKind;
  returnTransactionId?: string;
  configuration?: InvoiceConfigurationSnapshot;
};

export type InvoiceTableRow = {
  index: number;
  name: string;
  detail: string;
  quantity: number;
  unitPrice?: string;
  total: string;
};

export type InvoiceSection = {
  title?: string;
  rows: InvoiceTableRow[];
  showUnitPrice: boolean;
};

export type InvoiceTotalRow = {
  label: string;
  value: string;
  emphasis?: boolean;
};

export type InvoiceDocumentModel = {
  kind: InvoiceDocumentKind;
  title: string;
  merchant: InvoiceMerchant;
  reference: string;
  issuedAt: string;
  originalInvoice?: string;
  paymentMethod: string;
  customerName?: string;
  customerPhone?: string;
  status: string;
  sections: InvoiceSection[];
  totals: InvoiceTotalRow[];
  designKey: InvoiceConfigurationSnapshot["design"]["key"];
  termsText?: string;
  returnPolicyText?: string;
  thankYouMessage?: string;
};

export const formatInvoiceMoney = (value: number) =>
  `INR ${new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value || 0))}`;

export const formatInvoiceDateTime = (value: string) =>
  new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

const saleRows = (items: SaleItem[]): InvoiceTableRow[] => items.map((item, index) => ({
  index: index + 1,
  name: item.productName || item.sku || "Product",
  detail: [item.sku, item.sizeLabel].filter(Boolean).join(" - "),
  quantity: item.quantity,
  unitPrice: formatInvoiceMoney(Number(item.finalUnitPrice ?? item.sellingPrice ?? item.unitPrice)),
  total: formatInvoiceMoney(Number(item.finalLineAmount ?? item.total)),
}));

const transactionRows = (items: ReturnTransactionItem[]): InvoiceTableRow[] => items.map((item, index) => ({
  index: index + 1,
  name: item.productName || item.sku || item.productId || "Product",
  detail: [item.sku, item.sizeLabel || item.sizeId].filter(Boolean).join(" - "),
  quantity: item.quantity,
  total: formatInvoiceMoney(item.total),
}));

const paymentTotals = (
  payments: Array<{ method: string; amount: number }>,
  direction = "Payment"
): InvoiceTotalRow[] => payments.map(payment => ({
  label: `${direction} - ${payment.method}`,
  value: formatInvoiceMoney(payment.amount),
}));

function buildExchangeSections(transaction: ReturnTransactionHistory): InvoiceSection[] {
  const sections: InvoiceSection[] = [{
    title: "Returned items",
    rows: transactionRows(transaction.returnedItems ?? []),
    showUnitPrice: false,
  }];
  if (transaction.exchangedItems?.length) {
    sections.push({
      title: "Replacement items",
      rows: transactionRows(transaction.exchangedItems),
      showUnitPrice: false,
    });
  }
  return sections;
}

function buildExchangeTotals(transaction: ReturnTransactionHistory): InvoiceTotalRow[] {
  const replacements = transaction.exchangedItems ?? [];
  const replacementSubtotal = replacements.reduce((sum, item) => sum + Number(item.total || 0), 0);
  const discountAmount = Number(transaction.discountAmount ?? 0);
  const calculatedTotal = Number(transaction.calculatedTotal ?? transaction.finalPayable ?? replacementSubtotal);
  const taxAmount = Math.max(calculatedTotal - Math.max(replacementSubtotal - discountAmount, 0), 0);
  const totals: InvoiceTotalRow[] = [];
  if (replacements.length) totals.push({ label: "Replacement subtotal", value: formatInvoiceMoney(replacementSubtotal) });
  if (discountAmount > 0) totals.push({ label: "Exchange discount", value: `-${formatInvoiceMoney(discountAmount)}` });
  if (taxAmount > 0) {
    const rate = Number(transaction.taxRate ?? 0);
    totals.push({ label: `Tax${rate > 0 ? ` (${rate}%)` : ""}`, value: formatInvoiceMoney(taxAmount) });
  }
  if (Number(transaction.roundOffAmount ?? 0) !== 0) {
    totals.push({ label: "Round off", value: formatInvoiceMoney(Number(transaction.roundOffAmount)) });
  }
  if (transaction.finalPayable != null) {
    totals.push({ label: "Replacement total", value: formatInvoiceMoney(transaction.finalPayable) });
  }
  if (transaction.netAmount > 0) {
    totals.push({ label: "Additional payment", value: formatInvoiceMoney(transaction.netAmount), emphasis: true });
  } else if (transaction.refundAmount > 0) {
    totals.push({ label: "Refund", value: formatInvoiceMoney(transaction.refundAmount), emphasis: true });
  } else {
    totals.push({ label: "Settlement", value: "Equal value", emphasis: true });
  }
  const topUps = transaction.splitPaymentData?.topUpPayments ?? [];
  const refunds = transaction.splitPaymentData?.refundPayments ?? [];
  totals.push(...paymentTotals(topUps, "Top-up"), ...paymentTotals(refunds, "Refund"));
  if (!topUps.length && !refunds.length && transaction.refundMethod) {
    totals.push({ label: "Settlement method", value: transaction.refundMethod });
  }
  return totals;
}

function buildSaleTotals(sale: Sale): InvoiceTotalRow[] {
  const invoiceSubtotal = sale.items.every(item => item.netLineAmount != null)
    ? sale.items.reduce((sum, item) => sum + Number(item.taxableAmount ?? 0), 0) + sale.discountAmount
    : sale.subtotal;
  const totals: InvoiceTotalRow[] = [{ label: "Subtotal", value: formatInvoiceMoney(invoiceSubtotal) }];
  if (sale.discountAmount > 0) totals.push({ label: "Discount", value: `-${formatInvoiceMoney(sale.discountAmount)}` });
  if (sale.taxAmount > 0) totals.push({ label: "Tax", value: formatInvoiceMoney(sale.taxAmount) });
  if (sale.payments?.length) {
    totals.push(...paymentTotals(sale.payments));
  } else {
    totals.push({ label: "Payment method", value: sale.paymentMethod });
  }
  totals.push({ label: "Amount paid", value: formatInvoiceMoney(sale.amountPaid) });
  if (sale.amountDue > 0) totals.push({ label: "Amount due", value: formatInvoiceMoney(sale.amountDue) });
  totals.push({ label: "Final total", value: formatInvoiceMoney(sale.total), emphasis: true });
  return totals;
}

export function buildInvoiceDocumentModel(input: InvoiceDocumentInput): InvoiceDocumentModel {
  const kind = input.kind ?? "SALE";
  const transaction = kind === "EXCHANGE"
    ? input.sale.returnTransactions.find(item => item.id === input.returnTransactionId)
    : undefined;
  if (kind === "EXCHANGE" && !transaction) throw new Error("Exchange transaction was not found on the sale");
  const configuration = input.configuration ?? transaction?.invoiceSnapshot ?? input.sale.invoiceSnapshot;

  return {
    kind,
    title: transaction ? "Exchange / Return Receipt" : "Tax Invoice",
    merchant: input.merchant,
    reference: transaction?.referenceNumber || input.sale.invoiceNumber,
    issuedAt: formatInvoiceDateTime(
      transaction?.transactionDate || transaction?.businessDate || transaction?.createdAt || input.sale.transactionDate
    ),
    originalInvoice: transaction ? input.sale.invoiceNumber : undefined,
    paymentMethod: input.sale.paymentMethod,
    customerName: input.sale.customerName || undefined,
    customerPhone: input.sale.customerPhone || undefined,
    status: transaction?.type || input.sale.status,
    sections: transaction
      ? buildExchangeSections(transaction)
      : [{ rows: saleRows(input.sale.items), showUnitPrice: true }],
    totals: transaction ? buildExchangeTotals(transaction) : buildSaleTotals(input.sale),
    designKey: configuration?.design.key ?? "CLASSIC",
    termsText: configuration?.policy.termsText ?? undefined,
    returnPolicyText: configuration?.policy.returnPolicyText ?? undefined,
    thankYouMessage: configuration?.policy.thankYouMessage ?? undefined,
  };
}
