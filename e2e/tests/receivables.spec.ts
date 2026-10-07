import { expect, test } from "@playwright/test";
import { apiFetch, createSale, expectJson, expectMoney } from "../helpers/business";
import { E2E_IDS, e2eDb } from "../helpers/database";

test.afterAll(async () => {
  await e2eDb.$disconnect();
});

test("partial sale and later collection settle receivable without new revenue or inventory", async ({
  page,
}) => {
  const sale = await createSale(page, "9990000201", { amountPaid: 600 });
  const before = await e2eDb.sale.findUniqueOrThrow({
    where: { id: sale.id },
    include: { customer: true, payments: true },
  });
  expectMoney(before.finalPayableAmount, 1000);
  expectMoney(before.amountPaid, 600);
  expectMoney(before.amountDue, 400);
  expect(before.paymentStatus).toBe("PARTIAL");
  expectMoney(before.customer?.totalSpent, 1000);
  const movementCount = await e2eDb.stockMovement.count({ where: { referenceId: sale.id } });

  const collected = await apiFetch(page, `/api/billing/${sale.id}/payments`, {
    method: "POST",
    data: { amount: 400, method: "UPI", note: "E2E receivable settlement" },
  });
  await expectJson(collected, 201);

  const after = await e2eDb.sale.findUniqueOrThrow({
    where: { id: sale.id },
    include: { customer: true, payments: { include: { financialTransaction: true } } },
  });
  expectMoney(after.finalPayableAmount, 1000);
  expectMoney(after.amountPaid, 1000);
  expectMoney(after.amountDue, 0);
  expect(after.paymentStatus).toBe("PAID");
  expect(after.payments).toHaveLength(2);
  expectMoney(after.customer?.totalSpent, 1000);
  expect(await e2eDb.sale.count({ where: { id: sale.id } })).toBe(1);
  expect(await e2eDb.stockMovement.count({ where: { referenceId: sale.id } })).toBe(
    movementCount,
  );
  expect(after.payments.every((payment) => payment.financialTransaction?.direction === "INFLOW"))
    .toBe(true);
});

test("over-collection is rejected atomically", async ({ page }) => {
  const sale = await createSale(page, "9990000202", { amountPaid: 600 });
  const response = await apiFetch(page, `/api/billing/${sale.id}/payments`, {
    method: "POST",
    data: { amount: 401, method: "CASH" },
  });
  await expectJson(response, 400);
  const persisted = await e2eDb.sale.findUniqueOrThrow({
    where: { id: sale.id },
    include: { payments: true },
  });
  expectMoney(persisted.amountDue, 400);
  expect(persisted.payments).toHaveLength(1);
});

test("fully unpaid credit sale creates a receivable without a cash movement", async ({ page }) => {
  const sale = await createSale(page, "9990000203", { amountPaid: 0 });
  const persisted = await e2eDb.sale.findUniqueOrThrow({
    where: { id: sale.id },
    include: { payments: true },
  });
  expectMoney(persisted.finalPayableAmount, 1000);
  expectMoney(persisted.amountPaid, 0);
  expectMoney(persisted.amountDue, 1000);
  expect(persisted.paymentStatus).toBe("PENDING");
  expect(persisted.payments).toHaveLength(0);
  expect(await e2eDb.financialTransaction.count({ where: { salePayment: { saleId: sale.id } } })).toBe(0);

  const receivables = await expectJson<{
    items: Array<{ id: string; outstanding: number }>;
  }>(await apiFetch(page, `/api/receivables?storeId=${E2E_IDS.store}&page=1&pageSize=100`), 200);
  expect(receivables.items).toContainEqual(
    expect.objectContaining({ id: sale.id, outstanding: 1000 }),
  );
});
