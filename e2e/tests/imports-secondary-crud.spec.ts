import { expect, test } from "@playwright/test";
import { apiFetch, expectJson } from "../helpers/business";
import { salePayload } from "../helpers/business";
import { E2E_IDS, e2eDb } from "../helpers/database";

test.describe.configure({ mode: "serial" });

test.afterAll(async () => {
  await e2eDb.$disconnect();
});

test("category and brand bulk imports are atomic for valid, duplicate and malformed batches", async ({ page }) => {
  const categoryNames = ["E2E Bulk Footwear", "E2E Bulk Accessories"];
  const brandNames = ["E2E Bulk Alpha", "E2E Bulk Beta"];
  try {
    await expectJson(
      await apiFetch(page, "/api/categories/bulk", {
        method: "POST",
        data: {
          rows: categoryNames.map((name) => ({
            name,
            description: "Disposable E2E import",
            sizes: ["One Size"],
            attributeSchema: { fields: [] },
          })),
        },
      }),
      201,
    );
    await expectJson(
      await apiFetch(page, "/api/brands/bulk", {
        method: "POST",
        data: { rows: brandNames.map((name) => ({ name, logoUrl: null, isActive: true })) },
      }),
      201,
    );
    expect(await e2eDb.category.count({ where: { orgId: E2E_IDS.organization, name: { in: categoryNames } } })).toBe(2);
    expect(await e2eDb.brand.count({ where: { orgId: E2E_IDS.organization, name: { in: brandNames } } })).toBe(2);

    const before = await e2eDb.category.count({ where: { orgId: E2E_IDS.organization } });
    await expectJson(
      await apiFetch(page, "/api/categories/bulk", {
        method: "POST",
        data: {
          rows: [
            { name: "E2E Atomic New", description: null, sizes: [], attributeSchema: { fields: [] } },
            { name: categoryNames[0], description: null, sizes: [], attributeSchema: { fields: [] } },
          ],
        },
      }),
      422,
    );
    expect(await e2eDb.category.count({ where: { orgId: E2E_IDS.organization } })).toBe(before);
    expect(await e2eDb.category.count({ where: { name: "E2E Atomic New" } })).toBe(0);

    await expectJson(await apiFetch(page, "/api/categories/bulk", { method: "POST", data: { rows: [] } }), 400);
    await expectJson(
      await apiFetch(page, "/api/brands/bulk", {
        method: "POST",
        data: { rows: [{ name: "   ", logoUrl: null, isActive: true }] },
      }),
      400,
    );
  } finally {
    const categories = await e2eDb.category.findMany({ where: { name: { in: [...categoryNames, "E2E Atomic New"] } }, select: { id: true } });
    await e2eDb.size.deleteMany({ where: { categoryId: { in: categories.map((row) => row.id) } } });
    await e2eDb.category.deleteMany({ where: { id: { in: categories.map((row) => row.id) } } });
    await e2eDb.brand.deleteMany({ where: { name: { in: brandNames } } });
  }
});

test("product bulk import validates numbers, duplicates and store tenancy without partial stock", async ({ page }) => {
  const sku = "E2E-BULK-PRODUCT";
  const row = {
    brandName: "E2E Brand",
    categoryName: "E2E Apparel",
    sku,
    name: "E2E Bulk Product",
    basePrice: 321,
    costPrice: 123,
    sizesAndQuantities: { M: 4 },
    externalBarcode: "8900000099998",
    imageUrl: null,
    attributes: {},
  };
  try {
    await expectJson(
      await apiFetch(page, "/api/products/bulk", {
        method: "POST",
        data: { storeId: E2E_IDS.store, rows: [row] },
      }),
      201,
    );
    const product = await e2eDb.product.findFirstOrThrow({ where: { orgId: E2E_IDS.organization, sku } });
    const stock = await e2eDb.stockEntry.findFirstOrThrow({ where: { productId: product.id, storeId: E2E_IDS.store } });
    expect(stock.quantity).toBe(4);

    await expectJson(
      await apiFetch(page, "/api/products/bulk", {
        method: "POST",
        data: { storeId: E2E_IDS.store, rows: [row] },
      }),
      422,
    );
    expect(await e2eDb.product.count({ where: { orgId: E2E_IDS.organization, sku } })).toBe(1);
    expect(await e2eDb.stockEntry.count({ where: { productId: product.id } })).toBe(1);

    await expectJson(
      await apiFetch(page, "/api/products/bulk", {
        method: "POST",
        data: { storeId: E2E_IDS.store, rows: [{ ...row, sku: "E2E-INVALID-NUMBER", basePrice: -1 }] },
      }),
      400,
    );
    await expectJson(
      await apiFetch(page, "/api/products/bulk", {
        method: "POST",
        data: { storeId: E2E_IDS.foreignStore, rows: [{ ...row, sku: "E2E-FOREIGN-STORE" }] },
      }),
      403,
    );
    expect(await e2eDb.product.count({ where: { sku: { in: ["E2E-INVALID-NUMBER", "E2E-FOREIGN-STORE"] } } })).toBe(0);
  } finally {
    const products = await e2eDb.product.findMany({ where: { sku: { in: [sku, "E2E-INVALID-NUMBER", "E2E-FOREIGN-STORE"] } }, select: { id: true } });
    const ids = products.map((row) => row.id);
    await e2eDb.stockMovement.deleteMany({ where: { productId: { in: ids } } });
    await e2eDb.stockEntry.deleteMany({ where: { productId: { in: ids } } });
    await e2eDb.product.deleteMany({ where: { id: { in: ids } } });
  }
});

test("secondary category/brand CRUD is scoped and referenced masters cannot be deleted", async ({ page }) => {
  const category = await expectJson<{ id: string }>(
    await apiFetch(page, "/api/categories", {
      method: "POST",
      data: { name: "E2E CRUD Category", slug: "e2e-crud-category", sizes: ["OS"], attributeSchema: { fields: [] } },
    }),
    201,
  );
  const brand = await expectJson<{ id: string }>(
    await apiFetch(page, "/api/brands", {
      method: "POST",
      data: { name: "E2E CRUD Brand", isActive: true },
    }),
    201,
  );
  await expectJson(await apiFetch(page, `/api/categories/${category.id}`, { method: "PUT", data: { name: "E2E CRUD Category Updated" } }), 200);
  await expectJson(await apiFetch(page, `/api/brands/${brand.id}`, { method: "PUT", data: { name: "E2E CRUD Brand Updated", isActive: false } }), 200);
  await expectJson(await apiFetch(page, `/api/categories/${category.id}`, { method: "DELETE" }), 200);
  await expectJson(await apiFetch(page, `/api/brands/${brand.id}`, { method: "DELETE" }), 200);
  expect(await e2eDb.category.findUnique({ where: { id: category.id } })).toBeNull();
  expect(await e2eDb.brand.findUnique({ where: { id: brand.id } })).toBeNull();

  await expectJson(await apiFetch(page, `/api/categories/${E2E_IDS.foreignCategory}`, { method: "DELETE" }), 404);
  await expectJson(await apiFetch(page, `/api/brands/${E2E_IDS.foreignBrand}`, { method: "DELETE" }), 404);
  await expectJson(await apiFetch(page, "/api/categories/00000000-0000-4000-8000-000000000000"), 404);
  await expectJson(await apiFetch(page, `/api/categories/${E2E_IDS.organization}`, { method: "DELETE" }), 404);

  await expectJson(await apiFetch(page, `/api/categories/00000000-0000-4000-8000-00000000e204`, { method: "DELETE" }), 409);
  await expectJson(await apiFetch(page, `/api/brands/00000000-0000-4000-8000-00000000e205`, { method: "DELETE" }), 409);
});

test("inactive products remain historical masters but are excluded from new commerce", async ({ page }) => {
  await expectJson(
    await apiFetch(page, `/api/products/${E2E_IDS.secondProduct}`, {
      method: "PUT",
      data: { isActive: false },
    }),
    200,
  );
  try {
    expect((await e2eDb.product.findUniqueOrThrow({ where: { id: E2E_IDS.secondProduct } })).isActive).toBe(false);
    const inactive = await expectJson<{ items: Array<{ id: string }> }>(
      await apiFetch(page, `/api/products?storeId=${E2E_IDS.store}&isActive=false&pageSize=100`),
      200,
    );
    expect(inactive.items.map((row) => row.id)).toContain(E2E_IDS.secondProduct);
    await expectJson(
      await apiFetch(page, "/api/billing", {
        method: "POST",
        data: salePayload("9990000899", {
          items: [{
            productId: E2E_IDS.secondProduct,
            productName: "E2E Runner Tee",
            sku: "E2E-P1-TEE",
            sizeId: E2E_IDS.size,
            sizeLabel: "M",
            attributes: {},
            quantity: 1,
            unitPrice: 500,
          }],
          amountPaid: 500,
        }),
      }),
      400,
    );
    expect(await e2eDb.sale.count({ where: { customerPhone: "9990000899" } })).toBe(0);
  } finally {
    await e2eDb.product.update({ where: { id: E2E_IDS.secondProduct }, data: { isActive: true } });
  }
});

test("malformed JSON receives controlled 4xx responses instead of server errors", async ({ page }) => {
  await page.goto("/dashboard");
  for (const path of ["/api/categories/bulk", "/api/brands/bulk", "/api/products/bulk"]) {
    const status = await page.evaluate(async (requestPath) => {
      const response = await fetch(requestPath, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{not-json",
      });
      return response.status;
    }, path);
    expect(status).toBe(400);
  }
});
