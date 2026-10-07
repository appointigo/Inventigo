import { expect, test } from "@playwright/test";
import { apiFetch, expectJson, expectMoney } from "../helpers/business";
import { E2E_IDS, e2eDb } from "../helpers/database";

test.describe.configure({ mode: "serial" });

test.afterAll(async () => {
  await e2eDb.$disconnect();
});

test("product create, opening stock, edit and search remain linked", async ({ page }) => {
  const sku = "E2E-CREATED-PRODUCT";
  const create = await apiFetch(page, "/api/products", {
    method: "POST",
    data: {
      name: "E Two E Created Product",
      sku,
      externalBarcode: "8900000000991",
      categoryId: "00000000-0000-4000-8000-00000000e204",
      brandId: "00000000-0000-4000-8000-00000000e205",
      mrp: 1299,
      basePrice: 1199,
      costPrice: 700,
      attributes: { material: "cotton" },
      isActive: true,
      storeId: E2E_IDS.store,
      sizes: [{ sizeId: E2E_IDS.size, quantity: 7, reorderLevel: 2 }],
    },
  });
  const product = await expectJson<{ id: string }>(create, 201);
  const [persisted, stock, openingMovements] = await Promise.all([
    e2eDb.product.findUniqueOrThrow({ where: { id: product.id } }),
    e2eDb.stockEntry.findUniqueOrThrow({
      where: {
        productId_sizeId_storeId: {
          productId: product.id,
          sizeId: E2E_IDS.size,
          storeId: E2E_IDS.store,
        },
      },
    }),
    e2eDb.stockMovement.findMany({ where: { productId: product.id } }),
  ]);
  expect(persisted.sku).toBe(sku);
  expectMoney(persisted.basePrice, 1199);
  expect(stock.quantity).toBe(7);
  expect(openingMovements).toHaveLength(1);
  expect(openingMovements[0].deltaQuantity).toBe(7);

  const update = await apiFetch(page, `/api/products/${product.id}`, {
    method: "PUT",
    data: { name: "E Two E Updated Product", basePrice: 1249 },
  });
  await expectJson(update, 200);
  const search = await apiFetch(page, "/api/products?search=Updated%20Product&page=1&pageSize=10");
  const results = await expectJson<{ items: Array<{ id: string; name: string }> }>(search, 200);
  expect(results.items).toContainEqual(
    expect.objectContaining({ id: product.id, name: "E Two E Updated Product" }),
  );
});

test("manual stock in/out records signed audit snapshots and blocks negative stock", async ({
  page,
}) => {
  const before = await e2eDb.stockEntry.findUniqueOrThrow({
    where: {
      productId_sizeId_storeId: {
        productId: E2E_IDS.secondProduct,
        sizeId: E2E_IDS.size,
        storeId: E2E_IDS.store,
      },
    },
  });
  const referenceId = "e2e-manual-adjustment";
  const stockIn = await apiFetch(page, "/api/stock", {
    method: "POST",
    data: {
      storeId: E2E_IDS.store,
      productId: E2E_IDS.secondProduct,
      sizeId: E2E_IDS.size,
      quantity: 5,
      type: "IN",
      reason: "E2E stock in",
      referenceType: "MANUAL",
      referenceId,
    },
  });
  await expectJson(stockIn, 200);
  const stockOut = await apiFetch(page, "/api/stock", {
    method: "POST",
    data: {
      storeId: E2E_IDS.store,
      productId: E2E_IDS.secondProduct,
      sizeId: E2E_IDS.size,
      quantity: 3,
      type: "OUT",
      reason: "E2E stock out",
      referenceType: "MANUAL",
      referenceId,
    },
  });
  await expectJson(stockOut, 200);
  const after = await e2eDb.stockEntry.findUniqueOrThrow({ where: { id: before.id } });
  const movements = await e2eDb.stockMovement.findMany({
    where: { referenceId },
    orderBy: { createdAt: "asc" },
  });
  expect(after.quantity).toBe(before.quantity + 2);
  expect(movements.map((row) => row.deltaQuantity)).toEqual([5, -3]);
  expect(movements[0].quantityBefore).toBe(before.quantity);
  expect(movements[1].quantityAfter).toBe(after.quantity);

  const rejected = await apiFetch(page, "/api/stock", {
    method: "POST",
    data: {
      storeId: E2E_IDS.store,
      productId: E2E_IDS.secondProduct,
      sizeId: E2E_IDS.size,
      quantity: after.quantity + 1,
      type: "OUT",
      reason: "Must fail",
    },
  });
  await expectJson(rejected, 422);
  expect((await e2eDb.stockEntry.findUniqueOrThrow({ where: { id: before.id } })).quantity).toBe(
    after.quantity,
  );
});

test("stock search and low/out-of-stock filters return complete scoped results", async ({ page }) => {
  const search = await apiFetch(page, "/api/stock?search=E2E-P1-TEE");
  const searched = await expectJson<Array<{ productId: string }>>(search, 200);
  expect(searched.map((row) => row.productId)).toContain(E2E_IDS.secondProduct);
  expect(searched.map((row) => row.productId)).not.toContain(E2E_IDS.foreignProduct);

  const out = await apiFetch(page, "/api/stock?outOfStockOnly=true");
  const outRows = await expectJson<Array<{ quantity: number }>>(out, 200);
  expect(outRows.every((row) => row.quantity === 0)).toBe(true);

  const low = await apiFetch(page, "/api/stock?lowStockOnly=true");
  const lowRows = await expectJson<Array<{ quantity: number; reorderLevel: number }>>(low, 200);
  expect(lowRows.every((row) => row.quantity <= row.reorderLevel)).toBe(true);
});
