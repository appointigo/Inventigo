import { expect, test } from "@playwright/test";
import { E2E_IDS, e2eDb, readGoldenSale } from "../helpers/database";

const customer = {
  name: "E Two E Golden Customer",
  phone: "9990000001",
};

test.afterAll(async () => {
  await e2eDb.$disconnect();
});

test("P0 cash sale persists one payment, ledger inflow, customer value and stock movement", async ({
  page,
}) => {
  await page.route("**/api/whatsapp/**", (route) => route.abort("blockedbyclient"));
  const openingStock = await e2eDb.stockEntry.findUniqueOrThrow({
    where: {
      productId_sizeId_storeId: {
        productId: E2E_IDS.product,
        sizeId: E2E_IDS.size,
        storeId: E2E_IDS.store,
      },
    },
  });
  await page.goto("/dashboard/billing");
  await expect(page.getByRole("tab", { name: /New Sale/ })).toBeVisible();

  const search = page.getByPlaceholder("Scan barcode or search by name / SKU…");
  await search.fill("E2E-P0-TEE");
  await expect(page.getByText("E2E Classic Tee").first()).toBeVisible();
  await page.getByRole("button", { name: "+ Add" }).click();

  await page.getByPlaceholder("Full name").fill(customer.name);
  await page.getByPlaceholder("10-digit no.").fill(customer.phone);
  await page.getByRole("button", { name: /Cash/ }).click();
  const confirmSale = page.getByRole("button", { name: /Confirm Sale/ });
  await expect(confirmSale).toBeEnabled();
  await confirmSale.click();

  await expect(page.getByText("Sale Complete")).toBeVisible();
  await expect(page.getByText("Transaction recorded successfully!")).toBeVisible();

  await expect
    .poll(async () => readGoldenSale(customer.phone), { message: "sale persisted" })
    .not.toBeNull();
  const sale = await readGoldenSale(customer.phone);
  expect(sale).not.toBeNull();
  expect(Number(sale!.finalPayableAmount ?? sale!.total)).toBe(1000);
  expect(Number(sale!.amountPaid)).toBe(1000);
  expect(Number(sale!.amountDue)).toBe(0);
  expect(sale!.paymentStatus).toBe("PAID");
  expect(sale!.items).toHaveLength(1);
  expect(sale!.items[0].productId).toBe(E2E_IDS.product);
  expect(Number(sale!.items[0].costPrice)).toBe(600);
  expect(sale!.payments).toHaveLength(1);
  expect(Number(sale!.payments[0].amount)).toBe(1000);
  expect(sale!.payments[0].method).toBe("CASH");
  expect(sale!.payments[0].financialTransaction?.direction).toBe("INFLOW");
  expect(Number(sale!.payments[0].financialTransaction?.amount)).toBe(1000);
  expect(sale!.customer?.mobile).toBe(customer.phone);
  expect(sale!.customer?.totalSpent).toBe(1000);

  const [
    saleCount,
    itemCount,
    paymentCount,
    financialMovementCount,
    customerCount,
    stock,
    movements,
  ] = await Promise.all([
    e2eDb.sale.count({
      where: { storeId: E2E_IDS.store, customerPhone: customer.phone },
    }),
    e2eDb.saleItem.count({ where: { saleId: sale!.id } }),
    e2eDb.salePayment.count({ where: { saleId: sale!.id } }),
    e2eDb.financialTransaction.count({
      where: { salePaymentId: sale!.payments[0].id },
    }),
    e2eDb.customer.count({
      where: { orgId: E2E_IDS.organization, mobile: customer.phone },
    }),
    e2eDb.stockEntry.findUniqueOrThrow({
      where: {
        productId_sizeId_storeId: {
          productId: E2E_IDS.product,
          sizeId: E2E_IDS.size,
          storeId: E2E_IDS.store,
        },
      },
    }),
    e2eDb.stockMovement.findMany({
      where: { referenceId: sale!.id, productId: E2E_IDS.product },
    }),
  ]);
  expect(saleCount).toBe(1);
  expect(itemCount).toBe(1);
  expect(paymentCount).toBe(1);
  expect(financialMovementCount).toBe(1);
  expect(customerCount).toBe(1);
  expect(stock.quantity).toBe(openingStock.quantity - 1);
  expect(movements).toHaveLength(1);
  expect(movements[0].type).toBe("SALE");
  expect(movements[0].deltaQuantity).toBe(-1);
  expect(movements[0].quantityBefore).toBe(openingStock.quantity);
  expect(movements[0].quantityAfter).toBe(openingStock.quantity - 1);
});
