import { expect, test } from "@playwright/test";
import { apiFetch, createSale, expectJson, expectMoney, saleItem } from "../helpers/business";
import { E2E_IDS, e2eDb } from "../helpers/database";

test.afterAll(async () => {
  await e2eDb.$disconnect();
});

test("one customer lifecycle reconciles purchases, credit, discount, return, refund and exchange", async ({
  page,
}) => {
  const phone = "9990000401";
  const stockBefore = await e2eDb.stockEntry.findMany({
    where: {
      storeId: E2E_IDS.store,
      productId: { in: [E2E_IDS.product, E2E_IDS.secondProduct] },
    },
  });

  const creditSale = await createSale(page, phone, { amountPaid: 600 });
  await expectJson(
    await apiFetch(page, `/api/billing/${creditSale.id}/payments`, {
      method: "POST",
      data: { amount: 400, method: "UPI" },
    }),
    201,
  );

  const discountedSale = await createSale(page, phone, {
    items: [saleItem({ quantity: 2 })],
    discountType: "PERCENTAGE",
    discountPercent: 10,
    amountPaid: 1800,
  });
  const returned = await expectJson<{ id: string }>(
    await apiFetch(page, `/api/billing/${discountedSale.id}/return`, {
      method: "POST",
      headers: { "idempotency-key": "e2e-lifecycle-return" },
      data: {
        type: "RETURN",
        returnedItems: [
          { productId: E2E_IDS.product, sizeId: E2E_IDS.size, quantity: 1, total: 1000 },
        ],
        exchangedItems: [],
      },
    }),
    201,
  );
  const liability = await e2eDb.refundLiability.findUniqueOrThrow({
    where: { returnTransactionId: returned.id },
  });
  await expectJson(
    await apiFetch(page, `/api/finance/refunds/${liability.id}/settlements`, {
      method: "POST",
      data: {
        amount: 900,
        accountId: E2E_IDS.cashAccount,
        method: "CASH",
        settledAt: new Date().toISOString(),
        idempotencyKey: "e2e-lifecycle-refund",
      },
    }),
    201,
  );

  const exchangeSale = await createSale(page, phone, {
    items: [
      saleItem({
        productId: E2E_IDS.secondProduct,
        productName: "E2E Runner Tee",
        sku: "E2E-P1-TEE",
        unitPrice: 500,
      }),
    ],
    amountPaid: 500,
  });
  await expectJson(
    await apiFetch(page, `/api/billing/${exchangeSale.id}/return`, {
      method: "POST",
      headers: { "idempotency-key": "e2e-lifecycle-exchange" },
      data: {
        type: "EXCHANGE",
        returnedItems: [
          { productId: E2E_IDS.secondProduct, sizeId: E2E_IDS.size, quantity: 1, total: 500 },
        ],
        exchangedItems: [
          { productId: E2E_IDS.product, sizeId: E2E_IDS.size, quantity: 1, total: 1000 },
        ],
        topUpPayments: [{ method: "CASH", amount: 500 }],
      },
    }),
    201,
  );
  const finalSale = await createSale(page, phone);

  const customer = await e2eDb.customer.findFirstOrThrow({
    where: { orgId: E2E_IDS.organization, mobile: phone },
  });
  const sales = await e2eDb.sale.findMany({
    where: { customerId: customer.id },
    include: { items: true, payments: true },
  });
  const returns = await e2eDb.returnTransaction.findMany({
    where: { customerId: customer.id },
    include: { items: true, sale: { include: { items: true } } },
  });
  const settlements = await e2eDb.refundSettlement.findMany({
    where: { liability: { returnTransaction: { customerId: customer.id } } },
  });
  const stockAfter = await e2eDb.stockEntry.findMany({
    where: {
      storeId: E2E_IDS.store,
      productId: { in: [E2E_IDS.product, E2E_IDS.secondProduct] },
    },
  });

  const grossSales = sales.reduce((sum, sale) => sum + Number(sale.subtotal), 0);
  const discounts = sales.reduce((sum, sale) => sum + Number(sale.discountAmount), 0);
  const billed = sales.reduce((sum, sale) => sum + Number(sale.total), 0);
  const returnAdjustment = returns.reduce(
    (sum, transaction) => sum + Number(transaction.netAmount) - Number(transaction.refundAmount),
    0,
  );
  const netSales = billed + returnAdjustment;
  const collections = sales.reduce(
    (sum, sale) => sum + sale.payments.reduce((paymentSum, row) => paymentSum + Number(row.amount), 0),
    0,
  );
  const refundsPaid = settlements.reduce((sum, settlement) => sum + Number(settlement.amount), 0);
  const receivables = sales.reduce((sum, sale) => sum + Number(sale.amountDue), 0);
  const refundOutstanding = await e2eDb.refundLiability.aggregate({
    where: { returnTransaction: { customerId: customer.id } },
    _sum: { outstandingAmount: true },
  });
  const originalCogs = sales.reduce(
    (sum, sale) =>
      sum + sale.items.reduce((lineSum, item) => lineSum + Number(item.costPrice) * item.quantity, 0),
    0,
  );
  const returnCogs = returns.reduce((sum, transaction) => {
    const costs = new Map(
      transaction.sale.items.map((item) => [
        `${item.productId}:${item.sizeId}`,
        Number(item.costPrice),
      ]),
    );
    return (
      sum +
      transaction.items.reduce((lineSum, item) => {
        const returnedCost =
          item.returnedProductId && item.returnedSizeId
            ? (costs.get(`${item.returnedProductId}:${item.returnedSizeId}`) ?? 0) *
              item.returnedQuantity
            : 0;
        const replacementCost = Number(item.newCostPrice ?? 0) * Number(item.newQuantity ?? 0);
        return lineSum + replacementCost - returnedCost;
      }, 0)
    );
  }, 0);
  const cogs = originalCogs + returnCogs;
  const grossProfit = netSales - cogs;

  expect(sales.map((sale) => sale.id)).toEqual(
    expect.arrayContaining([creditSale.id, discountedSale.id, exchangeSale.id, finalSale.id]),
  );
  expectMoney(grossSales, 4500);
  expectMoney(discounts, 200);
  expectMoney(billed, 4300);
  expectMoney(returnAdjustment, -400);
  expectMoney(netSales, 3900);
  expectMoney(collections, 4800);
  expectMoney(refundsPaid, 900);
  expectMoney(collections - refundsPaid, netSales);
  expectMoney(receivables, 0);
  expectMoney(refundOutstanding._sum.outstandingAmount, 0);
  expectMoney(cogs, 2400);
  expectMoney(grossProfit, 1500);
  expectMoney(customer.totalSpent, 3900);

  const quantity = (rows: typeof stockBefore, productId: string) =>
    rows.find((row) => row.productId === productId)!.quantity;
  expect(quantity(stockAfter, E2E_IDS.product) - quantity(stockBefore, E2E_IDS.product)).toBe(-4);
  expect(quantity(stockAfter, E2E_IDS.secondProduct) - quantity(stockBefore, E2E_IDS.secondProduct)).toBe(0);

  const customerApi = await expectJson<{
    totalSpent: number;
    totalVisits: number;
    sales: Array<{ id: string }>;
  }>(await apiFetch(page, `/api/customers/${customer.id}`), 200);
  expectMoney(customerApi.totalSpent, 3900);
  expect(customerApi.totalVisits).toBe(4);
  expect(customerApi.sales).toHaveLength(4);
});
