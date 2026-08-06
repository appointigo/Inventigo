import dayjs from "dayjs";
import { formatCurrency } from "@/shared/utils/formatCurrency";
import type { ReturnTransactionItem, SaleItem } from "../types";

export type PrintableInvoiceData = {
  invoiceNumber: string;
  customerName?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  status?: string | null;
  paymentMethod?: string | null;
  paymentStatus?: string | null;
  subtotal?: number;
  discountAmount?: number;
  taxAmount?: number;
  total?: number;
  amountPaid?: number;
  amountDue?: number;
  items: SaleItem[];
  returnTransactions?: Array<{
    id?: string;
    type?: string;
    createdAt?: string | null;
    returnedItems?: ReturnTransactionItem[];
    exchangedItems?: ReturnTransactionItem[];
    refundAmount?: number;
    offsetAmount?: number;
  }>;
  transactionDate?: string | null;
};

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const round2 = (value: number): number => Math.round(value * 100) / 100;

const getItemSnapshot = (item: SaleItem) => {
  const unitMrp = item.mrp != null ? Number(item.mrp) : Number(item.unitPrice);
  const finalUnitPrice = item.finalUnitPrice != null
    ? Number(item.finalUnitPrice)
    : item.sellingPrice != null
      ? Number(item.sellingPrice)
      : Number(item.unitPrice);
  const lineTotal = item.finalLineAmount != null ? Number(item.finalLineAmount) : Number(item.total);
  const mrpLineTotal = round2(unitMrp * item.quantity);
  const savings = Math.max(0, round2(mrpLineTotal - lineTotal));
  const discountPercent = unitMrp > 0 ? Math.round(((unitMrp - finalUnitPrice) / unitMrp) * 100) : 0;

  return { unitMrp, finalUnitPrice, lineTotal, savings, discountPercent };
};

const getHistoryItemDisplay = (item: ReturnTransactionItem) => {
  const productName = item.productName?.trim();
  const productId = item.productId?.trim();
  const sku = item.sku?.trim();
  const sizeLabel = item.sizeLabel?.trim();
  const sizeId = item.sizeId?.trim();
  const primary = productName || sku || productId || "Product";
  const secondaryParts = [sku, productId].filter(
    (value): value is string => Boolean(value && value !== primary)
  );

  return {
    primary,
    secondary: secondaryParts.join(" · "),
    size: sizeLabel || sizeId,
  };
};

export const buildPrintableInvoiceHtml = (
  sale: PrintableInvoiceData,
  options?: { storeName?: string | null }
): string => {
  const storeName = options?.storeName?.trim() || "Store Invoice";
  const items = sale.items ?? [];
  const returnTransactions = sale.returnTransactions ?? [];

  const mrpSubtotal = round2(
    items.reduce((sum, item) => sum + ((item.mrp != null ? Number(item.mrp) : Number(item.unitPrice)) * item.quantity), 0)
  );
  const totalSavings = Math.max(0, round2(mrpSubtotal - Number(sale.total ?? 0)));

  const itemRows = items
    .map((item, index) => {
      const { unitMrp, finalUnitPrice, lineTotal, savings, discountPercent } = getItemSnapshot(item);
      const attrValues = Object.values(item.attributes ?? {})
        .filter((value) => {
          const normalized = String(value).trim().toLowerCase();
          return normalized !== "" && !["pcs", "pc", "piece", "pieces", "unit", "units"].includes(normalized);
        })
        .map((value) => `<span style="display:inline-block;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:3px;font-size:9pt;padding:0 5px;margin-left:3px;">${escapeHtml(String(value))}</span>`)
        .join("");

      return `
        <tr>
          <td>${index + 1}</td>
          <td>
            <div style="font-weight:700;margin-bottom:4px;">${escapeHtml(item.productName)}</div>
            <div style="font-size:10pt;color:#666;line-height:1.4;">
              ${escapeHtml(item.sku)} · ${escapeHtml(item.sizeLabel)}${attrValues}
            </div>
            <div style="margin-top:6px;font-size:10pt;color:#111;">
              <span style="font-weight:700;">${formatCurrency(finalUnitPrice)}</span>
              ${unitMrp > finalUnitPrice ? `<span style="margin-left:8px;text-decoration:line-through;color:#888;">${formatCurrency(unitMrp)}</span>` : ""}
            </div>
            ${unitMrp > finalUnitPrice ? `<div style="font-size:10pt;color:#15803d;">${discountPercent}% OFF${savings > 0 ? ` • Save ${formatCurrency(savings)}` : ""}</div>` : ""}
          </td>
          <td style="text-align:center">${item.quantity}</td>
          <td style="text-align:right">${formatCurrency(lineTotal)}</td>
        </tr>
      `;
    })
    .join("");

  const historySections = returnTransactions.length
    ? returnTransactions
        .map((transaction) => {
          const returnedRows = (transaction.returnedItems ?? [])
            .map((item, index) => {
              const product = getHistoryItemDisplay(item);

              return `
                <tr>
                  <td>${index + 1}</td>
                  <td>
                    <div style="font-weight:700;margin-bottom:3px;">${escapeHtml(product.primary)}</div>
                    <small style="color:#888">
                      ${escapeHtml(product.secondary)}
                      ${product.size ? `<span style="display:inline-block;background:#eff4ff;border:1px solid #bfdbfe;border-radius:3px;font-size:9pt;padding:0 5px;color:#2563eb;">${escapeHtml(product.size)}</span>` : ""}
                    </small>
                  </td>
                  <td style="text-align:center">${item.quantity}</td>
                  <td style="text-align:right">${formatCurrency(item.total)}</td>
                </tr>
              `;
            })
            .join("");

          const exchangedRows = (transaction.exchangedItems ?? [])
            .map((item, index) => {
              const product = getHistoryItemDisplay(item);

              return `
                <tr>
                  <td>${index + 1}</td>
                  <td>
                    <div style="font-weight:700;margin-bottom:3px;">${escapeHtml(product.primary)}</div>
                    <small style="color:#888">
                      ${escapeHtml(product.secondary)}
                      ${product.size ? `<span style="display:inline-block;background:#eff4ff;border:1px solid #bfdbfe;border-radius:3px;font-size:9pt;padding:0 5px;color:#2563eb;">${escapeHtml(product.size)}</span>` : ""}
                    </small>
                  </td>
                  <td style="text-align:center">${item.quantity}</td>
                  <td style="text-align:right">${formatCurrency(item.total)}</td>
                </tr>
              `;
            })
            .join("");

          return `
            <div style="margin-bottom:20px; padding:12px; border:1px solid #ddd; border-radius:8px;">
              <div style="font-weight:700; margin-bottom:8px;">${escapeHtml(String(transaction.type ?? "TRANSACTION"))} · ${dayjs(transaction.createdAt).format("DD MMM YYYY, hh:mm A")}</div>
              ${returnedRows ? `
                <div style="margin-bottom:12px;">
                  <div style="font-weight:600; margin-bottom:6px;">Returned items</div>
                  <table style="width:100%; border-collapse:collapse; margin-bottom:0;">
                    <thead>
                      <tr>
                        <th style="text-align:left; padding:4px; border-bottom:1px solid #ddd;">#</th>
                        <th style="text-align:left; padding:4px; border-bottom:1px solid #ddd;">Product</th>
                        <th style="text-align:center; padding:4px; border-bottom:1px solid #ddd;">Qty</th>
                        <th style="text-align:right; padding:4px; border-bottom:1px solid #ddd;">Total</th>
                      </tr>
                    </thead>
                    <tbody>${returnedRows}</tbody>
                  </table>
                </div>
              ` : ""}
              ${exchangedRows ? `
                <div>
                  <div style="font-weight:600; margin-bottom:6px;">Exchanged items</div>
                  <table style="width:100%; border-collapse:collapse; margin-bottom:0;">
                    <thead>
                      <tr>
                        <th style="text-align:left; padding:4px; border-bottom:1px solid #ddd;">#</th>
                        <th style="text-align:left; padding:4px; border-bottom:1px solid #ddd;">Product</th>
                        <th style="text-align:center; padding:4px; border-bottom:1px solid #ddd;">Qty</th>
                        <th style="text-align:right; padding:4px; border-bottom:1px solid #ddd;">Total</th>
                      </tr>
                    </thead>
                    <tbody>${exchangedRows}</tbody>
                  </table>
                </div>
              ` : ""}
              <div style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:12px; margin-top:12px; font-size:11pt;">
                <div>Refund: ${formatCurrency(transaction.refundAmount ?? 0)}</div>
                <div>Offset: ${formatCurrency(transaction.offsetAmount ?? 0)}</div>
              </div>
            </div>
          `;
        })
        .join("")
    : "";

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Invoice ${escapeHtml(sale.invoiceNumber)}</title>
        <style>
          @page { size: A4; margin: 15mm; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; font-size: 12pt; color: #333; padding: 20px; }
          .header { text-align: center; margin-bottom: 24px; }
          .header h1 { font-size: 20pt; margin-bottom: 4px; }
          .header p { color: #666; }
          .info { display: flex; justify-content: space-between; margin-bottom: 20px; }
          .info div { font-size: 10pt; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { padding: 8px; border-bottom: 1px solid #ddd; text-align: left; }
          th { background: #f5f5f5; font-weight: bold; }
          .totals { text-align: right; }
          .totals div { margin-bottom: 4px; }
          .grand-total { font-size: 14pt; font-weight: bold; border-top: 2px solid #333; padding-top: 8px; }
          .footer { text-align: center; margin-top: 40px; font-size: 10pt; color: #999; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${escapeHtml(storeName)}</h1>
          <p>Tax Invoice</p>
        </div>
        <div class="info">
          <div>
            <strong>Invoice:</strong> ${escapeHtml(sale.invoiceNumber)}<br>
            <strong>Date:</strong> ${escapeHtml(dayjs(sale.transactionDate).format("DD MMM YYYY, hh:mm A"))}<br>
            <strong>Payment:</strong> ${escapeHtml(String(sale.paymentMethod ?? "CASH"))}<br>
            <strong>Payment status:</strong> ${escapeHtml(String(sale.paymentStatus ?? "PAID"))}
          </div>
          <div style="text-align:right">
            ${sale.customerName ? `<strong>Customer:</strong> ${escapeHtml(sale.customerName)}<br>` : ""}
            ${sale.customerPhone ? `<strong>Phone:</strong> ${escapeHtml(sale.customerPhone)}<br>` : ""}
            <strong>Status:</strong> ${escapeHtml(String(sale.status ?? "COMPLETED"))}
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Product</th>
              <th style="text-align:right">Price</th>
              <th style="text-align:center">Qty</th>
              <th style="text-align:right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemRows}
          </tbody>
        </table>
        ${historySections}
        <div class="totals">
          <div>Subtotal (MRP): ${formatCurrency(mrpSubtotal)}</div>
          ${Number(sale.discountAmount ?? 0) > 0 ? `<div>Discount: -${formatCurrency(Number(sale.discountAmount ?? 0))}</div>` : ""}
          ${totalSavings > 0 ? `<div>You Saved: ${formatCurrency(totalSavings)}</div>` : ""}
          ${Number(sale.taxAmount ?? 0) > 0 ? `<div>Tax: ${formatCurrency(Number(sale.taxAmount ?? 0))}</div>` : ""}
          <div>Amount paid: ${formatCurrency(Number(sale.amountPaid ?? 0))}</div>
          ${Number(sale.amountDue ?? 0) > 0 ? `<div>Amount due: ${formatCurrency(Number(sale.amountDue ?? 0))}</div>` : ""}
          <div class="grand-total">Final Total: ${formatCurrency(Number(sale.total ?? 0))}</div>
        </div>
        <div class="footer">Thank you for your purchase!</div>
      </body>
    </html>
  `;
};
