import { expect, test } from "@playwright/test";
import { apiFetch, expectJson, salePayload } from "../helpers/business";
import { E2E_IDS, e2eDb } from "../helpers/database";

test("deleting a sold product preserves historical sale and stock evidence", async ({ page }, testInfo) => {
  const phone = "9990000898";
  const sku = "E2E-DELETE-HISTORY";
  const product = await expectJson<{ id: string }>(
    await apiFetch(page, "/api/products", {
      method: "POST",
      data: {
        name: "E2E Historical Delete Probe",
        sku,
        categoryId: "00000000-0000-4000-8000-00000000e204",
        brandId: "00000000-0000-4000-8000-00000000e205",
        mrp: 500,
        basePrice: 500,
        costPrice: 200,
        attributes: {},
        isActive: true,
        storeId: E2E_IDS.store,
        sizes: [{ sizeId: E2E_IDS.size, quantity: 2, reorderLevel: 0 }],
      },
    }),
    201,
  );
  const sale = await expectJson<{ id: string }>(
    await apiFetch(page, "/api/billing", {
      method: "POST",
      data: salePayload(phone, {
        items: [{
          productId: product.id,
          productName: "E2E Historical Delete Probe",
          sku,
          sizeId: E2E_IDS.size,
          sizeLabel: "M",
          attributes: {},
          quantity: 1,
          unitPrice: 500,
        }],
        amountPaid: 500,
      }),
    }),
    201,
  );
  try {
    const deletion = await apiFetch(page, `/api/products/${product.id}`, { method: "DELETE" });
    const evidence = {
      response: deletion,
      product: await e2eDb.product.findUnique({ where: { id: product.id } }),
      sale: await e2eDb.sale.findUnique({
        where: { id: sale.id },
        include: { items: true, payments: true, customer: true },
      }),
      productMovements: await e2eDb.stockMovement.count({ where: { productId: product.id } }),
    };
    const invoice = await apiFetch(
      page,
      `/api/customers/${evidence.sale?.customerId}/invoices/${sale.id}`,
    );
    await testInfo.attach("sold-product-delete-evidence.json", {
      body: Buffer.from(JSON.stringify(evidence, null, 2)),
      contentType: "application/json",
    });
    expect(deletion.status).toBe(409);
    expect(evidence.product).not.toBeNull();
    expect(evidence.sale?.items).toHaveLength(1);
    expect(Number(evidence.sale?.items[0].costPrice)).toBe(200);
    expect(evidence.sale?.customer?.mobile).toBe(phone);
    expect(evidence.productMovements).toBeGreaterThanOrEqual(2);
    await expectJson(invoice, 200);
  } finally {
    const paymentIds = (await e2eDb.salePayment.findMany({ where: { saleId: sale.id }, select: { id: true } })).map((row) => row.id);
    await e2eDb.financialTransaction.deleteMany({ where: { salePaymentId: { in: paymentIds } } });
    await e2eDb.salePayment.deleteMany({ where: { saleId: sale.id } });
    await e2eDb.sale.deleteMany({ where: { id: sale.id } });
    await e2eDb.stockMovement.deleteMany({ where: { productId: product.id } });
    await e2eDb.stockEntry.deleteMany({ where: { productId: product.id } });
    await e2eDb.product.deleteMany({ where: { id: product.id } });
    await e2eDb.customer.deleteMany({ where: { orgId: E2E_IDS.organization, mobile: phone } });
  }
});
