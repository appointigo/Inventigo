"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildPrintableInvoiceHtml = void 0;
var dayjs_1 = require("dayjs");
var formatCurrency_1 = require("@/shared/utils/formatCurrency");
var escapeHtml = function (value) {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
};
var round2 = function (value) { return Math.round(value * 100) / 100; };
var getItemSnapshot = function (item) {
    var unitMrp = item.mrp != null ? Number(item.mrp) : Number(item.unitPrice);
    var finalUnitPrice = item.finalUnitPrice != null
        ? Number(item.finalUnitPrice)
        : item.sellingPrice != null
            ? Number(item.sellingPrice)
            : Number(item.unitPrice);
    var lineTotal = item.finalLineAmount != null ? Number(item.finalLineAmount) : Number(item.total);
    var mrpLineTotal = round2(unitMrp * item.quantity);
    var savings = Math.max(0, round2(mrpLineTotal - lineTotal));
    var discountPercent = unitMrp > 0 ? Math.round(((unitMrp - finalUnitPrice) / unitMrp) * 100) : 0;
    return { unitMrp: unitMrp, finalUnitPrice: finalUnitPrice, lineTotal: lineTotal, savings: savings, discountPercent: discountPercent };
};
var getHistoryItemDisplay = function (item) {
    var _a, _b, _c, _d, _e;
    var productName = (_a = item.productName) === null || _a === void 0 ? void 0 : _a.trim();
    var productId = (_b = item.productId) === null || _b === void 0 ? void 0 : _b.trim();
    var sku = (_c = item.sku) === null || _c === void 0 ? void 0 : _c.trim();
    var sizeLabel = (_d = item.sizeLabel) === null || _d === void 0 ? void 0 : _d.trim();
    var sizeId = (_e = item.sizeId) === null || _e === void 0 ? void 0 : _e.trim();
    var primary = productName || sku || productId || "Product";
    var secondaryParts = [sku, productId].filter(function (value) { return Boolean(value && value !== primary); });
    return {
        primary: primary,
        secondary: secondaryParts.join(" · "),
        size: sizeLabel || sizeId,
    };
};
var buildPrintableInvoiceHtml = function (sale, options) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q;
    var storeName = ((_a = options === null || options === void 0 ? void 0 : options.storeName) === null || _a === void 0 ? void 0 : _a.trim()) || "Store Invoice";
    var items = (_b = sale.items) !== null && _b !== void 0 ? _b : [];
    var returnTransactions = (_c = sale.returnTransactions) !== null && _c !== void 0 ? _c : [];
    var mrpSubtotal = round2(items.reduce(function (sum, item) { return sum + ((item.mrp != null ? Number(item.mrp) : Number(item.unitPrice)) * item.quantity); }, 0));
    var totalSavings = Math.max(0, round2(mrpSubtotal - Number((_d = sale.total) !== null && _d !== void 0 ? _d : 0)));
    var itemRows = items
        .map(function (item, index) {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        var _j = getItemSnapshot(item), unitMrp = _j.unitMrp, finalUnitPrice = _j.finalUnitPrice, lineTotal = _j.lineTotal, savings = _j.savings, discountPercent = _j.discountPercent;
        var productName = (((_a = item.productName) === null || _a === void 0 ? void 0 : _a.trim()) || ((_b = item.sku) === null || _b === void 0 ? void 0 : _b.trim()) || "Product");
        var productDescription = (_c = item.description) === null || _c === void 0 ? void 0 : _c.trim();
        var sku = (_d = item.sku) === null || _d === void 0 ? void 0 : _d.trim();
        var sizeLabel = (_e = item.sizeLabel) === null || _e === void 0 ? void 0 : _e.trim();
        var brandName = (_f = item.brandName) === null || _f === void 0 ? void 0 : _f.trim();
        var categoryName = (_g = item.categoryName) === null || _g === void 0 ? void 0 : _g.trim();
        var attrValues = Object.values((_h = item.attributes) !== null && _h !== void 0 ? _h : {})
            .filter(function (value) {
            var normalized = String(value).trim().toLowerCase();
            return normalized !== "" && !["pcs", "pc", "piece", "pieces", "unit", "units"].includes(normalized);
        })
            .map(function (value) { return "<span class=\"attribute-chip\">".concat(escapeHtml(String(value)), "</span>"); })
            .join("");
        return "\n        <tr>\n          <td class=\"cell-index\">".concat(index + 1, "</td>\n          <td class=\"cell-product\">\n            <div class=\"product-name\">").concat(escapeHtml(productName), "</div>\n            ").concat(productDescription ? "<div class=\"product-description\">".concat(escapeHtml(productDescription), "</div>") : "", "\n            ").concat(sku || brandName || categoryName ? "\n              <div class=\"product-meta-line\">\n                ".concat(sku ? "<span>SKU: ".concat(escapeHtml(sku), "</span>") : "", "\n                ").concat(brandName ? "<span>Brand: ".concat(escapeHtml(brandName), "</span>") : "", "\n                ").concat(categoryName ? "<span>Category: ".concat(escapeHtml(categoryName), "</span>") : "", "\n              </div>") : "", "\n            ").concat(sizeLabel ? "<div class=\"product-meta-line\">Size: ".concat(escapeHtml(sizeLabel), "</div>") : "", "\n            ").concat(attrValues ? "<div class=\"product-meta\">".concat(attrValues, "</div>") : "", "\n            <div class=\"product-pricing\">\n              <span class=\"price-current\">").concat((0, formatCurrency_1.formatCurrency)(finalUnitPrice), "</span>\n              ").concat(unitMrp > finalUnitPrice ? "<span class=\"price-mrp\">".concat((0, formatCurrency_1.formatCurrency)(unitMrp), "</span>") : "", "\n            </div>\n            ").concat(unitMrp > finalUnitPrice ? "<div class=\"product-discount\">".concat(discountPercent, "% OFF").concat(savings > 0 ? " \u00B7 Save ".concat((0, formatCurrency_1.formatCurrency)(savings)) : "", "</div>") : "", "\n          </td>\n          <td class=\"cell-qty\">").concat(item.quantity, "</td>\n          <td class=\"cell-total\">").concat((0, formatCurrency_1.formatCurrency)(lineTotal), "</td>\n        </tr>\n      ");
    })
        .join("");
    var historySections = returnTransactions.length
        ? returnTransactions
            .map(function (transaction) {
            var _a, _b, _c, _d, _e;
            var returnedRows = ((_a = transaction.returnedItems) !== null && _a !== void 0 ? _a : [])
                .map(function (item, index) {
                var product = getHistoryItemDisplay(item);
                return "\n                <tr>\n                  <td>".concat(index + 1, "</td>\n                  <td>\n                    <div style=\"font-weight:700;margin-bottom:3px;\">").concat(escapeHtml(product.primary), "</div>\n                    <small style=\"color:#888\">\n                      ").concat(escapeHtml(product.secondary), "\n                      ").concat(product.size ? "<span style=\"display:inline-block;background:#eff4ff;border:1px solid #bfdbfe;border-radius:3px;font-size:9pt;padding:0 5px;color:#2563eb;\">".concat(escapeHtml(product.size), "</span>") : "", "\n                    </small>\n                  </td>\n                  <td style=\"text-align:center\">").concat(item.quantity, "</td>\n                  <td style=\"text-align:right\">").concat((0, formatCurrency_1.formatCurrency)(item.total), "</td>\n                </tr>\n              ");
            })
                .join("");
            var exchangedRows = ((_b = transaction.exchangedItems) !== null && _b !== void 0 ? _b : [])
                .map(function (item, index) {
                var product = getHistoryItemDisplay(item);
                return "\n                <tr>\n                  <td>".concat(index + 1, "</td>\n                  <td>\n                    <div style=\"font-weight:700;margin-bottom:3px;\">").concat(escapeHtml(product.primary), "</div>\n                    <small style=\"color:#888\">\n                      ").concat(escapeHtml(product.secondary), "\n                      ").concat(product.size ? "<span style=\"display:inline-block;background:#eff4ff;border:1px solid #bfdbfe;border-radius:3px;font-size:9pt;padding:0 5px;color:#2563eb;\">".concat(escapeHtml(product.size), "</span>") : "", "\n                    </small>\n                  </td>\n                  <td style=\"text-align:center\">").concat(item.quantity, "</td>\n                  <td style=\"text-align:right\">").concat((0, formatCurrency_1.formatCurrency)(item.total), "</td>\n                </tr>\n              ");
            })
                .join("");
            return "\n            <div style=\"margin-bottom:20px; padding:12px; border:1px solid #ddd; border-radius:8px;\">\n              <div style=\"font-weight:700; margin-bottom:8px;\">".concat(escapeHtml(String((_c = transaction.type) !== null && _c !== void 0 ? _c : "TRANSACTION")), " \u00B7 ").concat((0, dayjs_1.default)(transaction.createdAt).format("DD MMM YYYY, hh:mm A"), "</div>\n              ").concat(returnedRows ? "\n                <div style=\"margin-bottom:12px;\">\n                  <div style=\"font-weight:600; margin-bottom:6px;\">Returned items</div>\n                  <table style=\"width:100%; border-collapse:collapse; margin-bottom:0;\">\n                    <thead>\n                      <tr>\n                        <th style=\"text-align:left; padding:4px; border-bottom:1px solid #ddd;\">#</th>\n                        <th style=\"text-align:left; padding:4px; border-bottom:1px solid #ddd;\">Product</th>\n                        <th style=\"text-align:center; padding:4px; border-bottom:1px solid #ddd;\">Qty</th>\n                        <th style=\"text-align:right; padding:4px; border-bottom:1px solid #ddd;\">Total</th>\n                      </tr>\n                    </thead>\n                    <tbody>".concat(returnedRows, "</tbody>\n                  </table>\n                </div>\n              ") : "", "\n              ").concat(exchangedRows ? "\n                <div>\n                  <div style=\"font-weight:600; margin-bottom:6px;\">Exchanged items</div>\n                  <table style=\"width:100%; border-collapse:collapse; margin-bottom:0;\">\n                    <thead>\n                      <tr>\n                        <th style=\"text-align:left; padding:4px; border-bottom:1px solid #ddd;\">#</th>\n                        <th style=\"text-align:left; padding:4px; border-bottom:1px solid #ddd;\">Product</th>\n                        <th style=\"text-align:center; padding:4px; border-bottom:1px solid #ddd;\">Qty</th>\n                        <th style=\"text-align:right; padding:4px; border-bottom:1px solid #ddd;\">Total</th>\n                      </tr>\n                    </thead>\n                    <tbody>".concat(exchangedRows, "</tbody>\n                  </table>\n                </div>\n              ") : "", "\n              <div style=\"display:flex; justify-content:space-between; flex-wrap:wrap; gap:12px; margin-top:12px; font-size:11pt;\">\n                <div>Refund: ").concat((0, formatCurrency_1.formatCurrency)((_d = transaction.refundAmount) !== null && _d !== void 0 ? _d : 0), "</div>\n                <div>Offset: ").concat((0, formatCurrency_1.formatCurrency)((_e = transaction.offsetAmount) !== null && _e !== void 0 ? _e : 0), "</div>\n              </div>\n            </div>\n          ");
        })
            .join("")
        : "";
    return "\n    <!DOCTYPE html>\n    <html>\n      <head>\n        <title>Invoice ".concat(escapeHtml(sale.invoiceNumber), "</title>\n        <style>\n          @page { size: A4; margin: 15mm; }\n          * { margin: 0; padding: 0; box-sizing: border-box; }\n          body { font-family: Arial, sans-serif; font-size: 12pt; color: #333; padding: 24px; }\n          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; gap: 16px; }\n          .header-left { max-width: 65%; }\n          .header-left h1 { font-size: 22pt; margin-bottom: 6px; }\n          .header-left p { color: #555; font-size: 10pt; letter-spacing: 0.02em; }\n          .invoice-badge { text-transform: uppercase; font-size: 10pt; font-weight: 700; color: #111; letter-spacing: 0.12em; }\n          .info { display: flex; justify-content: space-between; gap: 18px; margin-bottom: 24px; }\n          .info-block { flex: 1; min-width: 200px; padding: 16px; border: 1px solid #e5e7eb; border-radius: 10px; background: #fafafa; }\n          .info-block strong { display: inline-block; width: 110px; color: #111; }\n          .info-block div { margin-bottom: 6px; font-size: 10pt; color: #333; line-height: 1.4; }\n          .info-block div:last-child { margin-bottom: 0; }\n          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; table-layout: fixed; }\n          th, td { padding: 12px 10px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }\n          th { background: #f8fafc; color: #111; font-weight: 700; font-size: 10pt; text-align: left; }\n          td { font-size: 10pt; color: #333; word-break: break-word; white-space: normal; }\n          .cell-index { width: 34px; }\n          .cell-product { width: 56%; }\n          .cell-qty { width: 10%; text-align: center; }\n          .cell-total, .cell-price { width: 18%; text-align: right; }\n          .product-name { font-weight: 700; margin-bottom: 6px; }\n          .product-meta { color: #6b7280; font-size: 9pt; line-height: 1.4; margin-bottom: 8px; }\n          .attribute-chip { display: inline-block; margin-right: 4px; margin-top: 4px; padding: 2px 6px; border-radius: 999px; background: #f3f4f6; border: 1px solid #e5e7eb; color: #374151; font-size: 9pt; }\n          .product-pricing { color: #111; font-size: 10pt; margin-bottom: 4px; }\n          .price-current { font-weight: 700; }\n          .price-mrp { margin-left: 8px; color: #6b7280; text-decoration: line-through; }\n          .product-discount { color: #15803d; font-size: 9pt; }\n          .totals { max-width: 360px; margin-left: auto; text-align: right; }\n          .totals div { margin-bottom: 8px; font-size: 10pt; }\n          .grand-total { font-size: 13pt; font-weight: 700; border-top: 2px solid #111; padding-top: 10px; margin-top: 12px; }\n          .footer { text-align: center; margin-top: 36px; font-size: 9.5pt; color: #6b7280; }\n        </style>\n      </head>\n      <body>\n        <div class=\"header\">\n          <div class=\"header-left\">\n            <div class=\"invoice-badge\">Tax Invoice</div>\n            <h1>").concat(escapeHtml(storeName), "</h1>\n            <p>Invoice generated for your recent purchase. Please retain this invoice for your records.</p>\n          </div>\n          <div style=\"text-align:right;\">\n            <div style=\"font-size: 10pt; color: #111; margin-bottom: 8px;\"><strong>Invoice</strong></div>\n            <div style=\"font-size: 22pt; font-weight: 700; color: #111;\">").concat(escapeHtml(sale.invoiceNumber), "</div>\n            <div style=\"color:#6b7280; font-size:10pt; margin-top:8px;\">").concat(escapeHtml((0, dayjs_1.default)(sale.transactionDate).format("DD MMM YYYY, hh:mm A")), "</div>\n          </div>\n        </div>\n        <div class=\"info\">\n          <div class=\"info-block\">\n            <div><strong>Payment method</strong> ").concat(escapeHtml(String((_e = sale.paymentMethod) !== null && _e !== void 0 ? _e : "CASH")), "</div>\n            <div><strong>Payment status</strong> ").concat(escapeHtml(String((_f = sale.paymentStatus) !== null && _f !== void 0 ? _f : "PAID")), "</div>\n            <div><strong>Status</strong> ").concat(escapeHtml(String((_g = sale.status) !== null && _g !== void 0 ? _g : "COMPLETED")), "</div>\n          </div>\n          <div class=\"info-block\">\n            ").concat(sale.customerName ? "<div><strong>Customer</strong> ".concat(escapeHtml(sale.customerName), "</div>") : "", "\n            ").concat(sale.customerPhone ? "<div><strong>Phone</strong> ".concat(escapeHtml(sale.customerPhone), "</div>") : "", "\n            ").concat(sale.customerEmail ? "<div><strong>Email</strong> ".concat(escapeHtml(sale.customerEmail), "</div>") : "", "\n          </div>\n        </div>\n        <table>\n          <thead>\n            <tr>\n              <th>#</th>\n              <th>Product</th>\n              <th class=\"cell-price\">Price</th>\n              <th class=\"cell-qty\">Qty</th>\n              <th class=\"cell-total\">Total</th>\n            </tr>\n          </thead>\n          <tbody>\n            ").concat(itemRows, "\n          </tbody>\n        </table>\n        ").concat(historySections, "\n        <div class=\"totals\">\n          <div>Subtotal (MRP): ").concat((0, formatCurrency_1.formatCurrency)(mrpSubtotal), "</div>\n          ").concat(Number((_h = sale.discountAmount) !== null && _h !== void 0 ? _h : 0) > 0 ? "<div>Discount: -".concat((0, formatCurrency_1.formatCurrency)(Number((_j = sale.discountAmount) !== null && _j !== void 0 ? _j : 0)), "</div>") : "", "\n          ").concat(totalSavings > 0 ? "<div>You Saved: ".concat((0, formatCurrency_1.formatCurrency)(totalSavings), "</div>") : "", "\n          ").concat(Number((_k = sale.taxAmount) !== null && _k !== void 0 ? _k : 0) > 0 ? "<div>Tax: ".concat((0, formatCurrency_1.formatCurrency)(Number((_l = sale.taxAmount) !== null && _l !== void 0 ? _l : 0)), "</div>") : "", "\n          <div>Amount paid: ").concat((0, formatCurrency_1.formatCurrency)(Number((_m = sale.amountPaid) !== null && _m !== void 0 ? _m : 0)), "</div>\n          ").concat(Number((_o = sale.amountDue) !== null && _o !== void 0 ? _o : 0) > 0 ? "<div>Amount due: ".concat((0, formatCurrency_1.formatCurrency)(Number((_p = sale.amountDue) !== null && _p !== void 0 ? _p : 0)), "</div>") : "", "\n          <div class=\"grand-total\">Final Total: ").concat((0, formatCurrency_1.formatCurrency)(Number((_q = sale.total) !== null && _q !== void 0 ? _q : 0)), "</div>\n        </div>\n        <div class=\"footer\">Thank you for your purchase!</div>\n      </body>\n    </html>\n  ");
};
exports.buildPrintableInvoiceHtml = buildPrintableInvoiceHtml;
