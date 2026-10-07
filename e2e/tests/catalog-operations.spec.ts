import { expect, test } from "@playwright/test";
import { apiFetch, expectJson } from "../helpers/business";
import { E2E_IDS, e2eDb } from "../helpers/database";

test.afterAll(async () => {
  await e2eDb.$disconnect();
});

test("barcode lookup resolves the exact tenant product and validates bad scans", async ({ page }) => {
  const result = await expectJson<{
    product: { id: string; externalBarcode: string };
    stockLevels: Array<{ quantity: number }>;
  }>(await apiFetch(page, "/api/barcode/lookup?sku=8900000000207"), 200);
  expect(result.product).toMatchObject({
    id: E2E_IDS.product,
    externalBarcode: "8900000000207",
  });
  expect(result.stockLevels.length).toBeGreaterThan(0);
  await expectJson(await apiFetch(page, "/api/barcode/lookup"), 400);
  await expectJson(await apiFetch(page, "/api/barcode/lookup?sku=E2E-NOT-FOUND"), 404);
});

test("catalog, store, supplier and team reads stay inside the organization", async ({ page }) => {
  await page.goto("/dashboard");
  const [categories, brands, suppliers, stores, team] = await Promise.all([
    apiFetch(page, "/api/categories"),
    apiFetch(page, "/api/brands"),
    apiFetch(page, "/api/suppliers"),
    apiFetch(page, "/api/stores"),
    apiFetch(page, "/api/team"),
  ]);
  for (const response of [categories, brands, suppliers, stores, team]) {
    expect(response.status, JSON.stringify(response.body)).toBe(200);
    expect(JSON.stringify(response.body)).not.toContain(E2E_IDS.foreignOrganization);
    expect(JSON.stringify(response.body)).not.toContain(E2E_IDS.foreignStore);
    expect(JSON.stringify(response.body)).not.toContain(E2E_IDS.foreignUser);
  }
  expect(JSON.stringify(stores.body)).toContain(E2E_IDS.store);
  expect(JSON.stringify(stores.body)).toContain(E2E_IDS.secondStore);
  expect(JSON.stringify(team.body)).toContain(E2E_IDS.user);
  expect(JSON.stringify(team.body)).toContain(E2E_IDS.staffUser);
  expect(JSON.stringify(suppliers.body)).toContain(E2E_IDS.supplier);
});

test("low-stock alerts are scoped and invalid alert thresholds are rejected", async ({ page }) => {
  const expectedStock = await e2eDb.stockEntry.findUniqueOrThrow({
    where: {
      productId_sizeId_storeId: {
        productId: E2E_IDS.lastUnitProduct,
        sizeId: E2E_IDS.size,
        storeId: E2E_IDS.store,
      },
    },
  });
  await expectJson(
    await apiFetch(page, "/api/alerts", {
      method: "POST",
      data: {
        productId: E2E_IDS.lastUnitProduct,
        threshold: 2,
        notifyEmail: false,
        notifySMS: false,
        isActive: true,
      },
    }),
    201,
  );
  const lowStock = await expectJson<Array<{ productId: string; quantity: number }>>(
    await apiFetch(page, `/api/alerts/low-stock?storeId=${E2E_IDS.store}`),
    200,
  );
  expect(lowStock).toContainEqual(
    expect.objectContaining({
      productId: E2E_IDS.lastUnitProduct,
      quantity: expectedStock.quantity,
    }),
  );
  expect(lowStock).toHaveLength(1);

  await expectJson(
    await apiFetch(page, "/api/alerts", { method: "POST", data: { threshold: -1 } }),
    400,
  );
});

test("primary non-WhatsApp operational pages render for an authenticated user", async ({ page }) => {
  for (const path of [
    "/dashboard/products",
    "/dashboard/stock",
    "/dashboard/purchase-orders",
    "/dashboard/suppliers",
    "/dashboard/expenses",
    "/dashboard/reports",
    "/dashboard/customers",
    "/dashboard/attendance-leave",
    "/dashboard/inventory-intelligence",
    "/dashboard/settings",
  ]) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBeLessThan(400);
    await expect(page.locator("body"), path).not.toContainText("Application error");
  }
});
