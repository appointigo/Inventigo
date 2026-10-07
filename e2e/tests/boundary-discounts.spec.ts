import { expect, test } from "@playwright/test";
import { apiFetch, createSale, expectJson, expectMoney, saleItem, salePayload } from "../helpers/business";
import { E2E_IDS, e2eDb } from "../helpers/database";

test.describe.configure({ mode: "serial" });

test.afterAll(async () => {
  await e2eDb.$disconnect();
});

test("paise boundary is explicitly reconciled through retail round-off", async ({ page }) => {
  const sale = await createSale(page, "9990000601", {
    items: [saleItem({ unitPrice: 0.01 })],
    amountPaid: 0,
  });
  const persisted = await e2eDb.sale.findUniqueOrThrow({
    where: { id: sale.id },
    include: { items: true, payments: true },
  });
  expectMoney(persisted.subtotal, 0.01);
  expectMoney(persisted.calculatedTotal, 0.01);
  expectMoney(persisted.roundOffAmount, -0.01);
  expectMoney(persisted.finalPayableAmount, 0);
  expectMoney(persisted.amountPaid, 0);
  expectMoney(persisted.amountDue, 0);
  expect(persisted.payments).toHaveLength(0);
  expect(persisted.items).toHaveLength(1);
  expect(await e2eDb.stockMovement.count({ where: { referenceId: sale.id } })).toBe(1);
});

test("one-paise underpayment remains a precise receivable", async ({ page }) => {
  const under = await createSale(page, "9990000602", { amountPaid: 999.99 });
  const underSale = await e2eDb.sale.findUniqueOrThrow({ where: { id: under.id } });
  expectMoney(underSale.amountPaid, 999.99);
  expectMoney(underSale.amountDue, 0.01);
  expect(underSale.paymentStatus).toBe("PARTIAL");

});

test("one-paise overpayment follows cash-clamp and non-cash rejection policy", async ({
  page,
}, testInfo) => {
  const attempts = [
    { method: "CASH", phone: "9990000604" },
    { method: "CARD", phone: "9990000603" },
  ] as const;
  const before = await e2eDb.sale.count({
    where: { customerPhone: { in: attempts.map((attempt) => attempt.phone) } },
  });
  const responses = [];
  for (const attempt of attempts) {
    responses.push(
      await apiFetch(page, "/api/billing", {
        method: "POST",
        data: salePayload(attempt.phone, {
          paymentMethod: attempt.method,
          amountPaid: 1000.01,
        }),
      }),
    );
  }
  const persisted = await e2eDb.sale.findMany({
    where: { customerPhone: { in: attempts.map((attempt) => attempt.phone) } },
    include: { payments: { include: { financialTransaction: true } } },
    orderBy: { customerPhone: "asc" },
  });
  await testInfo.attach("one-paise-overpayment-evidence.json", {
    body: JSON.stringify(
      {
        responseStatuses: responses.map((response) => response.status),
        responseBodies: responses.map((response) => response.body),
        saleDelta: persisted.length - before,
        sales: persisted.map((sale) => ({
          customerPhone: sale.customerPhone,
          total: Number(sale.total),
          amountPaid: Number(sale.amountPaid),
          amountDue: Number(sale.amountDue),
          payments: sale.payments.map((payment) => ({
            amount: Number(payment.amount),
            method: payment.method,
            ledgerAmount: Number(payment.financialTransaction?.amount ?? 0),
          })),
        })),
      },
      null,
      2,
    ),
    contentType: "application/json",
  });
  expect(responses.map((response) => response.status)).toEqual([201, 400]);
  expect(persisted).toHaveLength(before + 1);
  expectMoney(persisted.find((sale) => sale.customerPhone === "9990000604")!.amountPaid, 1000);
});

test("maximum and oversized discounts never create negative sale economics", async ({ page }) => {
  for (const [index, discount] of [
    { discountType: "PERCENTAGE", discountPercent: 100, discountAmount: 0 },
    { discountType: "FLAT", discountAmount: 2000 },
  ].entries()) {
    const sale = await createSale(page, `999000061${index}`, {
      ...discount,
      amountPaid: 0,
    });
    const persisted = await e2eDb.sale.findUniqueOrThrow({
      where: { id: sale.id },
      include: { items: true, payments: true },
    });
    expectMoney(persisted.subtotal, 1000);
    expectMoney(persisted.discountAmount, 1000);
    expectMoney(persisted.finalPayableAmount, 0);
    expectMoney(persisted.items[0].allocatedDiscount, 1000);
    expect(persisted.payments).toHaveLength(0);
  }

  const countBefore = await e2eDb.sale.count({ where: { customerPhone: "9990000619" } });
  const invalidPercent = await apiFetch(page, "/api/billing", {
    method: "POST",
    data: salePayload("9990000619", {
      discountType: "PERCENTAGE",
      discountPercent: 100.01,
      amountPaid: 0,
    }),
  });
  await expectJson(invalidPercent, 400);
  expect(await e2eDb.sale.count({ where: { customerPhone: "9990000619" } })).toBe(countBefore);
});

test("multi-item percentage allocation remains paise-exact with split payment", async ({ page }) => {
  const sale = await createSale(page, "9990000620", {
    items: [
      saleItem(),
      saleItem({
        productId: E2E_IDS.secondProduct,
        productName: "E2E Runner Tee",
        sku: "E2E-P1-TEE",
        unitPrice: 500,
      }),
    ],
    discountType: "PERCENTAGE",
    discountPercent: 33.33,
    amountPaid: 1000,
    splitPayments: [
      { method: "CASH", amount: 600 },
      { method: "UPI", amount: 400 },
    ],
  });
  const persisted = await e2eDb.sale.findUniqueOrThrow({
    where: { id: sale.id },
    include: { items: true, payments: true },
  });
  expectMoney(persisted.subtotal, 1500);
  expectMoney(persisted.discountAmount, 499.95);
  expectMoney(persisted.calculatedTotal, 1000.05);
  expectMoney(persisted.roundOffAmount, -0.05);
  expectMoney(persisted.finalPayableAmount, 1000);
  expectMoney(
    persisted.items.reduce((sum, item) => sum + Number(item.allocatedDiscount), 0),
    499.95,
  );
  expectMoney(
    persisted.payments.reduce((sum, payment) => sum + Number(payment.amount), 0),
    1000,
  );
});
