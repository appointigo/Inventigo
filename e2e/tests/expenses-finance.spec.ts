import { expect, test } from "@playwright/test";
import { apiFetch, expectJson, expectMoney } from "../helpers/business";
import { E2E_IDS, e2eDb } from "../helpers/database";

test.afterAll(async () => {
  await e2eDb.$disconnect();
});

test("approved expense affects profit but posts cash only when settled", async ({ page }) => {
  const created = await apiFetch(page, "/api/expenses", {
    method: "POST",
    data: {
      storeId: E2E_IDS.store,
      category: "Rent",
      amount: 300,
      date: new Date().toISOString().slice(0, 10),
      note: "E2E approved expense",
      paymentMode: "CASH",
      isRecurring: false,
    },
  });
  const expense = await expectJson<{ id: string }>(created, 201);
  const before = await e2eDb.storeExpense.findUniqueOrThrow({ where: { id: expense.id } });
  expect(before.status).toBe("APPROVED");
  expect(await e2eDb.financialTransaction.count({ where: { expenseId: expense.id } })).toBe(0);

  const settledResponse = await apiFetch(page, `/api/finance/expenses/${expense.id}/settle`, {
    method: "POST",
    data: { accountId: E2E_IDS.cashAccount, paidAt: new Date().toISOString() },
  });
  await expectJson(settledResponse, 201);
  const after = await e2eDb.storeExpense.findUniqueOrThrow({
    where: { id: expense.id },
    include: { financialTransaction: true },
  });
  expect(after.paymentStatus).toBe("PAID");
  expectMoney(after.amount, 300);
  expect(after.financialTransaction?.direction).toBe("OUTFLOW");
  expectMoney(after.financialTransaction?.amount, 300);
  expect(await e2eDb.financialTransaction.count({ where: { expenseId: expense.id } })).toBe(1);

  const duplicate = await apiFetch(page, `/api/finance/expenses/${expense.id}/settle`, {
    method: "POST",
    data: { accountId: E2E_IDS.cashAccount, paidAt: new Date().toISOString() },
  });
  await expectJson(duplicate, 400);
  expect(await e2eDb.financialTransaction.count({ where: { expenseId: expense.id } })).toBe(1);
});

test("expense summary filters by business year and keeps expense out of sales", async ({ page }) => {
  const year = new Date().getUTCFullYear();
  const [summaryResponse, salesBefore] = await Promise.all([
    apiFetch(page, `/api/expenses/summary?storeId=${E2E_IDS.store}&year=${year}`),
    e2eDb.sale.count(),
  ]);
  const summary = await expectJson<{ grandTotal: number }>(summaryResponse, 200);
  expect(summary.grandTotal).toBeGreaterThanOrEqual(300);
  expect(await e2eDb.sale.count()).toBe(salesBefore);
});

test("known defect: zero and negative expenses are rejected without persistence", async ({
  page,
}, testInfo) => {
  test.fail(true, "P1-001: expense creation does not validate positive monetary amounts");
  const note = "E2E invalid expense boundary";
  const responses = [];
  for (const amount of [0, -0.01]) {
    responses.push(
      await apiFetch(page, "/api/expenses", {
        method: "POST",
        data: {
          storeId: E2E_IDS.store,
          category: "Other",
          amount,
          date: new Date().toISOString().slice(0, 10),
          note,
          paymentMode: "CASH",
          isRecurring: false,
        },
      }),
    );
  }
  const persisted = await e2eDb.storeExpense.findMany({ where: { note } });
  await testInfo.attach("invalid-expense-boundary-evidence.json", {
    body: JSON.stringify(
      {
        responseStatuses: responses.map((response) => response.status),
        responses: responses.map((response) => response.body),
        persisted: persisted.map((expense) => ({ id: expense.id, amount: Number(expense.amount) })),
      },
      null,
      2,
    ),
    contentType: "application/json",
  });
  await e2eDb.storeExpense.deleteMany({ where: { note } });
  expect(responses.map((response) => response.status)).toEqual([400, 400]);
  expect(persisted).toHaveLength(0);
});

test("known defect: a paid expense cannot be edited away from its cash ledger", async ({
  page,
}, testInfo) => {
  test.fail(true, "P0-004: editing a settled expense breaks expense-to-ledger reconciliation");
  const created = await expectJson<{ id: string }>(
    await apiFetch(page, "/api/expenses", {
      method: "POST",
      data: {
        storeId: E2E_IDS.store,
        category: "Other",
        amount: 300,
        date: new Date().toISOString().slice(0, 10),
        note: "E2E paid expense edit probe",
        paymentMode: "CASH",
        isRecurring: false,
      },
    }),
    201,
  );
  await expectJson(
    await apiFetch(page, `/api/finance/expenses/${created.id}/settle`, {
      method: "POST",
      data: { accountId: E2E_IDS.cashAccount, paidAt: new Date().toISOString() },
    }),
    201,
  );
  const update = await apiFetch(page, `/api/expenses/${created.id}`, {
    method: "PUT",
    data: { amount: 500 },
  });
  const persisted = await e2eDb.storeExpense.findUniqueOrThrow({
    where: { id: created.id },
    include: { financialTransaction: true },
  });
  await testInfo.attach("paid-expense-edit-evidence.json", {
    body: JSON.stringify(
      {
        updateStatus: update.status,
        updateBody: update.body,
        expenseAmount: Number(persisted.amount),
        ledgerAmount: Number(persisted.financialTransaction?.amount ?? 0),
        paymentStatus: persisted.paymentStatus,
      },
      null,
      2,
    ),
    contentType: "application/json",
  });
  await e2eDb.financialTransaction.deleteMany({ where: { expenseId: created.id } });
  await e2eDb.storeExpense.delete({ where: { id: created.id } });
  expect(update.status).toBe(409);
  expect(Number(persisted.amount)).toBe(Number(persisted.financialTransaction?.amount));
});
