import { expect, test } from "@playwright/test";
import { apiFetch, expectJson, expectMoney } from "../helpers/business";
import { E2E_IDS, e2eDb } from "../helpers/database";

test.describe.configure({ mode: "serial" });

test.afterAll(async () => {
  await e2eDb.$disconnect();
});

test("PO commitment, receipt, payable and partial supplier settlements reconcile", async ({
  page,
}) => {
  const opening = await e2eDb.stockEntry.findUniqueOrThrow({
    where: {
      productId_sizeId_storeId: {
        productId: E2E_IDS.secondProduct,
        sizeId: E2E_IDS.size,
        storeId: E2E_IDS.store,
      },
    },
  });
  const supplierPaymentsBefore = await e2eDb.financialTransaction.count({
    where: { referenceType: "SUPPLIER_PAYMENT" },
  });
  const create = await apiFetch(page, "/api/purchase-orders", {
    method: "POST",
    data: {
      storeId: E2E_IDS.store,
      supplierId: E2E_IDS.supplier,
      notes: "E2E purchase lifecycle",
      items: [
        {
          productId: E2E_IDS.secondProduct,
          sizeId: E2E_IDS.size,
          quantity: 4,
          unitCost: 250,
        },
      ],
    },
  });
  const po = await expectJson<{ id: string; items: Array<{ id: string }>; status: string }>(
    create,
    201,
  );
  expect(po.status).toBe("DRAFT");
  expect(await e2eDb.financialTransaction.count({ where: { referenceType: "SUPPLIER_PAYMENT" } }))
    .toBe(supplierPaymentsBefore);
  expect((await e2eDb.stockEntry.findUniqueOrThrow({ where: { id: opening.id } })).quantity).toBe(
    opening.quantity,
  );

  const submitted = await apiFetch(page, `/api/purchase-orders/${po.id}/submit`, {
    method: "POST",
  });
  const ordered = await expectJson<{ status: string }>(submitted, 200);
  expect(ordered.status).toBe("ORDERED");

  const received = await apiFetch(page, `/api/purchase-orders/${po.id}/receive`, {
    method: "POST",
    data: {
      supplierInvoiceNumber: "E2E-SUP-001",
      receivedAt: new Date().toISOString(),
      items: [
        {
          purchaseOrderItemId: po.items[0].id,
          receivedQuantity: 4,
          acceptedQuantity: 4,
          rejectedQuantity: 0,
          damagedQuantity: 0,
          unitCostActual: 250,
        },
      ],
    },
  });
  const receivedPo = await expectJson<{ status: string }>(received, 200);
  expect(receivedPo.status).toBe("RECEIVED");
  const receipt = await e2eDb.purchaseOrderReceipt.findFirstOrThrow({
    where: { purchaseOrderId: po.id },
  });
  const afterReceipt = await e2eDb.stockEntry.findUniqueOrThrow({ where: { id: opening.id } });
  expect(afterReceipt.quantity).toBe(opening.quantity + 4);
  expect(
    await e2eDb.stockMovement.count({ where: { referenceType: "PO", referenceId: receipt.id } }),
  ).toBe(1);
  expect(await e2eDb.financialTransaction.count({ where: { referenceId: po.id } })).toBe(0);

  const payableResponse = await apiFetch(page, "/api/finance/payables", {
    method: "POST",
    data: {
      receiptId: receipt.id,
      supplierInvoiceNumber: "E2E-SUP-001",
      invoiceDate: new Date().toISOString(),
      originalAmount: 1000,
    },
  });
  const payable = await expectJson<{ id: string }>(payableResponse, 201);
  for (const [index, amount] of [400, 600].entries()) {
    const payment = await apiFetch(page, `/api/finance/payables/${payable.id}/payments`, {
      method: "POST",
      data: {
        amount,
        accountId: E2E_IDS.cashAccount,
        method: "CASH",
        paymentDate: new Date().toISOString(),
        idempotencyKey: `e2e-supplier-payment-${index}`,
      },
    });
    await expectJson(payment, 201);
  }
  const persisted = await e2eDb.supplierPayable.findUniqueOrThrow({
    where: { id: payable.id },
    include: { payments: { include: { financialTransaction: true } } },
  });
  expect(persisted.status).toBe("PAID");
  expectMoney(persisted.paidAmount, 1000);
  expectMoney(persisted.outstandingAmount, 0);
  expect(persisted.payments).toHaveLength(2);
  expect(persisted.payments.every((row) => row.financialTransaction?.direction === "OUTFLOW"))
    .toBe(true);
});
