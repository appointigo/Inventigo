import type { ReturnTransactionHistory, ReturnTransactionItem, Sale, SaleItem } from "./types";

export type InvoiceDocumentKind = "SALE" | "EXCHANGE";

export type InvoiceDocumentInput = {
  sale: Sale;
  storeName: string;
  kind?: InvoiceDocumentKind;
  returnTransactionId?: string;
};

const money = (value: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(value || 0));

const dateTime = (value: string) =>
  new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const saleItemRows = (items: SaleItem[]) =>
  items.map((item, index) => {
    const unit = Number(item.finalUnitPrice ?? item.sellingPrice ?? item.unitPrice);
    const total = Number(item.finalLineAmount ?? item.total);
    return `<tr><td>${index + 1}</td><td><strong>${escapeHtml(item.productName)}</strong><small>${escapeHtml(item.sku)} · ${escapeHtml(item.sizeLabel)}</small></td><td class="number">${money(unit)}</td><td class="number">${item.quantity}</td><td class="number">${money(total)}</td></tr>`;
  }).join("");

const transactionRows = (items: ReturnTransactionItem[]) =>
  items.map((item, index) => `<tr><td>${index + 1}</td><td><strong>${escapeHtml(item.productName || item.sku || item.productId || "Product")}</strong><small>${escapeHtml([item.sku, item.sizeLabel || item.sizeId].filter(Boolean).join(" · "))}</small></td><td class="number">${item.quantity}</td><td class="number">${money(item.total)}</td></tr>`).join("");

const paymentRows = (payments: Array<{ method: string; amount: number }>, direction = "Payment") =>
  payments.map(payment => `<div><span>${escapeHtml(direction)} · ${escapeHtml(payment.method)}</span><strong>${money(payment.amount)}</strong></div>`).join("");

function exchangeBody(transaction: ReturnTransactionHistory) {
  const returned = transaction.returnedItems ?? [];
  const replacements = transaction.exchangedItems ?? [];
  const settlement = transaction.netAmount > 0
    ? `<div><span>Additional payment</span><strong>${money(transaction.netAmount)}</strong></div>`
    : transaction.refundAmount > 0
      ? `<div><span>Refund</span><strong>${money(transaction.refundAmount)}</strong></div>`
      : `<div><span>Settlement</span><strong>Equal value</strong></div>`;
  const topUps = transaction.splitPaymentData?.topUpPayments ?? [];
  const refunds = transaction.splitPaymentData?.refundPayments ?? [];
  const replacementSubtotal = replacements.reduce((sum, item) => sum + Number(item.total || 0), 0);
  const discountAmount = Number(transaction.discountAmount ?? 0);
  const calculatedTotal = Number(transaction.calculatedTotal ?? transaction.finalPayable ?? replacementSubtotal);
  const taxAmount = Math.max(calculatedTotal - Math.max(replacementSubtotal - discountAmount, 0), 0);
  return `
    <section><h2>Returned items</h2><table><thead><tr><th>#</th><th>Product</th><th class="number">Qty</th><th class="number">Value</th></tr></thead><tbody>${transactionRows(returned)}</tbody></table></section>
    ${replacements.length ? `<section><h2>Replacement items</h2><table><thead><tr><th>#</th><th>Product</th><th class="number">Qty</th><th class="number">Value</th></tr></thead><tbody>${transactionRows(replacements)}</tbody></table></section>` : ""}
    <div class="totals">${replacements.length ? `<div><span>Replacement subtotal</span><strong>${money(replacementSubtotal)}</strong></div>` : ""}${discountAmount > 0 ? `<div><span>Exchange discount</span><strong>-${money(discountAmount)}</strong></div>` : ""}${taxAmount > 0 ? `<div><span>Tax${Number(transaction.taxRate ?? 0) > 0 ? ` (${escapeHtml(transaction.taxRate)}%)` : ""}</span><strong>${money(taxAmount)}</strong></div>` : ""}${Number(transaction.roundOffAmount ?? 0) !== 0 ? `<div><span>Round off</span><strong>${money(Number(transaction.roundOffAmount))}</strong></div>` : ""}${transaction.finalPayable != null ? `<div><span>Replacement total</span><strong>${money(transaction.finalPayable)}</strong></div>` : ""}${settlement}${topUps.length ? paymentRows(topUps, "Top-up") : ""}${refunds.length ? paymentRows(refunds, "Refund") : ""}${!topUps.length && !refunds.length && transaction.refundMethod ? `<div><span>Settlement method</span><strong>${escapeHtml(transaction.refundMethod)}</strong></div>` : ""}</div>`;
}

function saleBody(sale: Sale) {
  const invoiceSubtotal = sale.items.every(item => item.netLineAmount != null)
    ? sale.items.reduce((sum, item) => sum + Number(item.taxableAmount ?? 0), 0) + sale.discountAmount
    : sale.subtotal;
  return `
    <section><table><thead><tr><th>#</th><th>Product</th><th class="number">Price</th><th class="number">Qty</th><th class="number">Total</th></tr></thead><tbody>${saleItemRows(sale.items)}</tbody></table></section>
    <div class="totals"><div><span>Subtotal</span><strong>${money(invoiceSubtotal)}</strong></div>${sale.discountAmount > 0 ? `<div><span>Discount</span><strong>-${money(sale.discountAmount)}</strong></div>` : ""}${sale.taxAmount > 0 ? `<div><span>Tax</span><strong>${money(sale.taxAmount)}</strong></div>` : ""}${sale.payments?.length ? paymentRows(sale.payments.map(payment => ({ method: payment.method, amount: payment.amount }))) : `<div><span>Payment method</span><strong>${escapeHtml(sale.paymentMethod)}</strong></div>`}<div><span>Amount paid</span><strong>${money(sale.amountPaid)}</strong></div>${sale.amountDue > 0 ? `<div><span>Amount due</span><strong>${money(sale.amountDue)}</strong></div>` : ""}<div class="grand"><span>Final total</span><strong>${money(sale.total)}</strong></div></div>`;
}

export function buildInvoiceDocumentHtml(input: InvoiceDocumentInput) {
  const kind = input.kind ?? "SALE";
  const transaction = kind === "EXCHANGE"
    ? input.sale.returnTransactions.find(item => item.id === input.returnTransactionId)
    : undefined;
  if (kind === "EXCHANGE" && !transaction) throw new Error("Exchange transaction was not found on the sale");
  const reference = transaction?.referenceNumber || input.sale.invoiceNumber;
  const issuedAt = transaction?.transactionDate || transaction?.businessDate || transaction?.createdAt || input.sale.transactionDate;
  const title = transaction ? "Exchange / Return Receipt" : "Tax Invoice";
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)} ${escapeHtml(reference)}</title><style>
    @page{size:A4;margin:14mm}*{box-sizing:border-box}body{font:12px Arial,sans-serif;color:#172033;margin:0}.header{text-align:center;border-bottom:2px solid #172033;padding-bottom:16px;margin-bottom:18px}.header h1{font-size:22px;margin:0 0 4px}.header p{margin:0;color:#667085}.meta{display:flex;justify-content:space-between;gap:24px;margin-bottom:20px;line-height:1.65}.meta>div:last-child{text-align:right}section{margin-top:18px}h2{font-size:14px;margin:0 0 8px}table{width:100%;border-collapse:collapse}th,td{padding:8px;border-bottom:1px solid #dfe3ea;text-align:left;vertical-align:top}th{background:#f5f7fa;font-size:11px}.number{text-align:right}small{display:block;color:#667085;margin-top:3px}.totals{margin:20px 0 0 auto;width:310px}.totals div{display:flex;justify-content:space-between;padding:5px 0}.totals .grand{font-size:15px;border-top:2px solid #172033;margin-top:5px;padding-top:9px}.footer{text-align:center;color:#667085;margin-top:42px}
  </style></head><body><div class="header"><h1>${escapeHtml(input.storeName)}</h1><p>${title}</p></div><div class="meta"><div><strong>Reference:</strong> ${escapeHtml(reference)}<br><strong>Date:</strong> ${escapeHtml(dateTime(issuedAt))}<br>${transaction ? `<strong>Original invoice:</strong> ${escapeHtml(input.sale.invoiceNumber)}<br>` : ""}<strong>Payment:</strong> ${escapeHtml(input.sale.paymentMethod)}</div><div>${input.sale.customerName ? `<strong>Customer:</strong> ${escapeHtml(input.sale.customerName)}<br>` : ""}${input.sale.customerPhone ? `<strong>Phone:</strong> ${escapeHtml(input.sale.customerPhone)}<br>` : ""}<strong>Status:</strong> ${escapeHtml(transaction?.type || input.sale.status)}</div></div>${transaction ? exchangeBody(transaction) : saleBody(input.sale)}<div class="footer">Thank you for shopping with us.</div></body></html>`;
}
