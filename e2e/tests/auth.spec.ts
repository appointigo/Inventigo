import { expect, test } from "@playwright/test";

async function submitLogin(page: import("@playwright/test").Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByPlaceholder("Email address").fill(email);
  await page.getByPlaceholder("Password").fill(password);
  await page.locator("form").getByRole("button", { name: "Sign In", exact: true }).click();
}

test("invalid credentials are rejected without creating a session", async ({ browser }) => {
  const context = await browser.newContext({ storageState: undefined });
  const page = await context.newPage();
  await page.goto("/login");
  await page.getByPlaceholder("Email address").fill("invalid.user@stockiva.invalid");
  await page.getByPlaceholder("Password").fill("definitely-wrong-password");
  await page
    .locator("form")
    .getByRole("button", { name: "Sign In", exact: true })
    .click();
  await expect(page.getByText("Invalid email or password")).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
  await context.close();
});

test("a known user with the wrong password is rejected", async ({ browser }) => {
  const context = await browser.newContext({ storageState: undefined });
  const page = await context.newPage();
  await submitLogin(page, process.env.E2E_USER_EMAIL!, "wrong-password-for-known-user");
  await expect(page.getByText("Invalid email or password")).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
  await context.close();
});

test("an unauthenticated user is redirected away from a protected page", async ({ browser }) => {
  const context = await browser.newContext({ storageState: undefined });
  const page = await context.newPage();
  await page.goto("/dashboard/billing");
  await expect(page).toHaveURL(/\/login/);
  await context.close();
});

test("unauthenticated critical APIs reject access", async ({ playwright }) => {
  const request = await playwright.request.newContext({ baseURL: process.env.E2E_BASE_URL });
  for (const path of [
    "/api/billing",
    "/api/products",
    "/api/stock",
    "/api/expenses",
    "/api/finance/ledger",
  ]) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(401);
  }
  await request.dispose();
});

test("authenticated navigation and session survive reload", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByRole("button", { name: /Sales$/, exact: false })).toBeVisible();
  await page.getByRole("button", { name: /Inventory$/, exact: false }).click();
  await expect(page).toHaveURL(/\/dashboard\/products/);
  await page.reload();
  await expect(page).toHaveURL(/\/dashboard\/products/);
  await expect(page.getByText("E2E Owner")).toBeVisible();
});

test("logout removes the session and protects subsequent navigation", async ({ browser }) => {
  const context = await browser.newContext({ storageState: "e2e/.auth/user.json" });
  const page = await context.newPage();
  await page.goto("/dashboard");
  await page.getByRole("button", { name: /E2E Owner/ }).click();
  await page.getByText("Sign out", { exact: true }).click();
  await expect
    .poll(async () =>
      (await context.cookies()).some((cookie) => cookie.name.endsWith("session-token")),
    )
    .toBe(false);
  await page.goto("/dashboard/billing");
  await expect(page).toHaveURL(/\/login/);
  await context.close();
});
