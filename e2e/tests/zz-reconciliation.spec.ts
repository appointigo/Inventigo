import { expect, test } from "@playwright/test";
import { apiFetch, expectJson, expectMoney } from "../helpers/business";
import { E2E_IDS, e2eDb } from "../helpers/database";
import {
  addBusinessDays,
  businessDateForInstant,
} from "../../src/modules/analytics/utils/dateRange";

test.afterAll(async () => {
  await e2eDb.$disconnect();
});

type Analytics = {
  summary: {
    revenue: number;
    cogs: number;
    grossProfit: number;
    operatingExpenses?: number;
    netProfit?: number;
    orders: number;
  };
  trend: Array<{ revenue: number; cogs: number; grossProfit: number }>;
};

test("sales, returns, COGS, expenses and reports reconcile to independent persisted sums", async ({
  page,
}) => {
  const today = businessDateForInstant(new Date());
  const year = today.slice(0, 4);
  const query = `storeId=${E2E_IDS.store}&from=${year}-01-01&to=${year}-12-31&group=month`;
  await page.goto("/dashboard");
  const [salesResponse, profitResponse, marginResponse, breakdownResponse] = await Promise.all([
    apiFetch(page, `/api/analytics/sales?${query}`),
    apiFetch(page, `/api/analytics/profitability?${query}`),
    apiFetch(page, `/api/reports/profit-margin?${query}`),
    apiFetch(page, `/api/reports/sales-breakdown-v2?${query}`),
  ]);
  const sales = await expectJson<Analytics>(salesResponse, 200);
  const profitability = await expectJson<Analytics>(profitResponse, 200);
  const margin = await expectJson<Array<{ total_revenue: number; total_cost: number }>>(
    marginResponse,
    200,
  );
  const breakdown = await expectJson<Array<{ total_revenue: number; transaction_count: number }>>(
    breakdownResponse,
    200,
  );

  const [persistedSales, persistedReturns, persistedExpenses] = await Promise.all([
    e2eDb.sale.findMany({
      where: {
        storeId: E2E_IDS.store,
        status: { in: ["COMPLETED", "EXCHANGED", "REFUNDED"] },
      },
      include: { items: true },
    }),
    e2eDb.returnTransaction.findMany({
      where: { storeId: E2E_IDS.store },
      include: { items: true, sale: { include: { items: true } } },
    }),
    e2eDb.storeExpense.findMany({
      where: {
        storeId: E2E_IDS.store,
        status: "APPROVED",
        date: { gte: new Date(`${year}-01-01T00:00:00.000Z`), lt: new Date(`${Number(year) + 1}-01-01T00:00:00.000Z`) },
      },
    }),
  ]);

  const saleRevenue = persistedSales.reduce((sum, row) => sum + Number(row.total), 0);
  const returnRevenue = persistedReturns.reduce(
    (sum, row) => sum + Number(row.netAmount) - Number(row.refundAmount),
    0,
  );
  const saleCogs = persistedSales.reduce(
    (sum, sale) =>
      sum + sale.items.reduce((lineSum, item) => lineSum + Number(item.costPrice) * item.quantity, 0),
    0,
  );
  const returnCogs = persistedReturns.reduce((sum, transaction) => {
    const originalCosts = new Map(
      transaction.sale.items.map((item) => [`${item.productId}:${item.sizeId}`, Number(item.costPrice)]),
    );
    return (
      sum +
      transaction.items.reduce((lineSum, item) => {
        const returned = item.returnedProductId && item.returnedSizeId
          ? (originalCosts.get(`${item.returnedProductId}:${item.returnedSizeId}`) ?? 0) * item.returnedQuantity
          : 0;
        const replacement = Number(item.newCostPrice ?? 0) * Number(item.newQuantity ?? 0);
        return lineSum + replacement - returned;
      }, 0)
    );
  }, 0);
  const expenses = persistedExpenses.reduce((sum, row) => sum + Number(row.amount), 0);

  expectMoney(sales.summary.revenue, saleRevenue + returnRevenue);
  expectMoney(sales.summary.cogs, saleCogs + returnCogs);
  expectMoney(sales.summary.grossProfit, sales.summary.revenue - sales.summary.cogs);
  expect(sales.summary.orders).toBe(persistedSales.length);
  expectMoney(profitability.summary.operatingExpenses, expenses);
  expectMoney(
    profitability.summary.netProfit,
    profitability.summary.grossProfit - profitability.summary.operatingExpenses!,
  );
  expectMoney(
    margin.reduce((sum, row) => sum + row.total_revenue, 0),
    sales.summary.revenue,
  );
  expectMoney(
    margin.reduce((sum, row) => sum + row.total_cost, 0),
    sales.summary.cogs,
  );
  expectMoney(
    breakdown.reduce((sum, row) => sum + row.total_revenue, 0),
    sales.summary.revenue,
  );
  expect(breakdown.reduce((sum, row) => sum + row.transaction_count, 0)).toBe(
    sales.summary.orders,
  );
});

test("finance cash movement, receivables and inventory value reconcile to the ledger", async ({
  page,
}) => {
  const summary = await expectJson<{
    cash: { total: number };
    movement: { inflows: number; outflows: number; net: number };
    receivables: number;
    workingCapital: { inventoryValue: number };
  }>(await apiFetch(page, `/api/finance/summary?storeId=${E2E_IDS.store}`), 200);
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const [movements, accounts, receivables, stock] = await Promise.all([
    e2eDb.financialTransaction.findMany({
      where: {
        orgId: E2E_IDS.organization,
        storeId: E2E_IDS.store,
        businessDate: { gte: monthStart, lt: nextMonth },
        referenceType: { not: "ACCOUNT_TRANSFER" },
      },
    }),
    e2eDb.financialAccount.findMany({
      where: { orgId: E2E_IDS.organization, storeId: E2E_IDS.store, isActive: true },
      include: { transactions: true },
    }),
    e2eDb.sale.aggregate({
      where: { storeId: E2E_IDS.store, amountDue: { gt: 0 } },
      _sum: { amountDue: true },
    }),
    e2eDb.stockEntry.findMany({
      where: { storeId: E2E_IDS.store, quantity: { gt: 0 } },
      include: { product: true },
    }),
  ]);
  const inflows = movements
    .filter((row) => row.direction === "INFLOW")
    .reduce((sum, row) => sum + Number(row.amount), 0);
  const outflows = movements
    .filter((row) => row.direction === "OUTFLOW")
    .reduce((sum, row) => sum + Number(row.amount), 0);
  const cash = accounts.reduce(
    (sum, account) =>
      sum +
      Number(account.openingBalance) +
      account.transactions.reduce(
        (movement, row) => movement + (row.direction === "INFLOW" ? 1 : -1) * Number(row.amount),
        0,
      ),
    0,
  );
  const inventory = stock.reduce(
    (sum, row) =>
      sum + row.quantity * Number(row.averageUnitCost ?? row.product.costPrice),
    0,
  );
  expectMoney(summary.movement.inflows, inflows);
  expectMoney(summary.movement.outflows, outflows);
  expectMoney(summary.movement.net, inflows - outflows);
  expectMoney(summary.cash.total, cash);
  expectMoney(summary.receivables, Number(receivables._sum.amountDue ?? 0));
  expectMoney(summary.workingCapital.inventoryValue, inventory);
});

test("dashboard revenue uses the canonical analytics series and invalid date queries fail safely", async ({
  page,
}) => {
  const today = businessDateForInstant(new Date());
  const from = addBusinessDays(today, -13);
  await page.goto("/dashboard");
  const [dashboardResponse, analyticsResponse] = await Promise.all([
    apiFetch(page, `/api/dashboard?storeId=${E2E_IDS.store}`),
    apiFetch(
      page,
      `/api/analytics/sales?storeId=${E2E_IDS.store}&from=${from}&to=${today}&group=day`,
    ),
  ]);
  const dashboard = await expectJson<{ revenueTrend: { day: Array<{ total: number }> } }>(
    dashboardResponse,
    200,
  );
  const analytics = await expectJson<Analytics>(analyticsResponse, 200);
  expect(dashboard.revenueTrend.day.map((row) => row.total)).toEqual(
    analytics.trend.map((row) => row.revenue),
  );

  await expectJson(
    await apiFetch(page, `/api/analytics/sales?storeId=${E2E_IDS.store}&from=bad&to=${today}`),
    400,
  );
  await expectJson(
    await apiFetch(
      page,
      `/api/analytics/sales?storeId=${E2E_IDS.store}&from=${today}&to=${from}&group=day`,
    ),
    400,
  );
});
