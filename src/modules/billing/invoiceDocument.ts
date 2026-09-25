import { buildInvoiceDocumentModel, type InvoiceDocumentInput } from "./invoiceDocumentModel.ts";

export type { InvoiceDocumentInput, InvoiceDocumentKind } from "./invoiceDocumentModel.ts";

const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

export function buildInvoiceDocumentHtml(input: InvoiceDocumentInput) {
  const model = buildInvoiceDocumentModel(input);
  const sections = model.sections.map(section => `<section>${section.title ? `<h2>${escapeHtml(section.title)}</h2>` : ""}<table><thead><tr><th>#</th><th>Product</th>${section.showUnitPrice ? '<th class="number">Price</th>' : ""}<th class="number">Qty</th><th class="number">Total</th></tr></thead><tbody>${section.rows.map(row => `<tr><td>${row.index}</td><td><strong>${escapeHtml(row.name)}</strong><small>${escapeHtml(row.detail)}</small></td>${section.showUnitPrice ? `<td class="number">${escapeHtml(row.unitPrice)}</td>` : ""}<td class="number">${row.quantity}</td><td class="number">${escapeHtml(row.total)}</td></tr>`).join("")}</tbody></table></section>`).join("");
  const totals = model.totals.map(row => `<div${row.emphasis ? ' class="grand"' : ""}><span>${escapeHtml(row.label)}</span><strong>${escapeHtml(row.value)}</strong></div>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(model.title)} ${escapeHtml(model.reference)}</title><style>
    @page{size:A4;margin:14mm}*{box-sizing:border-box}body{font:12px Arial,sans-serif;color:#172033;margin:0}.header{text-align:center;border-bottom:2px solid #172033;padding-bottom:16px;margin-bottom:18px}.header h1{font-size:22px;margin:0 0 4px}.header p{margin:0;color:#667085}.meta{display:flex;justify-content:space-between;gap:24px;margin-bottom:20px;line-height:1.65}.meta>div:last-child{text-align:right}section{margin-top:18px}h2{font-size:14px;margin:0 0 8px}table{width:100%;border-collapse:collapse}th,td{padding:8px;border-bottom:1px solid #dfe3ea;text-align:left;vertical-align:top}th{background:#f5f7fa;font-size:11px}.number{text-align:right}small{display:block;color:#667085;margin-top:3px}.totals{margin:20px 0 0 auto;width:310px}.totals div{display:flex;justify-content:space-between;padding:5px 0}.totals .grand{font-size:15px;border-top:2px solid #172033;margin-top:5px;padding-top:9px}.footer{text-align:center;color:#667085;margin-top:42px}
  </style></head><body><div class="header"><h1>${escapeHtml(model.merchant.name)}</h1><p>${escapeHtml(model.title)}</p></div><div class="meta"><div><strong>Reference:</strong> ${escapeHtml(model.reference)}<br><strong>Date:</strong> ${escapeHtml(model.issuedAt)}<br>${model.originalInvoice ? `<strong>Original invoice:</strong> ${escapeHtml(model.originalInvoice)}<br>` : ""}<strong>Payment:</strong> ${escapeHtml(model.paymentMethod)}</div><div>${model.customerName ? `<strong>Customer:</strong> ${escapeHtml(model.customerName)}<br>` : ""}${model.customerPhone ? `<strong>Phone:</strong> ${escapeHtml(model.customerPhone)}<br>` : ""}<strong>Status:</strong> ${escapeHtml(model.status)}</div></div>${sections}<div class="totals">${totals}</div><div class="footer">Thank you for shopping with us.</div></body></html>`;
}
