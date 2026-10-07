import { expect, test } from "@playwright/test";
import { apiFetch, createSale, expectJson, expectMoney } from "../helpers/business";
import { E2E_IDS, e2eDb } from "../helpers/database";

test.describe.configure({ mode: "serial" });

test.afterAll(async () => {
  await e2eDb.$disconnect();
});

test("customer profile, invoice JSON and generated PDF use the persisted sale", async ({ page }) => {
  const sale = await createSale(page, "9990000701");
  const persisted = await e2eDb.sale.findUniqueOrThrow({
    where: { id: sale.id },
    include: { customer: true },
  });
  expect(persisted.customer).not.toBeNull();

  const detailResponse = await apiFetch(page, `/api/customers/${persisted.customerId}`);
  const detail = await expectJson<{
    id: string;
    totalSpent: number;
    totalVisits: number;
    sales: Array<{ id: string; invoiceNumber: string; total: number }>;
  }>(detailResponse, 200);
  expect(detail.id).toBe(persisted.customerId);
  expect(detail.sales).toContainEqual(
    expect.objectContaining({ id: sale.id, invoiceNumber: sale.invoiceNumber }),
  );
  expectMoney(detail.totalSpent, persisted.total);
  expect(detail.totalVisits).toBe(1);

  const invoiceResponse = await apiFetch(
    page,
    `/api/customers/${persisted.customerId}/invoices/${sale.id}`,
  );
  const invoice = await expectJson<{ id: string; invoiceNumber: string; customerId: string }>(
    invoiceResponse,
    200,
  );
  expect(invoice).toMatchObject({
    id: sale.id,
    invoiceNumber: sale.invoiceNumber,
    customerId: persisted.customerId,
  });

  const pdf = await apiFetch(
    page,
    `/api/customers/${persisted.customerId}/invoices/${sale.id}/pdf`,
  );
  expect(pdf.status).toBe(200);
  expect(pdf.contentType).toContain("application/pdf");
  expect(pdf.disposition).toContain("attachment");
  expect(pdf.byteLength).toBeGreaterThan(500);

  const foreignInvoice = await apiFetch(
    page,
    `/api/customers/${E2E_IDS.foreignUser}/invoices/${sale.id}`,
  );
  await expectJson(foreignInvoice, 404);
});

test("customer create, normalize, update, search and pagination validation are scoped", async ({
  page,
}) => {
  const createdResponse = await apiFetch(page, "/api/customers", {
    method: "POST",
    data: {
      name: "E2E Searchable Customer",
      mobile: "+91 99900 00702",
      email: "customer@stockiva.invalid",
      preferredStoreId: E2E_IDS.store,
      tags: ["e2e", "e2e"],
    },
  });
  const created = await expectJson<{ id: string; mobile: string }>(createdResponse, 201);
  expect(created.mobile).toBe("9990000702");

  const duplicate = await apiFetch(page, "/api/customers", {
    method: "POST",
    data: { name: "Duplicate", mobile: "9990000702" },
  });
  await expectJson(duplicate, 400);

  const updatedResponse = await apiFetch(page, `/api/customers/${created.id}`, {
    method: "PATCH",
    data: { name: "E2E Updated Customer", notes: "E2E persisted note", tags: ["updated"] },
  });
  const updated = await expectJson<{ name: string; notes: string; tags: string[] }>(
    updatedResponse,
    200,
  );
  expect(updated).toMatchObject({
    name: "E2E Updated Customer",
    notes: "E2E persisted note",
    tags: ["updated"],
  });

  const searchResponse = await apiFetch(page, "/api/customers/search?name=E2E%20Updated");
  const search = await expectJson<Array<{ id: string; mobile: string }>>(searchResponse, 200);
  expect(search).toContainEqual(expect.objectContaining({ id: created.id, mobile: "9990000702" }));

  const listResponse = await apiFetch(
    page,
    "/api/customers?search=Updated%20Customer&page=1&pageSize=1&sortBy=name&sortDirection=asc",
  );
  const list = await expectJson<{ items: Array<{ id: string }>; total: number }>(listResponse, 200);
  expect(list.items).toContainEqual(expect.objectContaining({ id: created.id }));
  expect(list.total).toBeGreaterThanOrEqual(1);

  await expectJson(await apiFetch(page, "/api/customers?page=0"), 400);
  await expectJson(await apiFetch(page, "/api/customers?pageSize=101"), 400);
  await expectJson(await apiFetch(page, "/api/customers?type=not-a-filter"), 400);
});

test("alphanumeric customer name search does not become a phone-digit OR", async ({
  page,
}, testInfo) => {
  const response = await apiFetch(
    page,
    "/api/customers?search=E2E%20Updated&page=1&pageSize=10&sortBy=name&sortDirection=asc",
  );
  const result = await expectJson<{
    items: Array<{ id: string; name: string | null; mobile: string }>;
    total: number;
  }>(response, 200);
  const expected = await e2eDb.customer.findFirstOrThrow({
    where: { orgId: E2E_IDS.organization, mobile: "9990000702" },
  });
  await testInfo.attach("alphanumeric-customer-search-evidence.json", {
    body: JSON.stringify(
      {
        query: "E2E Updated",
        total: result.total,
        returned: result.items,
        expectedCustomerId: expected.id,
      },
      null,
      2,
    ),
    contentType: "application/json",
  });
  expect(result.items).toHaveLength(1);
  expect(result.items[0].id).toBe(expected.id);
});

test("customer pagination crosses real database pages without overlap or truncation", async ({
  page,
}) => {
  const prefix = "Page Boundary";
  for (let index = 0; index < 12; index += 1) {
    await expectJson(
      await apiFetch(page, "/api/customers", {
        method: "POST",
        data: {
          name: `${prefix} ${String(index).padStart(2, "0")}`,
          mobile: String(9988800000 + index),
          preferredStoreId: E2E_IDS.store,
        },
      }),
      201,
    );
  }
  const pages = await Promise.all(
    [1, 2, 3].map(async (pageNumber) =>
      expectJson<{
        items: Array<{ id: string; name: string }>;
        total: number;
        page: number;
        pageSize: number;
        totalPages: number;
      }>(
        await apiFetch(
          page,
          `/api/customers?search=${encodeURIComponent(prefix)}&page=${pageNumber}&pageSize=5&sortBy=name&sortDirection=asc`,
        ),
        200,
      ),
    ),
  );
  expect(pages.map((result) => result.items.length)).toEqual([5, 5, 2]);
  expect(pages.every((result) => result.total === 12 && result.totalPages === 3)).toBe(true);
  const ids = pages.flatMap((result) => result.items.map((customer) => customer.id));
  expect(new Set(ids).size).toBe(12);
  expect(
    pages.flatMap((result) => result.items.map((customer) => customer.name)),
  ).toEqual(Array.from({ length: 12 }, (_, index) => `${prefix} ${String(index).padStart(2, "0")}`));
});
