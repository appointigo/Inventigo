import { expect, test, type Browser } from "@playwright/test";
import { apiFetch, expectJson, saleItem, salePayload } from "../helpers/business";
import { E2E_IDS, e2eDb } from "../helpers/database";

test.describe.configure({ mode: "serial" });

test.afterAll(async () => {
  await e2eDb.$disconnect();
});

async function loginAs(browser: Browser, email: string) {
  const context = await browser.newContext({ storageState: undefined });
  const page = await context.newPage();
  await page.goto("/login");
  await page.getByPlaceholder("Email address").fill(email);
  await page.getByPlaceholder("Password").fill(process.env.E2E_USER_PASSWORD!);
  await page.locator("form").getByRole("button", { name: "Sign In", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard(?:\/)?$/);
  return { context, page };
}

test("organization A cannot read organization B product or store scope", async ({ page }) => {
  const product = await apiFetch(page, `/api/products/${E2E_IDS.foreignProduct}`);
  expect(product.status).toBe(404);
  const stock = await apiFetch(page, `/api/stock?storeId=${E2E_IDS.foreignStore}`);
  expect([403, 404]).toContain(stock.status);
  const analytics = await apiFetch(
    page,
    `/api/analytics/sales?storeId=${E2E_IDS.foreignStore}`,
  );
  expect([403, 404]).toContain(analytics.status);
});

test("foreign tenant sees only its own deterministic catalog", async ({ browser }) => {
  const { context, page } = await loginAs(browser, "e2e.foreign.owner@stockiva.invalid");
  const response = await apiFetch(page, "/api/products?pageSize=100");
  const body = await expectJson<{ items: Array<{ id: string }> }>(response, 200);
  expect(body.items.map((row) => row.id)).toContain(E2E_IDS.foreignProduct);
  expect(body.items.map((row) => row.id)).not.toContain(E2E_IDS.product);
  await context.close();
});

test("staff cannot invoke purchasing or finance mutations through direct APIs", async ({ browser }) => {
  const { context, page } = await loginAs(browser, "e2e.staff@stockiva.invalid");
  const purchase = await apiFetch(page, "/api/purchase-orders", {
    method: "POST",
    data: {
      storeId: E2E_IDS.store,
      supplierId: E2E_IDS.supplier,
      items: [
        {
          productId: E2E_IDS.product,
          sizeId: E2E_IDS.size,
          quantity: 1,
          unitCost: 600,
        },
      ],
    },
  });
  expect(purchase.status).toBe(403);
  const finance = await apiFetch(page, "/api/finance/summary");
  expect(finance.status).toBe(403);
  await context.close();
});

test("staff cannot bypass Finance and Reports authorization through pages or APIs", async ({
  browser,
  page,
}, testInfo) => {
  const expenseData = {
    storeId: E2E_IDS.store,
    category: "Other",
    amount: 1,
    date: new Date().toISOString().slice(0, 10),
    note: "E2E authorization probe",
    paymentMode: "CASH",
    isRecurring: false,
  };
  const ownerExpense = await expectJson<{ id: string }>(
    await apiFetch(page, "/api/expenses", { method: "POST", data: expenseData }),
    201,
  );
  expect((await apiFetch(page, `/api/reports?type=stock&storeId=${E2E_IDS.store}`)).status).toBe(200);

  const { context: adminContext, page: adminPage } = await loginAs(
    browser,
    "e2e.org.admin@stockiva.invalid",
  );
  const adminExpense = await expectJson<{ id: string }>(
    await apiFetch(adminPage, "/api/expenses", {
      method: "POST",
      data: { ...expenseData, note: "E2E admin authorization probe" },
    }),
    201,
  );
  expect(
    (await apiFetch(adminPage, `/api/reports?type=stock&storeId=${E2E_IDS.store}`)).status,
  ).toBe(200);
  await adminContext.close();

  const { context, page: staffPage } = await loginAs(browser, "e2e.staff@stockiva.invalid");
  await expect(staffPage.getByRole("link", { name: "Finance" })).toHaveCount(0);
  await expect(staffPage.getByRole("link", { name: "Reports" })).toHaveCount(0);
  await staffPage.goto("/dashboard/expenses");
  await expect(staffPage).toHaveURL(/\/dashboard\/?$/);
  await staffPage.goto("/dashboard/reports");
  await expect(staffPage).toHaveURL(/\/dashboard\/?$/);

  const expenseGet = await apiFetch(staffPage, "/api/expenses");
  const expensePost = await apiFetch(staffPage, "/api/expenses", {
    method: "POST",
    data: { ...expenseData, note: "E2E unauthorized staff probe" },
  });
  const expensePut = await apiFetch(staffPage, `/api/expenses/${ownerExpense.id}`, {
    method: "PUT",
    data: { note: "unauthorized edit" },
  });
  const expenseDelete = await apiFetch(staffPage, `/api/expenses/${ownerExpense.id}`, {
    method: "DELETE",
  });
  const report = await apiFetch(
    staffPage,
    `/api/reports?type=stock&storeId=${E2E_IDS.store}`,
  );
  const evidence = {
    expenseGetStatus: expenseGet.status,
    expensePostStatus: expensePost.status,
    expensePutStatus: expensePut.status,
    expenseDeleteStatus: expenseDelete.status,
    reportStatus: report.status,
  };
  await testInfo.attach("staff-authorization-evidence.json", {
    body: JSON.stringify(evidence, null, 2),
    contentType: "application/json",
  });
  await context.close();
  expect(Object.values(evidence)).toEqual([403, 403, 403, 403, 403]);
  expect(await e2eDb.storeExpense.findUnique({ where: { id: ownerExpense.id } })).not.toBeNull();
  await expectJson(await apiFetch(page, `/api/expenses/${ownerExpense.id}`, { method: "DELETE" }), 204);
  await expectJson(await apiFetch(page, `/api/expenses/${adminExpense.id}`, { method: "DELETE" }), 204);
});

test("direct foreign IDs cannot be read, changed, invoiced or deleted", async ({ browser, page }) => {
  const { context, page: foreignPage } = await loginAs(
    browser,
    "e2e.foreign.owner@stockiva.invalid",
  );
  const foreignSale = await expectJson<{ id: string }>(
    await apiFetch(foreignPage, "/api/billing", {
      method: "POST",
      data: salePayload("9990000990", {
        items: [
          saleItem({
            productId: E2E_IDS.foreignProduct,
            productName: "E2E Foreign Product",
            sku: "E2E-FOREIGN-PRODUCT",
            sizeId: E2E_IDS.foreignSize,
            unitPrice: 999,
          }),
        ],
        amountPaid: 999,
      }),
    }),
    201,
  );
  const foreignCustomer = await e2eDb.customer.findFirstOrThrow({
    where: { orgId: E2E_IDS.foreignOrganization, mobile: "9990000990" },
  });
  const foreignSupplier = await expectJson<{ id: string }>(
    await apiFetch(foreignPage, "/api/suppliers", {
      method: "POST",
      data: {
        name: "E2E Foreign Attack Supplier",
        phone: "9990000991",
        email: "foreign.supplier@stockiva.invalid",
      },
    }),
    201,
  );
  const foreignExpense = await expectJson<{ id: string }>(
    await apiFetch(foreignPage, "/api/expenses", {
      method: "POST",
      data: {
        storeId: E2E_IDS.foreignStore,
        category: "Other",
        amount: 25,
        date: new Date().toISOString().slice(0, 10),
        note: "E2E foreign tenant attack target",
        paymentMode: "CASH",
        isRecurring: false,
      },
    }),
    201,
  );
  const foreignPurchase = await expectJson<{ id: string }>(
    await apiFetch(foreignPage, "/api/purchase-orders", {
      method: "POST",
      data: {
        storeId: E2E_IDS.foreignStore,
        supplierId: foreignSupplier.id,
        items: [
          {
            productId: E2E_IDS.foreignProduct,
            sizeId: E2E_IDS.foreignSize,
            quantity: 1,
            unitCost: 500,
          },
        ],
      },
    }),
    201,
  );
  await context.close();
  await page.goto("/dashboard");

  const probes = await Promise.all([
    apiFetch(page, `/api/customers/${foreignCustomer.id}`),
    apiFetch(page, `/api/customers/${foreignCustomer.id}`, {
      method: "PATCH",
      data: { name: "Cross tenant mutation" },
    }),
    apiFetch(page, `/api/billing/${foreignSale.id}`),
    apiFetch(page, `/api/customers/${foreignCustomer.id}/invoices/${foreignSale.id}`),
    apiFetch(page, `/api/customers/${foreignCustomer.id}/invoices/${foreignSale.id}/pdf`),
    apiFetch(page, `/api/suppliers/${foreignSupplier.id}`),
    apiFetch(page, `/api/suppliers/${foreignSupplier.id}`, {
      method: "PUT",
      data: { name: "Cross tenant mutation" },
    }),
    apiFetch(page, `/api/purchase-orders/${foreignPurchase.id}`),
    apiFetch(page, `/api/purchase-orders/${foreignPurchase.id}`, {
      method: "PUT",
      data: { notes: "Cross tenant mutation" },
    }),
    apiFetch(page, `/api/expenses/${foreignExpense.id}`),
    apiFetch(page, `/api/expenses/${foreignExpense.id}`, {
      method: "PUT",
      data: { note: "Cross tenant mutation" },
    }),
  ]);
  expect(probes.map((response) => response.status)).toEqual(Array(11).fill(404));

  const destructiveProbes = await Promise.all([
    apiFetch(page, `/api/suppliers/${foreignSupplier.id}`, { method: "DELETE" }),
    apiFetch(page, `/api/purchase-orders/${foreignPurchase.id}`, { method: "DELETE" }),
    apiFetch(page, `/api/expenses/${foreignExpense.id}`, { method: "DELETE" }),
  ]);
  expect(destructiveProbes.map((response) => response.status)).toEqual([404, 404, 404]);
  expect(await e2eDb.supplier.count({ where: { id: foreignSupplier.id } })).toBe(1);
  expect(await e2eDb.purchaseOrder.count({ where: { id: foreignPurchase.id } })).toBe(1);
  expect(await e2eDb.storeExpense.count({ where: { id: foreignExpense.id } })).toBe(1);
});
