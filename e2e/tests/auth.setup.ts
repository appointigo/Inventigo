import { expect, test as setup } from "@playwright/test";
import fs from "node:fs/promises";

const authFile = "e2e/.auth/user.json";

setup("authenticate the E2E owner through the real login UI", async ({ page }) => {
  await fs.mkdir("e2e/.auth", { recursive: true });
  await page.goto("/login");
  await page.getByPlaceholder("Email address").fill(process.env.E2E_USER_EMAIL!);
  await page.getByPlaceholder("Password").fill(process.env.E2E_USER_PASSWORD!);
  await page
    .locator("form")
    .getByRole("button", { name: "Sign In", exact: true })
    .click();
  await expect(page).toHaveURL(/\/dashboard(?:\/)?$/);
  await page.context().storageState({ path: authFile });
});
