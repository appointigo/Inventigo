import { expect, test } from "@playwright/test";
import {
  apiFetch,
  createSale,
  expectJson,
  expectMoney,
  saleItem,
  salePayload,
} from "../helpers/business";
import { E2E_IDS, e2eDb } from "../helpers/database";

test.describe.configure({ mode: "serial" });

test.afterAll(async () => {
  await e2eDb.$disconnect();
});

for (const scenario of [
  { method: "UPI", phone: "9990000101", accountId: E2E_IDS.upiAccount },
  { method: "CARD", phone: "9990000102", accountId: E2E_IDS.cardAccount },
] as const) {
  test(`${scenario.method} sale posts exactly one mapped inflow`, async ({ page }) => {
    const sale = await createSale(page, scenario.phone, {
      paymentMethod: scenario.method,
    });
    const persisted = await e2eDb.sale.findUniqueOrThrow({
      where: { id: sale.id },
      include: { payments: { include: { financialTransaction: true } }, items: true },
    });
    expect(persisted.payments).toHaveLength(1);
    expect(persisted.payments[0].method).toBe(scenario.method);
    expectMoney(persisted.payments[0].amount, 1000);
    expect(persisted.payments[0].financialTransaction?.accountId).toBe(scenario.accountId);
    expect(persisted.payments[0].financialTransaction?.direction).toBe("INFLOW");
    expect(persisted.items).toHaveLength(1);
  });
}

test("split payment creates two settlements but one sale and one stock movement", async ({
  page,
}) => {
  const sale = await createSale(page, "9990000103", {
    paymentMethod: "CASH",
    splitPayments: [
      { method: "CASH", amount: 600 },
      { method: "UPI", amount: 400 },
    ],
    amountPaid: 1000,
  });
  const [persisted, saleCount, movements] = await Promise.all([
    e2eDb.sale.findUniqueOrThrow({
      where: { id: sale.id },
      include: { payments: { include: { financialTransaction: true } } },
    }),
    e2eDb.sale.count({ where: { id: sale.id } }),
    e2eDb.stockMovement.findMany({ where: { referenceId: sale.id } }),
  ]);
  expect(saleCount).toBe(1);
  expect(persisted.payments).toHaveLength(2);
  expectMoney(persisted.payments.reduce((sum, row) => sum + Number(row.amount), 0), 1000);
  expect(persisted.payments.every((row) => row.financialTransaction?.direction === "INFLOW")).toBe(
    true,
  );
  expect(movements).toHaveLength(1);
});

test("percentage and flat discounts reduce recognized sale value without extra postings", async ({
  page,
}) => {
  for (const [index, discount] of [
    { discountType: "PERCENTAGE", discountPercent: 10, discountAmount: 0 },
    { discountType: "FLAT", discountAmount: 100 },
  ].entries()) {
    const phone = `999000011${index}`;
    const sale = await createSale(page, phone, {
      ...discount,
      amountPaid: 900,
    });
    const persisted = await e2eDb.sale.findUniqueOrThrow({
      where: { id: sale.id },
      include: { payments: true, items: true },
    });
    expectMoney(persisted.subtotal, 1000);
    expectMoney(persisted.discountAmount, 100);
    expectMoney(persisted.finalPayableAmount, 900);
    expectMoney(persisted.amountPaid, 900);
    expectMoney(persisted.amountDue, 0);
    expect(persisted.payments).toHaveLength(1);
    expect(persisted.items).toHaveLength(1);
    expectMoney(persisted.items[0].allocatedDiscount, 100);
  }
});

test("multi-product and multiple-quantity sale decrements each variant exactly", async ({ page }) => {
  const before = await e2eDb.stockEntry.findMany({
    where: {
      storeId: E2E_IDS.store,
      productId: { in: [E2E_IDS.product, E2E_IDS.secondProduct] },
    },
    orderBy: { productId: "asc" },
  });
  const sale = await createSale(page, "9990000120", {
    items: [
      saleItem({ quantity: 2 }),
      saleItem({
        productId: E2E_IDS.secondProduct,
        productName: "E2E Runner Tee",
        sku: "E2E-P1-TEE",
        quantity: 3,
        unitPrice: 500,
      }),
    ],
    amountPaid: 3500,
  });
  const [after, persisted, movements] = await Promise.all([
    e2eDb.stockEntry.findMany({
      where: {
        storeId: E2E_IDS.store,
        productId: { in: [E2E_IDS.product, E2E_IDS.secondProduct] },
      },
      orderBy: { productId: "asc" },
    }),
    e2eDb.sale.findUniqueOrThrow({ where: { id: sale.id }, include: { items: true } }),
    e2eDb.stockMovement.findMany({ where: { referenceId: sale.id } }),
  ]);
  expect(persisted.items).toHaveLength(2);
  expect(movements).toHaveLength(2);
  expect(after.map((row, index) => before[index].quantity - row.quantity)).toEqual([2, 3]);
});

test("invalid quantity, overpayment and insufficient stock leave no partial records", async ({
  page,
}) => {
  const before = await e2eDb.sale.count();
  const invalidQuantity = await apiFetch(page, "/api/billing", {
    method: "POST",
    data: salePayload("9990000130", { items: [saleItem({ quantity: 0 })] }),
  });
  await expectJson(invalidQuantity, 400);

  const overpayment = await apiFetch(page, "/api/billing", {
    method: "POST",
    data: salePayload("9990000131", {
      paymentMethod: "CARD",
      amountPaid: 1001,
    }),
  });
  await expectJson(overpayment, 400);

  const insufficient = await apiFetch(page, "/api/billing", {
    method: "POST",
    data: salePayload("9990000132", { items: [saleItem({ quantity: 100000 })] }),
  });
  await expectJson(insufficient, 400);
  expect(await e2eDb.sale.count()).toBe(before);
});

test("last available unit sells once and cannot drive stock negative", async ({ page }) => {
  const item = saleItem({
    productId: E2E_IDS.lastUnitProduct,
    productName: "E2E Last Unit Tee",
    sku: "E2E-P2-LAST",
    unitPrice: 750,
  });
  const sale = await createSale(page, "9990000140", { items: [item], amountPaid: 750 });
  const rejected = await apiFetch(page, "/api/billing", {
    method: "POST",
    data: salePayload("9990000141", { items: [item], amountPaid: 750 }),
  });
  await expectJson(rejected, 400);
  const stock = await e2eDb.stockEntry.findUniqueOrThrow({
    where: {
      productId_sizeId_storeId: {
        productId: E2E_IDS.lastUnitProduct,
        sizeId: E2E_IDS.size,
        storeId: E2E_IDS.store,
      },
    },
  });
  expect(stock.quantity).toBe(0);
  expect(await e2eDb.stockMovement.count({ where: { referenceId: sale.id } })).toBe(1);
});
