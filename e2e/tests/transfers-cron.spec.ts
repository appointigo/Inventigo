import { expect, test } from "@playwright/test";
import { apiFetch, expectJson } from "../helpers/business";
import { E2E_IDS, e2eDb } from "../helpers/database";

test.describe.configure({ mode: "serial" });

test.afterAll(async () => {
  await e2eDb.$disconnect();
});

test("store-scoped owner cannot create an organization-wide transfer", async ({ page }) => {
  const rejected = await apiFetch(page, "/api/stock-transfers", {
    method: "POST",
    data: {
      sourceStoreId: E2E_IDS.store,
      destinationStoreId: E2E_IDS.secondStore,
      items: [{ productId: E2E_IDS.product, sizeId: E2E_IDS.size, quantity: 2 }],
    },
  });
  await expectJson(rejected, 403);
});

test("approved transfer dispatch and receipt reconcile both stores with organization net zero", async ({
  page,
}) => {
  await page.context().clearCookies();
  await page.goto("/login");
  await page.getByPlaceholder("Email address").fill("e2e.org.admin@stockiva.invalid");
  await page.getByPlaceholder("Password").fill(process.env.E2E_USER_PASSWORD!);
  await page.locator("form").getByRole("button", { name: "Sign In", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard(?:\/)?$/);

  const before = await e2eDb.stockEntry.findMany({
    where: {
      productId: E2E_IDS.product,
      sizeId: E2E_IDS.size,
      storeId: { in: [E2E_IDS.store, E2E_IDS.secondStore] },
    },
  });
  const beforeByStore = new Map(before.map((row) => [row.storeId, row.quantity]));

  const create = await apiFetch(page, "/api/stock-transfers", {
    method: "POST",
    data: {
      sourceStoreId: E2E_IDS.store,
      destinationStoreId: E2E_IDS.secondStore,
      notes: "E2E transfer lifecycle",
      items: [{ productId: E2E_IDS.product, sizeId: E2E_IDS.size, quantity: 2 }],
    },
  });
  const transfer = await expectJson<{ id: string; status: string; items: Array<{ id: string }> }>(
    create,
    201,
  );
  expect(transfer.status).toBe("DRAFT");

  const approved = await expectJson<{ status: string }>(
    await apiFetch(page, `/api/stock-transfers/${transfer.id}/approve`, { method: "POST" }),
    200,
  );
  expect(approved.status).toBe("APPROVED");

  const dispatched = await expectJson<{ status: string }>(
    await apiFetch(page, `/api/stock-transfers/${transfer.id}/dispatch`, { method: "POST" }),
    200,
  );
  expect(dispatched.status).toBe("DISPATCHED");

  const received = await expectJson<{ status: string }>(
    await apiFetch(page, `/api/stock-transfers/${transfer.id}/receive`, {
      method: "POST",
      data: {
        items: [{ itemId: transfer.items[0].id, receivedQuantity: 2, damagedQuantity: 0 }],
      },
    }),
    200,
  );
  expect(received.status).toBe("RECEIVED");

  const after = await e2eDb.stockEntry.findMany({
    where: {
      productId: E2E_IDS.product,
      sizeId: E2E_IDS.size,
      storeId: { in: [E2E_IDS.store, E2E_IDS.secondStore] },
    },
  });
  const afterByStore = new Map(after.map((row) => [row.storeId, row.quantity]));
  expect(afterByStore.get(E2E_IDS.store)).toBe(beforeByStore.get(E2E_IDS.store)! - 2);
  expect(afterByStore.get(E2E_IDS.secondStore)).toBe(beforeByStore.get(E2E_IDS.secondStore)! + 2);
  expect(
    [...afterByStore.values()].reduce((sum, quantity) => sum + quantity, 0),
  ).toBe([...beforeByStore.values()].reduce((sum, quantity) => sum + quantity, 0));

  const movements = await e2eDb.stockMovement.findMany({
    where: { referenceType: "TRANSFER", referenceId: transfer.id },
    orderBy: { createdAt: "asc" },
  });
  expect(movements.map((row) => row.deltaQuantity).sort((a, b) => a - b)).toEqual([-2, 2]);
  await expectJson(
    await apiFetch(page, `/api/stock-transfers/${transfer.id}/receive`, {
      method: "POST",
      data: { items: [] },
    }),
    409,
  );
});

test("reorder cron rejects missing/wrong secrets and safely evaluates stock when authorized", async ({
  page,
}) => {
  await expectJson(await apiFetch(page, "/api/cron/reorder-check"), 401);
  await expectJson(
    await apiFetch(page, "/api/cron/reorder-check", {
      headers: { authorization: "Bearer wrong-e2e-secret" },
    }),
    401,
  );

  const config = await e2eDb.alertConfig.create({
    data: {
      orgId: E2E_IDS.organization,
      productId: E2E_IDS.lastUnitProduct,
      threshold: 2,
      notifyEmail: false,
      notifySMS: false,
      isActive: true,
    },
  });
  try {
    const body = await expectJson<{
      message: string;
      orgsChecked: number;
      totalLowStockCount: number;
    }>(
      await apiFetch(page, "/api/cron/reorder-check", {
        headers: { authorization: "Bearer stockiva-e2e-reorder-secret" },
      }),
      200,
    );
    expect(body.message).toBe("Reorder check completed");
    expect(body.orgsChecked).toBe(2);
    expect(body.totalLowStockCount).toBeGreaterThanOrEqual(1);
    expect(await e2eDb.alertConfig.findUnique({ where: { id: config.id } })).not.toBeNull();
  } finally {
    await e2eDb.alertConfig.delete({ where: { id: config.id } });
  }
});
