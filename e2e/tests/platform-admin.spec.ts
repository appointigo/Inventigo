import { expect, test } from "@playwright/test";
import { apiFetch, expectJson } from "../helpers/business";
import { E2E_IDS, e2eDb } from "../helpers/database";

test.describe.configure({ mode: "serial" });

async function login(page: import("@playwright/test").Page, email: string) {
  await page.goto("/login");
  await page.getByPlaceholder("Email address").fill(email);
  await page.getByPlaceholder("Password").fill(process.env.E2E_USER_PASSWORD!);
  await page.locator("form").getByRole("button", { name: "Sign In", exact: true }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

test("tenant OWNER is rejected from every sampled platform-admin read and mutation", async ({ page }) => {
  for (const path of [
    "/api/admin/stats",
    "/api/admin/organizations",
    "/api/admin/users",
    "/api/admin/feature-flags",
    "/api/admin/audit-log",
    "/api/admin/analytics",
  ]) {
    await expectJson(await apiFetch(page, path), 403);
  }
  await expectJson(
    await apiFetch(page, "/api/admin/feature-flags", {
      method: "POST",
      data: { key: "E2E_OWNER_MUST_NOT_CREATE", value: true },
    }),
    403,
  );
  expect(await e2eDb.featureFlag.count({ where: { key: "E2E_OWNER_MUST_NOT_CREATE" } })).toBe(0);
});

test("SUPER_ADMIN reads global scope and audited feature/user mutations persist exactly", async ({ browser }) => {
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await context.newPage();
  await login(page, "e2e.super.admin@stockiva.invalid");

  const orgs = await expectJson<Array<{ id: string }>>(
    await apiFetch(page, "/api/admin/organizations"),
    200,
  );
  expect(new Set(orgs.map((row) => row.id))).toEqual(
    new Set([E2E_IDS.organization, E2E_IDS.foreignOrganization]),
  );
  await expectJson(await apiFetch(page, `/api/admin/organizations/${E2E_IDS.organization}`), 200);
  await expectJson(await apiFetch(page, "/api/admin/users"), 200);
  await expectJson(await apiFetch(page, "/api/admin/stats"), 200);
  await expectJson(await apiFetch(page, "/api/admin/analytics"), 200);

  const key = "E2E_NON_WHATSAPP_FLAG";
  const flag = await expectJson<{ id: string; key: string; value: boolean }>(
    await apiFetch(page, "/api/admin/feature-flags", {
      method: "POST",
      data: { key, value: false, scope: "GLOBAL", description: "E2E disposable flag" },
    }),
    201,
  );
  try {
    await expectJson(
      await apiFetch(page, `/api/admin/feature-flags/${flag.id}`, {
        method: "PATCH",
        data: { value: true },
      }),
      200,
    );
    expect((await e2eDb.featureFlag.findUniqueOrThrow({ where: { id: flag.id } })).value).toBe(true);
    expect(
      await e2eDb.adminAuditLog.count({
        where: { targetId: flag.id, performedBy: E2E_IDS.superAdminUser },
      }),
    ).toBe(2);

    await expectJson(
      await apiFetch(page, `/api/admin/users/${E2E_IDS.staffUser}`, {
        method: "PATCH",
        data: { isActive: false },
      }),
      200,
    );
    expect((await e2eDb.user.findUniqueOrThrow({ where: { id: E2E_IDS.staffUser } })).isActive).toBe(false);
    await expectJson(
      await apiFetch(page, `/api/admin/users/${E2E_IDS.staffUser}`, {
        method: "PATCH",
        data: { isActive: true },
      }),
      200,
    );
  } finally {
    await e2eDb.user.update({ where: { id: E2E_IDS.staffUser }, data: { isActive: true } });
    await e2eDb.adminAuditLog.deleteMany({ where: { targetId: flag.id } });
    await e2eDb.featureFlag.deleteMany({ where: { id: flag.id } });
    await context.close();
  }
});

test("known defect: deactivating a user invalidates its already-issued session", async ({ browser }, testInfo) => {
  test.fail(true, "P0-005: JWT authorization does not re-check the active-user state");
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await context.newPage();
  await login(page, "e2e.staff@stockiva.invalid");
  await e2eDb.user.update({ where: { id: E2E_IDS.staffUser }, data: { isActive: false } });
  try {
    const response = await apiFetch(page, "/api/products");
    await testInfo.attach("inactive-session-evidence.json", {
      body: Buffer.from(JSON.stringify({
        user: await e2eDb.user.findUnique({ where: { id: E2E_IDS.staffUser }, select: { id: true, role: true, isActive: true } }),
        apiStatus: response.status,
        apiBody: response.body,
      }, null, 2)),
      contentType: "application/json",
    });
    await expectJson(response, 401);
  } finally {
    await e2eDb.user.update({ where: { id: E2E_IDS.staffUser }, data: { isActive: true } });
    await context.close();
  }
});
