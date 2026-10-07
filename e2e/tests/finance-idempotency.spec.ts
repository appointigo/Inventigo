import { expect, test } from "@playwright/test";
import { apiFetch, expectJson, expectMoney } from "../helpers/business";
import { E2E_IDS, e2eDb } from "../helpers/database";

test.afterAll(async () => {
  await e2eDb.$disconnect();
});

test("account transfer retry creates one paired ledger transfer", async ({ page }) => {
  const request = {
    method: "POST" as const,
    data: {
      sourceAccountId: E2E_IDS.cashAccount,
      destinationAccountId: E2E_IDS.upiAccount,
      amount: 100,
      businessDate: new Date().toISOString(),
      idempotencyKey: "e2e-finance-transfer-retry",
      reference: "E2E transfer retry",
    },
  };
  const first = await expectJson<{ id: string }>(
    await apiFetch(page, "/api/finance/transfers", request),
    201,
  );
  const second = await expectJson<{ id: string }>(
    await apiFetch(page, "/api/finance/transfers", request),
    201,
  );
  expect(second.id).toBe(first.id);
  const transfer = await e2eDb.financialAccountTransfer.findUniqueOrThrow({
    where: { id: first.id },
    include: { transactions: true },
  });
  expectMoney(transfer.amount, 100);
  expect(transfer.transactions).toHaveLength(2);
  expect(transfer.transactions.map((row) => row.direction).sort()).toEqual(["INFLOW", "OUTFLOW"]);
});

test("cash adjustment retry creates one ledger event", async ({ page }) => {
  const request = {
    method: "POST" as const,
    data: {
      accountId: E2E_IDS.cashAccount,
      direction: "INFLOW",
      amount: 50,
      businessDate: new Date().toISOString(),
      idempotencyKey: "e2e-finance-adjustment-retry",
      category: "E2E_TEST",
      description: "E2E adjustment retry",
    },
  };
  const first = await expectJson<{ id: string }>(
    await apiFetch(page, "/api/finance/adjustments", request),
    201,
  );
  const second = await expectJson<{ id: string }>(
    await apiFetch(page, "/api/finance/adjustments", request),
    201,
  );
  expect(second.id).toBe(first.id);
  const rows = await e2eDb.financialTransaction.findMany({
    where: { idempotencyKey: `ADJUSTMENT:${E2E_IDS.organization}:e2e-finance-adjustment-retry` },
  });
  expect(rows).toHaveLength(1);
  expectMoney(rows[0].amount, 50);
  expect(rows[0].direction).toBe("INFLOW");
});
