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

test("deactivating a user invalidates its already-issued session", async ({ browser }, testInfo) => {
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await context.newPage();
  await login(page, process.env.E2E_USER_EMAIL!);
  await expectJson(await apiFetch(page, "/api/products"), 200);
  await e2eDb.user.update({ where: { id: E2E_IDS.user }, data: { isActive: false } });
  try {
    const [response, financialMutation, inventoryMutation] = await Promise.all([
      apiFetch(page, "/api/products"),
      apiFetch(page, "/api/expenses", {
        method: "POST",
        data: {
          storeId: E2E_IDS.store,
          category: "Other",
          amount: 1,
          date: "2026-10-07",
          note: "E2E inactive session must not persist",
        },
      }),
      apiFetch(page, "/api/stock", {
        method: "POST",
        data: {
          storeId: E2E_IDS.store,
          productId: E2E_IDS.product,
          sizeId: E2E_IDS.size,
          quantity: 1,
          type: "IN",
          reason: "E2E inactive session must not persist",
        },
      }),
    ]);
    await testInfo.attach("inactive-session-evidence.json", {
      body: Buffer.from(JSON.stringify({
        user: await e2eDb.user.findUnique({ where: { id: E2E_IDS.user }, select: { id: true, role: true, isActive: true } }),
        apiStatus: response.status,
        apiBody: response.body,
        financialMutationStatus: financialMutation.status,
        inventoryMutationStatus: inventoryMutation.status,
      }, null, 2)),
      contentType: "application/json",
    });
    await expectJson(response, 401);
    await expectJson(financialMutation, 401);
    await expectJson(inventoryMutation, 401);
    expect(await e2eDb.storeExpense.count({ where: { note: "E2E inactive session must not persist" } })).toBe(0);
    expect(await e2eDb.stockMovement.count({ where: { reason: "E2E inactive session must not persist" } })).toBe(0);
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  } finally {
    await e2eDb.user.update({ where: { id: E2E_IDS.user }, data: { isActive: true } });
    await context.close();
  }
});

test("an existing session uses current role, store and organization claims", async ({ browser }) => {
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await context.newPage();
  await login(page, "e2e.staff@stockiva.invalid");
  const original = await e2eDb.user.findUniqueOrThrow({ where: { id: E2E_IDS.staffUser } });
  await e2eDb.user.update({
    where: { id: E2E_IDS.staffUser },
    data: {
      role: "ADMIN",
      storeId: E2E_IDS.foreignStore,
      orgId: E2E_IDS.foreignOrganization,
    },
  });
  try {
    const session = await expectJson<{
      user: { role: string; storeId: string | null; orgId: string | null };
    }>(await apiFetch(page, "/api/auth/session"), 200);
    expect(session.user).toMatchObject({
      role: "ADMIN",
      storeId: E2E_IDS.foreignStore,
      orgId: E2E_IDS.foreignOrganization,
    });
  } finally {
    await e2eDb.user.update({
      where: { id: E2E_IDS.staffUser },
      data: { role: original.role, storeId: original.storeId, orgId: original.orgId },
    });
    await context.close();
  }
});
