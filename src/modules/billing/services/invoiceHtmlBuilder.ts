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

const EXCHANGE_WINDOW_DAYS = 7;

const parseInvoiceDate = (value?: string | null): dayjs.Dayjs | null => {
  if (!value) return null;

  const parsed = dayjs(value);
  return parsed.isValid() ? parsed : null;
};

const getExchangeDeadlineLabel = (billingDate?: string | null): string | null => {
  const parsed = parseInvoiceDate(billingDate);
  if (!parsed) {
    return null;
  }

  return parsed.startOf("day").add(EXCHANGE_WINDOW_DAYS, "day").format("DD MMM YYYY");
};

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
  const invoiceDate = parseInvoiceDate(sale.transactionDate);
  const invoiceDateLabel = invoiceDate?.format("DD MMM YYYY") ?? null;
  const invoiceDateTimeLabel = invoiceDate ? invoiceDate.format("DD MMM YYYY, hh:mm A") : "N/A";
  const exchangeValidUntilLabel = getExchangeDeadlineLabel(sale.transactionDate);

  if (sale.transactionDate && !invoiceDateLabel) {
    console.warn(`[INVOICE_DEBUG] Invalid billing date received for invoice terms. InvoiceNumber=${sale.invoiceNumber}`);
  }

  const mrpSubtotal = round2(
    items.reduce((sum, item) => sum + ((item.mrp != null ? Number(item.mrp) : Number(item.unitPrice)) * item.quantity), 0)
  );
  const totalSavings = Math.max(0, round2(mrpSubtotal - Number(sale.total ?? 0)));

  const itemRows = items
    .map((item, index) => {
      const { unitMrp, finalUnitPrice, lineTotal, discountPercent } = getItemSnapshot(item);
      const productName = (item.productName?.trim() || item.sku?.trim() || "Product");
      const sizeLabel = item.sizeLabel?.trim();
      const attributes = Object.entries(item.attributes ?? {})
        .map(([key, value]) => ({
          key: String(key).trim().toLowerCase(),
          value: String(value ?? "").trim(),
        }))
        .filter(({ value }) => value !== "" && !["pcs", "pc", "piece", "pieces", "unit", "units"].includes(value.toLowerCase()));
      const colorLabel = attributes.find(({ key }) => key.includes("color") || key.includes("colour"))?.value ?? attributes[0]?.value;
      const metaLine = [sizeLabel, colorLabel].filter(Boolean).join(" • ");

      return `
        <tr>
          <td class="cell-index">${index + 1}</td>
          <td class="cell-product">
            <div class="product-name">${escapeHtml(productName)}</div>
            ${metaLine ? `<div class="product-meta">${escapeHtml(metaLine)}</div>` : ""}
          </td>
          <td class="cell-price">
            <div class="price-current">${formatCurrency(finalUnitPrice)}</div>
            ${unitMrp > finalUnitPrice ? `<div class="price-mrp">${formatCurrency(unitMrp)}</div>` : ""}
            ${unitMrp > finalUnitPrice && discountPercent > 0 ? `<div class="price-discount">${discountPercent}% OFF</div>` : ""}
          </td>
          <td class="cell-qty">${item.quantity}</td>
          <td class="cell-total">${formatCurrency(lineTotal)}</td>
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
          body { font-family: Arial, sans-serif; font-size: 12pt; color: #333; padding: 24px; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; gap: 16px; }
          .header-left { max-width: 65%; }
          .header-left h1 { font-size: 22pt; margin-bottom: 6px; }
          .header-left p { color: #555; font-size: 10pt; letter-spacing: 0.02em; }
          .invoice-badge { text-transform: uppercase; font-size: 10pt; font-weight: 700; color: #111; letter-spacing: 0.12em; }
          .info { display: flex; justify-content: space-between; gap: 18px; margin-bottom: 24px; }
          .info-block { flex: 1; min-width: 200px; padding: 16px; border: 1px solid #e5e7eb; border-radius: 10px; background: #fafafa; }
          .info-block strong { display: inline-block; width: 110px; color: #111; }
          .info-block div { margin-bottom: 6px; font-size: 10pt; color: #333; line-height: 1.4; }
          .info-block div:last-child { margin-bottom: 0; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; table-layout: fixed; }
          th, td { padding: 10px 8px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
          th { background: #f8fafc; color: #111; font-weight: 700; font-size: 10pt; text-align: left; }
          td { font-size: 10pt; color: #333; word-break: break-word; white-space: normal; }
          .cell-index { width: 32px; }
          .cell-product { width: 60%; }
          .cell-price { width: 18%; text-align: right; }
          .cell-qty { width: 10%; text-align: center; }
          .cell-total { width: 12%; text-align: right; }
          .product-name { font-weight: 700; margin-bottom: 4px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis; line-height: 1.2; max-height: 2.4em; }
          .product-meta { color: #6b7280; font-size: 9pt; line-height: 1.3; margin-top: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .price-current { font-weight: 700; font-size: 10pt; }
          .price-mrp { display: block; margin-top: 4px; color: #6b7280; font-size: 9pt; text-decoration: line-through; }
          .price-discount { margin-top: 4px; color: #15803d; font-size: 9pt; }
          .totals { max-width: 360px; margin-left: auto; text-align: right; }
          .totals div { margin-bottom: 8px; font-size: 10pt; }
          .grand-total { font-size: 13pt; font-weight: 700; border-top: 2px solid #111; padding-top: 10px; margin-top: 12px; }
          .terms { margin-top: 14px; padding: 10px 12px; border: 1px solid #e5e7eb; border-radius: 10px; background: #fcfcfd; break-inside: avoid; page-break-inside: avoid; }
          .terms-heading { font-size: 9pt; font-weight: 700; letter-spacing: 0.08em; color: #111; margin-bottom: 6px; }
          .terms-list { margin: 0; padding-left: 18px; }
          .terms-list li { margin-bottom: 4px; font-size: 9.3pt; line-height: 1.35; color: #333; }
          .terms-list li:last-child { margin-bottom: 0; }
          .footer { text-align: center; margin-top: 36px; font-size: 9.5pt; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="header-left">
            <div class="invoice-badge">Tax Invoice</div>
            <h1>${escapeHtml(storeName)}</h1>
            <p>Invoice generated for your recent purchase. Please retain this invoice for your records.</p>
          </div>
          <div style="text-align:right;">
            <div style="font-size: 10pt; color: #111; margin-bottom: 8px;"><strong>Invoice</strong></div>
            <div style="font-size: 22pt; font-weight: 700; color: #111;">${escapeHtml(sale.invoiceNumber)}</div>
            <div style="color:#6b7280; font-size:10pt; margin-top:8px;">${escapeHtml(invoiceDateTimeLabel)}</div>
          </div>
        </div>
        <div class="info">
          <div class="info-block">
            <div><strong>Payment method</strong> ${escapeHtml(String(sale.paymentMethod ?? "CASH"))}</div>
            <div><strong>Payment status</strong> ${escapeHtml(String(sale.paymentStatus ?? "PAID"))}</div>
            <div><strong>Status</strong> ${escapeHtml(String(sale.status ?? "COMPLETED"))}</div>
          </div>
          <div class="info-block">
            ${sale.customerName ? `<div><strong>Customer</strong> ${escapeHtml(sale.customerName)}</div>` : ""}
            ${sale.customerPhone ? `<div><strong>Phone</strong> ${escapeHtml(sale.customerPhone)}</div>` : ""}
            ${sale.customerEmail ? `<div><strong>Email</strong> ${escapeHtml(sale.customerEmail)}</div>` : ""}
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Product</th>
              <th class="cell-price">Price</th>
              <th class="cell-qty">Qty</th>
              <th class="cell-total">Total</th>
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
        <div class="terms">
          <div class="terms-heading">TERMS AND CONDITIONS</div>
          <ul class="terms-list">
            <li>${escapeHtml(exchangeValidUntilLabel
              ? `Items can be exchanged until ${exchangeValidUntilLabel} with the original bill, provided they are unused, and have all original tags intact.`
              : "Items can be exchanged with the original bill, provided they are unused, and have all original tags intact.")}</li>
            <li>Items cannot be returned; they can only be exchanged.</li>
          </ul>
        </div>
        <div class="footer">Thank you for your purchase!</div>
      </body>
    </html>
  `;
};
