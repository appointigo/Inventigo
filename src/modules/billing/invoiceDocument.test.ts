import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildInvoiceDocumentHtml } from "./invoiceDocument.ts";
import { buildInvoiceDocumentModel } from "./invoiceDocumentModel.ts";
import { renderInvoicePdf } from "./invoicePdfDocument.ts";
import type { Sale } from "./types.ts";

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
    { id: "return-refund", type: "RETURN", referenceNumber: "RET-4", returnedItems: [{ productId: "product-1", sizeId: "size-1", productName: "Shirt", quantity: 1, total: 1000 }], exchangedItems: [], netAmount: -1000, offsetAmount: 0, refundAmount: 1000, refundMethod: "UPI", createdAt: "2026-09-23T13:00:00Z" },
  ],
  transactionDate: "2026-09-23T09:00:00Z",
  createdAt: "2026-09-23T09:00:00Z",
};

test("renders finalized discounted partial-payment sale data and escapes customer content", () => {
  const html = buildInvoiceDocumentHtml({ sale, merchant: { name: "Rare Thread" } });
  assert.match(html, /INV-1001/);
  assert.match(html, /Amount due/);
  assert.match(html, /Discount/);
  assert.match(html, /Payment - UPI/);
  assert.match(html, /Aarav &lt;script&gt;/);
  assert.doesNotMatch(html, /Aarav <script>/);
});
for (const [id, expected] of [["exchange-pay", "Additional payment"], ["exchange-even", "Equal value"], ["exchange-refund", "Refund"]] as const) {
  test(`renders ${id} settlement without unrelated exchange rows`, () => {
    const html = buildInvoiceDocumentHtml({ sale, merchant: { name: "Rare Thread" }, kind: "EXCHANGE", returnTransactionId: id });
    assert.match(html, new RegExp(expected));
    assert.match(html, new RegExp(sale.returnTransactions.find(item => item.id === id)!.referenceNumber!));
    assert.doesNotMatch(html, /INV-1001<\/title>/);
  });
}

test("renders finalized exchange pricing and settlement payment details", () => {
  const html = buildInvoiceDocumentHtml({ sale, merchant: { name: "Rare Thread" }, kind: "EXCHANGE", returnTransactionId: "exchange-pay" });
  assert.match(html, /Replacement subtotal/);
  assert.match(html, /Exchange discount/);
  assert.match(html, /Tax \(10%\)/);
  assert.match(html, /Top-up - UPI/);
});

test("renders a distinct return receipt with refund settlement", () => {
  const model = buildInvoiceDocumentModel({ sale, merchant: { name: "Rare Thread" }, kind: "RETURN", returnTransactionId: "return-refund" });
  assert.equal(model.title, "Return Receipt");
  assert.equal(model.sections.length, 1);
  assert.match(model.totals.map(row => row.label).join(" "), /Refund amount/);
  const html = buildInvoiceDocumentHtml({ sale, merchant: { name: "Rare Thread" }, kind: "RETURN", returnTransactionId: "return-refund" });
  assert.match(html, /Return Receipt/);
  assert.doesNotMatch(html, /Replacement items/);
});

test("generates non-empty sale and exchange PDF documents at runtime", async () => {
  for (const document of [
    { name: "sale", input: { sale, merchant: { name: "Rare Thread", address: "12 Market Road", phone: "+91 98765 43210" } } },
    { name: "exchange", input: { sale, merchant: { name: "Rare Thread" }, kind: "EXCHANGE" as const, returnTransactionId: "exchange-pay" } },
    { name: "return", input: { sale, merchant: { name: "Rare Thread" }, kind: "RETURN" as const, returnTransactionId: "return-refund" } },
  ]) {
    const pdf = await renderInvoicePdf(document.input);
    assert.equal(pdf.subarray(0, 4).toString(), "%PDF");
    assert.ok(pdf.byteLength > 1_000);
    if (process.env.INVOICE_PDF_OUTPUT_DIR) {
      const outputDirectory = path.resolve(process.env.INVOICE_PDF_OUTPUT_DIR);
      await mkdir(outputDirectory, { recursive: true });
      await writeFile(path.join(outputDirectory, `${document.name}.pdf`), pdf);
    }
  }
});

test("renders every supported design with the immutable policy snapshot", async () => {
  for (const designKey of ["CLASSIC", "PREMIUM", "COMPACT"] as const) {
    const invoiceSnapshot = {
      design: { key: designKey, version: 1 as const },
      policy: {
        id: "policy-1",
        version: 3,
        effectiveFrom: "2026-09-25T00:00:00.000Z",
        termsText: "Payment terms captured at billing.",
        returnPolicyText: "Returns accepted within seven days.",
        thankYouMessage: "Thank you from the snapshot.",
      },
    };
    const snapshottedSale: Sale = { ...sale, invoiceSnapshot };
    const model = buildInvoiceDocumentModel({
      sale: snapshottedSale,
      merchant: { name: "Rare Thread" },
    });
    assert.equal(model.designKey, designKey);
    assert.equal(model.termsText, invoiceSnapshot.policy.termsText);

    const html = buildInvoiceDocumentHtml({
      sale: snapshottedSale,
      merchant: { name: "Rare Thread" },
    });
    assert.match(html, new RegExp(`<body class="${designKey}">`));
    assert.match(html, /Payment terms captured at billing/);
    assert.match(html, /Thank you from the snapshot/);

    const pdf = await renderInvoicePdf({
      sale: snapshottedSale,
      merchant: { name: "Rare Thread" },
    });
    assert.equal(pdf.subarray(0, 4).toString(), "%PDF");
    assert.ok(pdf.byteLength > 1_000);
  }
});

test("paginates long item lists and preserves finalized values in the shared model", async () => {
  const longSale: Sale = {
    ...sale,
    subtotal: 70_200,
    total: 70_050,
    amountPaid: 70_050,
    amountDue: 0,
    paymentStatus: "PAID",
    items: Array.from({ length: 70 }, (_, index) => ({
      ...sale.items[0],
      id: `item-${index}`,
      productName: `Long product ${index + 1} with a descriptive name that must wrap without clipping`,
      sku: `LONG-SKU-${index + 1}`,
    })),
  };
  const model = buildInvoiceDocumentModel({ sale: longSale, merchant: { name: "Rare Thread" } });
  assert.equal(model.sections[0].rows.length, 70);
  assert.equal(model.totals.at(-1)?.value, "INR 70,050.00");
  const pdf = await renderInvoicePdf({ sale: longSale, merchant: { name: "Rare Thread" } });
  assert.equal(pdf.subarray(0, 4).toString(), "%PDF");
  assert.ok(pdf.byteLength > 10_000);
  if (process.env.INVOICE_PDF_OUTPUT_DIR) {
    const outputDirectory = path.resolve(process.env.INVOICE_PDF_OUTPUT_DIR);
    await mkdir(outputDirectory, { recursive: true });
    await writeFile(path.join(outputDirectory, "long-sale.pdf"), pdf);
  }
});
