import { expect, test, type Page } from "@playwright/test";
import { apiFetch, createSale, expectJson, saleItem, salePayload } from "../helpers/business";
import { E2E_IDS, e2eDb } from "../helpers/database";

test.afterAll(async () => {
  await e2eDb.$disconnect();
});

async function authenticatedPeer(page: Page) {
  const peer = await page.context().newPage();
  await Promise.all([page.goto("/dashboard"), peer.goto("/dashboard")]);
  return peer;
}

async function createPayable(page: Page, suffix: string) {
  const purchaseOrder = await expectJson<{ id: string; items: Array<{ id: string }> }>(
    await apiFetch(page, "/api/purchase-orders", {
      method: "POST",
      data: {
        storeId: E2E_IDS.store,
        supplierId: E2E_IDS.supplier,
        notes: `E2E retry/concurrency ${suffix}`,
        items: [
          {
            productId: E2E_IDS.secondProduct,
            sizeId: E2E_IDS.size,
            quantity: 1,
            unitCost: 1000,
          },
        ],
      },
    }),
    201,
  );
  await expectJson(
    await apiFetch(page, `/api/purchase-orders/${purchaseOrder.id}/submit`, { method: "POST" }),
    200,
  );
  await expectJson(
    await apiFetch(page, `/api/purchase-orders/${purchaseOrder.id}/receive`, {
      method: "POST",
      data: {
        supplierInvoiceNumber: `E2E-CONC-${suffix}`,
        receivedAt: new Date().toISOString(),
        items: [
          {
            purchaseOrderItemId: purchaseOrder.items[0].id,
            receivedQuantity: 1,
            acceptedQuantity: 1,
            rejectedQuantity: 0,
            damagedQuantity: 0,
            unitCostActual: 1000,
          },
        ],
      },
    }),
    200,
  );
  const receipt = await e2eDb.purchaseOrderReceipt.findFirstOrThrow({
    where: { purchaseOrderId: purchaseOrder.id },
  });
  return expectJson<{ id: string }>(
    await apiFetch(page, "/api/finance/payables", {
      method: "POST",
      data: {
        receiptId: receipt.id,
        supplierInvoiceNumber: `E2E-CONC-${suffix}`,
        invoiceDate: new Date().toISOString(),
        originalAmount: 1000,
      },
    }),
    201,
  );
}

test("a retried sale request creates only one business transaction", async ({
  page,
}, testInfo) => {
  const phone = "9990000801";
  const before = {
    sales: await e2eDb.sale.count({ where: { customerPhone: phone } }),
    items: await e2eDb.saleItem.count({ where: { sale: { customerPhone: phone } } }),
    payments: await e2eDb.salePayment.count({ where: { sale: { customerPhone: phone } } }),
    ledger: await e2eDb.financialTransaction.count({
      where: { salePayment: { sale: { customerPhone: phone } } },
    }),
    movements: await e2eDb.stockMovement.count({
      where: { referenceType: "SALE", referenceId: { not: null } },
    }),
  };
  const stockBefore = await e2eDb.stockEntry.findUniqueOrThrow({
    where: {
      productId_sizeId_storeId: {
        productId: E2E_IDS.product,
        sizeId: E2E_IDS.size,
        storeId: E2E_IDS.store,
      },
    },
  });
  const request = {
    method: "POST" as const,
    data: salePayload(phone),
    headers: { "x-request-id": "e2e-identical-sale-retry" },
  };
  const peer = await authenticatedPeer(page);
  const [first, second] = await Promise.all([
    apiFetch(page, "/api/billing", request),
    apiFetch(peer, "/api/billing", request),
  ]);
  const replay = await apiFetch(page, "/api/billing", request);
  const conflictingReplay = await apiFetch(page, "/api/billing", {
    ...request,
    data: salePayload(phone, { amountPaid: 999 }),
  });
  const firstBody = first.body as { id: string };
  const secondBody = second.body as { id: string };
  const replayBody = replay.body as { id: string };

  const customer = await e2eDb.customer.findFirstOrThrow({ where: { mobile: phone } });
  const stockAfter = await e2eDb.stockEntry.findUniqueOrThrow({ where: { id: stockBefore.id } });
  const evidence = {
    responseStatuses: [first.status, second.status, replay.status],
    responseSaleIds: [firstBody.id, secondBody.id, replayBody.id],
    conflictingReplayStatus: conflictingReplay.status,
    saleDelta: (await e2eDb.sale.count({ where: { customerPhone: phone } })) - before.sales,
    itemDelta: (await e2eDb.saleItem.count({ where: { sale: { customerPhone: phone } } })) - before.items,
    paymentDelta:
      (await e2eDb.salePayment.count({ where: { sale: { customerPhone: phone } } })) - before.payments,
    ledgerDelta:
      (await e2eDb.financialTransaction.count({
        where: { salePayment: { sale: { customerPhone: phone } } },
      })) - before.ledger,
    movementDelta:
      (await e2eDb.stockMovement.count({
        where: {
          referenceType: "SALE",
          referenceId: {
            in: (
              await e2eDb.sale.findMany({ where: { customerPhone: phone }, select: { id: true } })
            ).map((sale) => sale.id),
          },
        },
      })),
    stockDelta: stockAfter.quantity - stockBefore.quantity,
    customerLifetimeSpend: Number(customer.totalSpent),
  };
  await testInfo.attach("duplicate-sale-db-evidence.json", {
    body: JSON.stringify(evidence, null, 2),
    contentType: "application/json",
  });
  expect(evidence).toEqual({
    responseStatuses: [201, 201, 201],
    responseSaleIds: [firstBody.id, firstBody.id, firstBody.id],
    conflictingReplayStatus: 409,
    saleDelta: 1,
    itemDelta: 1,
    paymentDelta: 1,
    ledgerDelta: 1,
    movementDelta: 1,
    stockDelta: -1,
    customerLifetimeSpend: 1000,
  });
  await peer.close();
});

test("two concurrent clients cannot sell more than the last available unit", async ({ page }) => {
  const peer = await authenticatedPeer(page);
  const item = saleItem({
    productId: E2E_IDS.concurrencyProduct,
    productName: "E2E Concurrent Last Unit",
    sku: "E2E-P3-CONCURRENT",
    unitPrice: 800,
  });
  const [left, right] = await Promise.all([
    apiFetch(page, "/api/billing", {
      method: "POST",
      data: salePayload("9990000802", { items: [item], amountPaid: 800 }),
    }),
    apiFetch(peer, "/api/billing", {
      method: "POST",
      data: salePayload("9990000803", { items: [item], amountPaid: 800 }),
    }),
  ]);
  expect([left.status, right.status].sort()).toEqual([201, 400]);
  const sales = await e2eDb.sale.findMany({
    where: { customerPhone: { in: ["9990000802", "9990000803"] } },
    include: { items: true, payments: { include: { financialTransaction: true } } },
  });
  const stock = await e2eDb.stockEntry.findUniqueOrThrow({
    where: {
      productId_sizeId_storeId: {
        productId: E2E_IDS.concurrencyProduct,
        sizeId: E2E_IDS.size,
        storeId: E2E_IDS.store,
      },
    },
  });
  expect(sales).toHaveLength(1);
  expect(sales[0].items).toHaveLength(1);
  expect(sales[0].payments).toHaveLength(1);
  expect(sales[0].payments[0].financialTransaction).not.toBeNull();
  expect(stock.quantity).toBe(0);
  expect(await e2eDb.stockMovement.count({ where: { referenceId: sales[0].id } })).toBe(1);
  await peer.close();
});

test("concurrent receivable collections cannot exceed the outstanding amount", async ({
  page,
}, testInfo) => {
  const sale = await createSale(page, "9990000810", { amountPaid: 600 });
  const peer = await authenticatedPeer(page);
  const [left, right] = await Promise.all([
    apiFetch(page, `/api/billing/${sale.id}/payments`, {
      method: "POST",
      data: { amount: 400, method: "CASH" },
    }),
    apiFetch(peer, `/api/billing/${sale.id}/payments`, {
      method: "POST",
      data: { amount: 400, method: "UPI" },
    }),
  ]);
  const persisted = await e2eDb.sale.findUniqueOrThrow({
    where: { id: sale.id },
    include: { payments: { include: { financialTransaction: true } } },
  });
  const evidence = {
    responseStatuses: [left.status, right.status].sort(),
    responses: [left.body, right.body],
    amountPaid: Number(persisted.amountPaid),
    amountDue: Number(persisted.amountDue),
    paymentCount: persisted.payments.length,
    ledgerCount: persisted.payments.filter((payment) => payment.financialTransaction).length,
    collectedTotal: persisted.payments.reduce((sum, payment) => sum + Number(payment.amount), 0),
  };
  await testInfo.attach("receivable-concurrency-db-evidence.json", {
    body: JSON.stringify(evidence, null, 2),
    contentType: "application/json",
  });
  expect(evidence.responseStatuses).toEqual([201, 400]);
  expect(Number(persisted.amountPaid)).toBe(1000);
  expect(Number(persisted.amountDue)).toBe(0);
  expect(persisted.payments).toHaveLength(2);
  expect(persisted.payments.filter((payment) => payment.financialTransaction)).toHaveLength(2);
  expect(evidence.collectedTotal).toBe(1000);
  await peer.close();
});

test("concurrent return requests cannot restore the same sold unit twice", async ({ page }) => {
  const sale = await createSale(page, "9990000820");
  const peer = await authenticatedPeer(page);
  const request = (key: string) => ({
    method: "POST" as const,
    headers: { "idempotency-key": key },
    data: {
      type: "RETURN",
      returnedItems: [
        { productId: E2E_IDS.product, sizeId: E2E_IDS.size, quantity: 1, total: 1000 },
      ],
      exchangedItems: [],
    },
  });
  const movementBefore = await e2eDb.stockMovement.count();
  const [left, right] = await Promise.all([
    apiFetch(page, `/api/billing/${sale.id}/return`, request("e2e-concurrent-return-a")),
    apiFetch(peer, `/api/billing/${sale.id}/return`, request("e2e-concurrent-return-b")),
  ]);
  expect([left.status, right.status].sort()).toEqual([201, 400]);
  expect(await e2eDb.returnTransaction.count({ where: { originalSaleId: sale.id } })).toBe(1);
  expect((await e2eDb.stockMovement.count()) - movementBefore).toBe(1);
  await peer.close();
});

test("concurrent refund settlements cannot pay more than the liability", async ({ page }) => {
  const sale = await createSale(page, "9990000830", {
    items: [saleItem({ unitPrice: 500 })],
    amountPaid: 500,
  });
  const returned = await expectJson<{ id: string }>(
    await apiFetch(page, `/api/billing/${sale.id}/return`, {
      method: "POST",
      headers: { "idempotency-key": "e2e-concurrent-refund-return" },
      data: {
        type: "RETURN",
        returnedItems: [
          { productId: E2E_IDS.product, sizeId: E2E_IDS.size, quantity: 1, total: 500 },
        ],
        exchangedItems: [],
      },
    }),
    201,
  );
  const liability = await e2eDb.refundLiability.findUniqueOrThrow({
    where: { returnTransactionId: returned.id },
  });
  const peer = await authenticatedPeer(page);
  const payload = (key: string) => ({
    amount: 500,
    accountId: E2E_IDS.cashAccount,
    method: "CASH",
    settledAt: new Date().toISOString(),
    idempotencyKey: key,
  });
  const [left, right] = await Promise.all([
    apiFetch(page, `/api/finance/refunds/${liability.id}/settlements`, {
      method: "POST",
      data: payload("e2e-concurrent-refund-a"),
    }),
    apiFetch(peer, `/api/finance/refunds/${liability.id}/settlements`, {
      method: "POST",
      data: payload("e2e-concurrent-refund-b"),
    }),
  ]);
  expect([left.status, right.status].sort()).toEqual([201, 400]);
  const after = await e2eDb.refundLiability.findUniqueOrThrow({ where: { id: liability.id } });
  expect(Number(after.settledAmount)).toBe(500);
  expect(Number(after.outstandingAmount)).toBe(0);
  expect(await e2eDb.refundSettlement.count({ where: { liabilityId: liability.id } })).toBe(1);
  await peer.close();
});

test("a retried supplier payment with the same key posts exactly once", async ({ page }) => {
  const payable = await createPayable(page, "RETRY");
  const request = {
    method: "POST" as const,
    data: {
      amount: 1000,
      accountId: E2E_IDS.cashAccount,
      method: "CASH",
      paymentDate: new Date().toISOString(),
      idempotencyKey: "e2e-supplier-exact-retry",
    },
  };
  const first = await apiFetch(page, `/api/finance/payables/${payable.id}/payments`, request);
  const second = await apiFetch(page, `/api/finance/payables/${payable.id}/payments`, request);
  expect(first.status).toBe(201);
  expect(second.status).toBe(201);
  const persisted = await e2eDb.supplierPayable.findUniqueOrThrow({
    where: { id: payable.id },
    include: { payments: { include: { financialTransaction: true } } },
  });
  expect(Number(persisted.paidAmount)).toBe(1000);
  expect(Number(persisted.outstandingAmount)).toBe(0);
  expect(persisted.payments).toHaveLength(1);
  expect(persisted.payments[0].financialTransaction).not.toBeNull();
});

test("concurrent supplier payments cannot exceed the payable balance", async ({
  page,
}, testInfo) => {
  const payable = await createPayable(page, "RACE");
  const peer = await authenticatedPeer(page);
  const payload = (key: string) => ({
    amount: 1000,
    accountId: E2E_IDS.cashAccount,
    method: "CASH",
    paymentDate: new Date().toISOString(),
    idempotencyKey: key,
  });
  const [left, right] = await Promise.all([
    apiFetch(page, `/api/finance/payables/${payable.id}/payments`, {
      method: "POST",
      data: payload("e2e-supplier-race-a"),
    }),
    apiFetch(peer, `/api/finance/payables/${payable.id}/payments`, {
      method: "POST",
      data: payload("e2e-supplier-race-b"),
    }),
  ]);
  const persisted = await e2eDb.supplierPayable.findUniqueOrThrow({
    where: { id: payable.id },
    include: { payments: { include: { financialTransaction: true } } },
  });
  const evidence = {
    responseStatuses: [left.status, right.status].sort(),
    responses: [left.body, right.body],
    paidAmount: Number(persisted.paidAmount),
    outstandingAmount: Number(persisted.outstandingAmount),
    paymentCount: persisted.payments.length,
    ledgerCount: persisted.payments.filter((payment) => payment.financialTransaction).length,
  };
  await testInfo.attach("supplier-payment-concurrency-db-evidence.json", {
    body: JSON.stringify(evidence, null, 2),
    contentType: "application/json",
  });
  expect(evidence.responseStatuses).toEqual([201, 400]);
  expect(evidence.paidAmount).toBe(1000);
  expect(evidence.outstandingAmount).toBe(0);
  expect(evidence.paymentCount).toBe(1);
  expect(evidence.ledgerCount).toBe(1);
  await peer.close();
});
