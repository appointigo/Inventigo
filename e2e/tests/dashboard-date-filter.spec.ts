import { expect, test, type Page } from "@playwright/test";
import { businessDateForInstant, resolveAnalyticsDateRange } from "../../src/modules/analytics/utils/dateRange";

async function selectPeriod(page: Page, currentLabel: string, nextLabel: string) {
  const labels = [
    "Today", "Yesterday", "This Week", "Last Week", "This Month", "Last Month",
    "This Quarter", "Last Quarter", "This Year", "Last Year", "Last 7 Days",
    "Last 30 Days", "Custom",
  ];
  const currentIndex = labels.indexOf(currentLabel);
  const nextIndex = labels.indexOf(nextLabel);
  if (currentIndex < 0 || nextIndex < 0) {
    throw new Error(`Unknown Dashboard period transition: ${currentLabel} → ${nextLabel}`);
  }
  const select = page.getByLabel("Analytics date range");
  await select.click();
  const key = nextIndex >= currentIndex ? "ArrowDown" : "ArrowUp";
  for (let step = 0; step < Math.abs(nextIndex - currentIndex); step += 1) {
    await select.press(key);
  }
  await select.press("Enter");
}

test("Dashboard defaults to Today and persists preset and custom date selections", async ({ page }) => {
  const today = businessDateForInstant(new Date());
  const thisWeek = resolveAnalyticsDateRange("thisWeek");
  const [year, month, day] = today.split("-").map(Number);
  const todayLabel = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));

  await page.goto("/dashboard");
  await expect(page.getByText("Today", { exact: true }).first()).toBeVisible();
  await expect(page.getByText(`Today · ${todayLabel}`, { exact: true }).first()).toBeVisible();

  const weeklyRequest = page.waitForRequest((request) => {
    const url = new URL(request.url());
    return url.pathname === "/api/analytics/profitability"
      && url.searchParams.get("from") === thisWeek.from
      && url.searchParams.get("to") === thisWeek.to
      && url.searchParams.get("group") === thisWeek.group;
  });
  await selectPeriod(page, "Today", "This Week");
  await expect(page).toHaveURL(/period=thisWeek/);
  await weeklyRequest;

  await selectPeriod(page, "This Week", "Last Quarter");
  await expect(page).toHaveURL(/period=lastQuarter/);

  await selectPeriod(page, "Last Quarter", "Custom");
  const rangeInputs = page.locator(".ant-picker-range input");
  await rangeInputs.nth(0).fill("01 Oct 2026");
  await rangeInputs.nth(0).press("Tab");
  await rangeInputs.nth(1).fill("07 Oct 2026");
  await rangeInputs.nth(1).press("Tab");
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(page).toHaveURL(/period=custom&from=2026-10-01&to=2026-10-07/);

  await page.reload();
  await expect(page.getByText("Custom", { exact: true }).first()).toBeVisible();
  await expect(page).toHaveURL(/period=custom&from=2026-10-01&to=2026-10-07/);
});
