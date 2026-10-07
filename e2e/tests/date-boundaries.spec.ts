import { expect, test } from "@playwright/test";
import { apiFetch, createSale, expectJson } from "../helpers/business";
import { E2E_IDS, e2eDb } from "../helpers/database";

test.afterAll(async () => {
  await e2eDb.$disconnect();
});

type SalesAnalytics = { summary: { revenue: number; orders: number } };
type FinanceSummary = { movement: { inflows: number; outflows: number; net: number } };

test("known defect: Finance month boundary uses the same IST business day as analytics", async ({
  page,
}, testInfo) => {
  test.fail(true, "P1-002: Finance month movement uses UTC boundaries while analytics uses IST");
  const analytics = async (date: string) =>
    expectJson<SalesAnalytics>(
      await apiFetch(
        page,
        `/api/analytics/sales?storeId=${E2E_IDS.store}&from=${date}&to=${date}&group=day`,
      ),
      200,
    );
  const finance = async () =>
    expectJson<FinanceSummary>(
      await apiFetch(page, `/api/finance/summary?storeId=${E2E_IDS.store}`),
      200,
    );

  await page.goto("/dashboard");
  const [septemberBefore, octoberBefore, financeBefore] = await Promise.all([
    analytics("2026-09-30"),
    analytics("2026-10-01"),
    finance(),
  ]);
  await createSale(page, "9990000501", {
    transactionDate: "2026-09-30T18:29:00.000Z",
  }); // 23:59 IST on September 30.
  await createSale(page, "9990000502", {
    transactionDate: "2026-09-30T18:31:00.000Z",
  }); // 00:01 IST on October 1.
  const [septemberAfter, octoberAfter, financeAfter] = await Promise.all([
    analytics("2026-09-30"),
    analytics("2026-10-01"),
    finance(),
  ]);
  const evidence = {
    septemberAnalyticsRevenueDelta:
      septemberAfter.summary.revenue - septemberBefore.summary.revenue,
    octoberAnalyticsRevenueDelta: octoberAfter.summary.revenue - octoberBefore.summary.revenue,
    octoberFinanceInflowDelta:
      financeAfter.movement.inflows - financeBefore.movement.inflows,
    instants: {
      september: "2026-09-30T18:29:00.000Z",
      october: "2026-09-30T18:31:00.000Z",
    },
  };
  await testInfo.attach("ist-month-boundary-evidence.json", {
    body: JSON.stringify(evidence, null, 2),
    contentType: "application/json",
  });
  expect(evidence.septemberAnalyticsRevenueDelta).toBe(1000);
  expect(evidence.octoberAnalyticsRevenueDelta).toBe(1000);
  expect(evidence.octoberFinanceInflowDelta).toBe(1000);
});
