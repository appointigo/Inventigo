import { expect, test } from "@playwright/test";
import { apiFetch, createSale, expectJson, expectMoney, saleItem } from "../helpers/business";
import { E2E_IDS, e2eDb } from "../helpers/database";

test.describe.configure({ mode: "serial" });

test.afterAll(async () => {
  await e2eDb.$disconnect();
});

const runnerItem = saleItem({
  productId: E2E_IDS.secondProduct,
  productName: "E2E Runner Tee",
  sku: "E2E-P1-TEE",
  unitPrice: 500,
});

const returnLine = (productId: string, total: number, quantity = 1) => ({
  productId,
  sizeId: E2E_IDS.size,
  quantity,
  total,
});

test("immediate cash refund restores stock and posts one settled outflow", async ({ page }) => {
  const opening = await e2eDb.stockEntry.findUniqueOrThrow({
    where: {
      productId_sizeId_storeId: {
        productId: E2E_IDS.secondProduct,
        sizeId: E2E_IDS.size,
        storeId: E2E_IDS.store,
      },
    },
  });
  const sale = await createSale(page, "9990000301", {
    items: [runnerItem],
    amountPaid: 500,
  });
  const response = await apiFetch(page, `/api/billing/${sale.id}/return`, {
    method: "POST",
    headers: { "idempotency-key": "e2e-immediate-refund" },
    data: {
      type: "RETURN",
      returnedItems: [returnLine(E2E_IDS.secondProduct, 500)],
      exchangedItems: [],
      refundMethod: "CASH",
      refundPayments: [{ method: "CASH", amount: 500 }],
      reason: "E2E immediate refund",
    },
  });
  const returned = await expectJson<{ id: string }>(response, 201);
  const [transaction, liability, stock, customer, movements] = await Promise.all([
    e2eDb.returnTransaction.findUniqueOrThrow({
      where: { id: returned.id },
      include: { items: true },
    }),
    e2eDb.refundLiability.findUniqueOrThrow({
      where: { returnTransactionId: returned.id },
      include: { settlements: { include: { financialTransaction: true } } },
    }),
    e2eDb.stockEntry.findUniqueOrThrow({
      where: {
        productId_sizeId_storeId: {
          productId: E2E_IDS.secondProduct,
          sizeId: E2E_IDS.size,
          storeId: E2E_IDS.store,
        },
      },
    }),
    e2eDb.customer.findFirstOrThrow({
      where: { orgId: E2E_IDS.organization, mobile: "9990000301" },
    }),
    e2eDb.stockMovement.findMany({
      where: { referenceId: returned.id, productId: E2E_IDS.secondProduct },
    }),
  ]);
  expect(transaction.items).toHaveLength(1);
  expectMoney(transaction.refundAmount, 500);
  expect(liability.status).toBe("SETTLED");
  expectMoney(liability.outstandingAmount, 0);
  expect(liability.settlements).toHaveLength(1);
  expect(liability.settlements[0].financialTransaction?.direction).toBe("OUTFLOW");
  expectMoney(liability.settlements[0].financialTransaction?.amount, 500);
  expect(stock.quantity).toBe(opening.quantity);
  expect(movements).toHaveLength(1);
  expect(movements[0].deltaQuantity).toBe(1);
  expectMoney(customer.totalSpent, 0);
});

test("deferred refund creates liability without cash, then supports idempotent partial settlements", async ({
  page,
}) => {
  const sale = await createSale(page, "9990000302", {
    items: [runnerItem],
    amountPaid: 500,
  });
  const response = await apiFetch(page, `/api/billing/${sale.id}/return`, {
    method: "POST",
    headers: { "idempotency-key": "e2e-deferred-refund" },
    data: {
      type: "RETURN",
      returnedItems: [returnLine(E2E_IDS.secondProduct, 500)],
      exchangedItems: [],
      reason: "E2E deferred refund",
    },
  });
  const returned = await expectJson<{ id: string }>(response, 201);
  const liability = await e2eDb.refundLiability.findUniqueOrThrow({
    where: { returnTransactionId: returned.id },
  });
  expect(liability.status).toBe("PENDING");
  expectMoney(liability.outstandingAmount, 500);
  expect(await e2eDb.refundSettlement.count({ where: { liabilityId: liability.id } })).toBe(0);

  const firstPayload = {
    amount: 250,
    accountId: E2E_IDS.cashAccount,
    method: "CASH",
    settledAt: new Date().toISOString(),
    idempotencyKey: "e2e-refund-settlement-one",
  };
  const first = await apiFetch(page, `/api/finance/refunds/${liability.id}/settlements`, {
    method: "POST",
    data: firstPayload,
  });
  const firstSettlement = await expectJson<{ id: string }>(first, 201);
  const retry = await apiFetch(page, `/api/finance/refunds/${liability.id}/settlements`, {
    method: "POST",
    data: firstPayload,
  });
  const retriedSettlement = await expectJson<{ id: string }>(retry, 201);
  expect(retriedSettlement.id).toBe(firstSettlement.id);

  const second = await apiFetch(page, `/api/finance/refunds/${liability.id}/settlements`, {
    method: "POST",
    data: { ...firstPayload, idempotencyKey: "e2e-refund-settlement-two" },
  });
  await expectJson(second, 201);
  const settled = await e2eDb.refundLiability.findUniqueOrThrow({ where: { id: liability.id } });
  expect(settled.status).toBe("SETTLED");
  expectMoney(settled.outstandingAmount, 0);
  expect(await e2eDb.refundSettlement.count({ where: { liabilityId: liability.id } })).toBe(2);
  expect(
    await e2eDb.financialTransaction.count({
      where: { refundSettlement: { liabilityId: liability.id } },
    }),
  ).toBe(2);
});

test("return retry with the same key creates no duplicate return or inventory movement", async ({
  page,
}) => {
  const sale = await createSale(page, "9990000303", {
    items: [runnerItem],
    amountPaid: 500,
  });
  const options = {
    headers: { "idempotency-key": "e2e-return-retry" },
    data: {
      type: "RETURN",
      returnedItems: [returnLine(E2E_IDS.secondProduct, 500)],
      exchangedItems: [],
    },
  };
  const first = await expectJson<{ id: string }>(
    await apiFetch(page, `/api/billing/${sale.id}/return`, { method: "POST", ...options }),
    201,
  );
  const second = await expectJson<{ id: string }>(
    await apiFetch(page, `/api/billing/${sale.id}/return`, { method: "POST", ...options }),
    201,
  );
  expect(second.id).toBe(first.id);
  expect(await e2eDb.returnTransaction.count({ where: { originalSaleId: sale.id } })).toBe(1);
  expect(await e2eDb.stockMovement.count({ where: { referenceId: first.id } })).toBe(1);
});

test("discounted return refunds historical discounted economics, not client face value", async ({
  page,
}) => {
  const sale = await createSale(page, "9990000308", {
    discountType: "PERCENTAGE",
    discountPercent: 10,
    amountPaid: 900,
  });
  const response = await apiFetch(page, `/api/billing/${sale.id}/return`, {
    method: "POST",
    headers: { "idempotency-key": "e2e-discounted-return" },
    data: {
      type: "RETURN",
      returnedItems: [returnLine(E2E_IDS.product, 1000)],
      exchangedItems: [],
      refundMethod: "CASH",
      refundPayments: [{ method: "CASH", amount: 900 }],
    },
  });
  const returned = await expectJson<{ id: string }>(response, 201);
  const [transaction, liability, customer] = await Promise.all([
    e2eDb.returnTransaction.findUniqueOrThrow({ where: { id: returned.id } }),
    e2eDb.refundLiability.findUniqueOrThrow({
      where: { returnTransactionId: returned.id },
      include: { settlements: { include: { financialTransaction: true } } },
    }),
    e2eDb.customer.findFirstOrThrow({ where: { mobile: "9990000308" } }),
  ]);
  expectMoney(transaction.refundAmount, 900);
  expectMoney(liability.liabilityAmount, 900);
  expectMoney(liability.settledAmount, 900);
  expectMoney(liability.outstandingAmount, 0);
  expectMoney(liability.settlements[0].financialTransaction?.amount, 900);
  expectMoney(customer.totalSpent, 0);
});

test("invalid non-sale return item is rejected without partial state", async ({ page }) => {
  const sale = await createSale(page, "9990000309");
  const before = await Promise.all([
    e2eDb.returnTransaction.count({ where: { originalSaleId: sale.id } }),
    e2eDb.stockMovement.count(),
    e2eDb.refundLiability.count(),
    e2eDb.refundSettlement.count(),
  ]);
  const response = await apiFetch(page, `/api/billing/${sale.id}/return`, {
    method: "POST",
    headers: { "idempotency-key": "e2e-invalid-return-product" },
    data: {
      type: "RETURN",
      returnedItems: [returnLine(E2E_IDS.secondProduct, 500)],
      exchangedItems: [],
    },
  });
  await expectJson(response, 400);
  expect(
    await Promise.all([
      e2eDb.returnTransaction.count({ where: { originalSaleId: sale.id } }),
      e2eDb.stockMovement.count(),
      e2eDb.refundLiability.count(),
      e2eDb.refundSettlement.count(),
    ]),
  ).toEqual(before);
});

test("partial quantity return restores only the selected unit and blocks excessive reuse", async ({
  page,
}) => {
  const sale = await createSale(page, "9990000304", {
    items: [saleItem({ quantity: 2 })],
    amountPaid: 2000,
  });
  const stockAfterSale = await e2eDb.stockEntry.findUniqueOrThrow({
    where: {
      productId_sizeId_storeId: {
        productId: E2E_IDS.product,
        sizeId: E2E_IDS.size,
        storeId: E2E_IDS.store,
      },
    },
  });
  const partial = await expectJson<{ id: string }>(
    await apiFetch(page, `/api/billing/${sale.id}/return`, {
      method: "POST",
      headers: { "idempotency-key": "e2e-partial-return" },
      data: {
        type: "RETURN",
        returnedItems: [returnLine(E2E_IDS.product, 1000)],
        exchangedItems: [],
        reason: "E2E partial quantity return",
      },
    }),
    201,
  );
  const stockAfterReturn = await e2eDb.stockEntry.findUniqueOrThrow({ where: { id: stockAfterSale.id } });
  expect(stockAfterReturn.quantity).toBe(stockAfterSale.quantity + 1);
  expect(await e2eDb.stockMovement.count({ where: { referenceId: partial.id } })).toBe(1);

  const countsBefore = await Promise.all([
    e2eDb.returnTransaction.count({ where: { originalSaleId: sale.id } }),
    e2eDb.stockMovement.count(),
  ]);
  const excessive = await apiFetch(page, `/api/billing/${sale.id}/return`, {
    method: "POST",
    headers: { "idempotency-key": "e2e-excessive-return" },
    data: {
      type: "RETURN",
      returnedItems: [returnLine(E2E_IDS.product, 2000, 2)],
      exchangedItems: [],
    },
  });
  await expectJson(excessive, 400);
  expect(await Promise.all([
    e2eDb.returnTransaction.count({ where: { originalSaleId: sale.id } }),
    e2eDb.stockMovement.count(),
  ])).toEqual(countsBefore);
});

test("higher-value exchange collects only the top-up and reconciles both stocks", async ({
  page,
}) => {
  const before = await e2eDb.stockEntry.findMany({
    where: {
      storeId: E2E_IDS.store,
      productId: { in: [E2E_IDS.product, E2E_IDS.secondProduct] },
    },
  });
  const sale = await createSale(page, "9990000310", {
    items: [runnerItem],
    amountPaid: 500,
  });
  const response = await apiFetch(page, `/api/billing/${sale.id}/return`, {
    method: "POST",
    headers: { "idempotency-key": "e2e-exchange-higher" },
    data: {
      type: "EXCHANGE",
      returnedItems: [returnLine(E2E_IDS.secondProduct, 500)],
      exchangedItems: [returnLine(E2E_IDS.product, 1000)],
      topUpPayments: [{ method: "CASH", amount: 500 }],
    },
  });
  const exchanged = await expectJson<{ id: string }>(response, 201);
  const [transaction, payments, after, movements, customer] = await Promise.all([
    e2eDb.returnTransaction.findUniqueOrThrow({ where: { id: exchanged.id } }),
    e2eDb.salePayment.findMany({ where: { saleId: sale.id } }),
    e2eDb.stockEntry.findMany({
      where: {
        storeId: E2E_IDS.store,
        productId: { in: [E2E_IDS.product, E2E_IDS.secondProduct] },
      },
    }),
    e2eDb.stockMovement.findMany({ where: { referenceId: exchanged.id } }),
    e2eDb.customer.findFirstOrThrow({ where: { mobile: "9990000310" } }),
  ]);
  expectMoney(transaction.netAmount, 500);
  expectMoney(transaction.refundAmount, 0);
  expect(payments).toHaveLength(2);
  expectMoney(payments.reduce((sum, row) => sum + Number(row.amount), 0), 1000);
  const quantity = (rows: typeof before, productId: string) =>
    rows.find((row) => row.productId === productId)!.quantity;
  expect(quantity(after, E2E_IDS.secondProduct)).toBe(quantity(before, E2E_IDS.secondProduct));
  expect(quantity(after, E2E_IDS.product)).toBe(quantity(before, E2E_IDS.product) - 1);
  expect(movements).toHaveLength(2);
  expectMoney(customer.totalSpent, 1000);
});

test("exchange retry reuses one transaction, two movements and one top-up", async ({ page }) => {
  const sale = await createSale(page, "9990000313", {
    items: [runnerItem],
    amountPaid: 500,
  });
  const request = {
    method: "POST" as const,
    headers: { "idempotency-key": "e2e-exchange-exact-retry" },
    data: {
      type: "EXCHANGE",
      returnedItems: [returnLine(E2E_IDS.secondProduct, 500)],
      exchangedItems: [returnLine(E2E_IDS.product, 1000)],
      topUpPayments: [{ method: "CASH", amount: 500 }],
    },
  };
  const first = await expectJson<{ id: string }>(
    await apiFetch(page, `/api/billing/${sale.id}/return`, request),
    201,
  );
  const second = await expectJson<{ id: string }>(
    await apiFetch(page, `/api/billing/${sale.id}/return`, request),
    201,
  );
  expect(second.id).toBe(first.id);
  expect(await e2eDb.returnTransaction.count({ where: { originalSaleId: sale.id } })).toBe(1);
  expect(await e2eDb.stockMovement.count({ where: { referenceId: first.id } })).toBe(2);
  expect(await e2eDb.salePayment.count({ where: { saleId: sale.id } })).toBe(2);
  expect(
    await e2eDb.financialTransaction.count({ where: { salePayment: { saleId: sale.id } } }),
  ).toBe(2);
});

test("cheaper and equal-value exchanges do not duplicate settlement value", async ({ page }) => {
  const cheaperSale = await createSale(page, "9990000311");
  const cheaperResponse = await apiFetch(page, `/api/billing/${cheaperSale.id}/return`, {
    method: "POST",
    headers: { "idempotency-key": "e2e-exchange-cheaper" },
    data: {
      type: "EXCHANGE",
      returnedItems: [returnLine(E2E_IDS.product, 1000)],
      exchangedItems: [returnLine(E2E_IDS.secondProduct, 500)],
      refundMethod: "UPI",
      refundPayments: [{ method: "UPI", amount: 500 }],
    },
  });
  const cheaper = await expectJson<{ id: string }>(cheaperResponse, 201);
  const cheaperTx = await e2eDb.returnTransaction.findUniqueOrThrow({ where: { id: cheaper.id } });
  expectMoney(cheaperTx.netAmount, 0);
  expectMoney(cheaperTx.refundAmount, 500);
  expect(await e2eDb.refundSettlement.count({ where: { liability: { returnTransactionId: cheaper.id } } }))
    .toBe(1);

  const equalSale = await createSale(page, "9990000312");
  const equalResponse = await apiFetch(page, `/api/billing/${equalSale.id}/return`, {
    method: "POST",
    headers: { "idempotency-key": "e2e-exchange-equal" },
    data: {
      type: "EXCHANGE",
      returnedItems: [returnLine(E2E_IDS.product, 1000)],
      exchangedItems: [returnLine(E2E_IDS.product, 1000)],
    },
  });
  const equal = await expectJson<{ id: string }>(equalResponse, 201);
  const equalTx = await e2eDb.returnTransaction.findUniqueOrThrow({ where: { id: equal.id } });
  expectMoney(equalTx.netAmount, 0);
  expectMoney(equalTx.refundAmount, 0);
  expect(await e2eDb.refundLiability.count({ where: { returnTransactionId: equal.id } })).toBe(0);
  expect(await e2eDb.stockMovement.count({ where: { referenceId: equal.id } })).toBe(2);
});
