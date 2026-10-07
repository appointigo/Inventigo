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

test("known defect: staff cannot bypass hidden Finance and Reports navigation via APIs", async ({
  browser,
}, testInfo) => {
  test.fail(true, "P0-003: STAFF authorization is enforced in navigation but not these APIs");
  const { context, page } = await loginAs(browser, "e2e.staff@stockiva.invalid");
  await expect(page.getByRole("link", { name: "Finance" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Reports" })).toHaveCount(0);

  const expense = await apiFetch(page, "/api/expenses", {
    method: "POST",
    data: {
      storeId: E2E_IDS.store,
      category: "Other",
      amount: 1,
      date: new Date().toISOString().slice(0, 10),
      note: "E2E unauthorized staff probe",
      paymentMode: "CASH",
      isRecurring: false,
    },
  });
  const report = await apiFetch(page, `/api/reports?type=stock&storeId=${E2E_IDS.store}`);
  await testInfo.attach("staff-authorization-evidence.json", {
    body: JSON.stringify(
      {
        expenseStatus: expense.status,
        expenseBody: expense.body,
        reportStatus: report.status,
        reportBody: report.body,
      },
      null,
      2,
    ),
    contentType: "application/json",
  });
  if (expense.status === 201 && typeof expense.body === "object" && expense.body !== null) {
    const id = (expense.body as { id?: string }).id;
    if (id) await e2eDb.storeExpense.deleteMany({ where: { id } });
  }
  await context.close();
  expect([expense.status, report.status]).toEqual([403, 403]);
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
