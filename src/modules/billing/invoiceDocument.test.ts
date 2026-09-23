import test from "node:test";
import assert from "node:assert/strict";
import { buildInvoiceDocumentHtml } from "./invoiceDocument.ts";
import type { Sale } from "./types.ts";
import puppeteer from "puppeteer";

const sale: Sale = {
  id: "sale-1",
  invoiceNumber: "INV-1001",
  customerId: "customer-1",
  customerName: "Aarav <script>",
  customerPhone: "9876543210",
  customerEmail: null,
  subtotal: 1200,
  discountAmount: 200,
  taxAmount: 50,
  total: 1050,
  roundOffAmount: 0,
  amountPaid: 500,
  amountDue: 550,
  paymentMethod: "UPI",
  paymentStatus: "PARTIAL",
  returnStatus: "PARTIAL",
  status: "COMPLETED",
  items: [{ id: "item-1", productId: "product-1", productName: "Shirt", sku: "SKU-1", sizeId: "size-1", sizeLabel: "M", attributes: {}, quantity: 1, unitPrice: 1200, total: 1200, finalLineAmount: 1000, taxableAmount: 1000, netLineAmount: 1000 }],
  payments: [{ id: "payment-1", saleId: "sale-1", amount: 500, method: "UPI", businessDate: "2026-09-23T09:00:00Z", paidAt: "2026-09-23T09:00:00Z", createdBy: "user-1" }],
  returnTransactions: [
    { id: "exchange-pay", type: "RETURN_EXCHANGE", referenceNumber: "RET-1", returnedItems: [{ productId: "product-1", sizeId: "size-1", productName: "Shirt", quantity: 1, total: 1000 }], exchangedItems: [{ productId: "product-2", sizeId: "size-2", productName: "Jacket", quantity: 1, total: 1200 }], netAmount: 200, offsetAmount: 200, refundAmount: 0, discountType: "FLAT", discountAmount: 100, taxRate: 10, calculatedTotal: 1210, finalPayable: 1210, splitPaymentData: { topUpPayments: [{ method: "UPI", amount: 200 }] }, createdAt: "2026-09-23T10:00:00Z" },
    { id: "exchange-even", type: "RETURN_EXCHANGE", referenceNumber: "RET-2", returnedItems: [{ productId: "product-1", sizeId: "size-1", quantity: 1, total: 1000 }], exchangedItems: [{ productId: "product-3", sizeId: "size-3", quantity: 1, total: 1000 }], netAmount: 0, offsetAmount: 0, refundAmount: 0, createdAt: "2026-09-23T11:00:00Z" },
    { id: "exchange-refund", type: "RETURN_EXCHANGE", referenceNumber: "RET-3", returnedItems: [{ productId: "product-1", sizeId: "size-1", quantity: 1, total: 1000 }], exchangedItems: [{ productId: "product-4", sizeId: "size-4", quantity: 1, total: 800 }], netAmount: 0, offsetAmount: 0, refundAmount: 200, createdAt: "2026-09-23T12:00:00Z" },
  ],
  transactionDate: "2026-09-23T09:00:00Z",
  createdAt: "2026-09-23T09:00:00Z",
};

test("renders finalized discounted partial-payment sale data and escapes customer content", () => {
  const html = buildInvoiceDocumentHtml({ sale, storeName: "Rare Thread" });
  assert.match(html, /INV-1001/);
  assert.match(html, /Amount due/);
  assert.match(html, /Discount/);
  assert.match(html, /Payment · UPI/);
  assert.match(html, /Aarav &lt;script&gt;/);
  assert.doesNotMatch(html, /Aarav <script>/);
});

for (const [id, expected] of [["exchange-pay", "Additional payment"], ["exchange-even", "Equal value"], ["exchange-refund", "Refund"]] as const) {
  test(`renders ${id} settlement without unrelated exchange rows`, () => {
    const html = buildInvoiceDocumentHtml({ sale, storeName: "Rare Thread", kind: "EXCHANGE", returnTransactionId: id });
    assert.match(html, new RegExp(expected));
    assert.match(html, new RegExp(sale.returnTransactions.find(item => item.id === id)!.referenceNumber!));
    assert.doesNotMatch(html, /INV-1001<\/title>/);
  });
}

test("renders finalized exchange pricing and settlement payment details", () => {
  const html = buildInvoiceDocumentHtml({ sale, storeName: "Rare Thread", kind: "EXCHANGE", returnTransactionId: "exchange-pay" });
  assert.match(html, /Replacement subtotal/);
  assert.match(html, /Exchange discount/);
  assert.match(html, /Tax \(10%\)/);
  assert.match(html, /Top-up · UPI/);
});

test("generates non-empty sale and exchange PDF documents at runtime", async () => {
  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
  try {
    for (const html of [
      buildInvoiceDocumentHtml({ sale, storeName: "Rare Thread" }),
      buildInvoiceDocumentHtml({ sale, storeName: "Rare Thread", kind: "EXCHANGE", returnTransactionId: "exchange-pay" }),
    ]) {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "domcontentloaded" });
      const pdf = await page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true });
      assert.equal(Buffer.from(pdf).subarray(0, 4).toString(), "%PDF");
      assert.ok(pdf.byteLength > 1_000);
      await page.close();
    }
  } finally {
    await browser.close();
  }
});
