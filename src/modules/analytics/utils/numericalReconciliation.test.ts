import assert from "node:assert/strict";
import test from "node:test";
import { reconcileControlDataset } from "./numericalReconciliation.ts";

test("deterministic retail control dataset reconciles financial and inventory metrics", () => {
  const actual = reconcileControlDataset({
    sales: [
      { finalAmount: 2000, discount: 0, cogs: 1200, units: 2 },
      { finalAmount: 1000, discount: 0, cogs: 600, units: 1 },
      { finalAmount: 1799, discount: 0, cogs: 1000, units: 1 },
      { finalAmount: 900, discount: 100, cogs: 600, units: 1 },
      { finalAmount: 2398, discount: 0, cogs: 1400, units: 1 },
      { finalAmount: 1000, discount: 0, cogs: 600, units: 1 },
      { finalAmount: 1799, discount: 0, cogs: 1000, units: 1 },
      { finalAmount: 2398, discount: 0, cogs: 1400, units: 1 },
    ],
    returns: [
      {
        returnedValue: 1799,
        replacementValue: 0,
        returnedCost: 1000,
        replacementCost: 0,
        returnedUnits: 1,
        replacementUnits: 0,
      },
      {
        returnedValue: 1799,
        replacementValue: 2398,
        returnedCost: 1000,
        replacementCost: 1400,
        returnedUnits: 1,
        replacementUnits: 1,
      },
      {
        returnedValue: 2398,
        replacementValue: 1799,
        returnedCost: 1400,
        replacementCost: 1000,
        returnedUnits: 1,
        replacementUnits: 1,
      },
    ],
    payments: [
      { amount: 2000 },
      { amount: 1000 },
      { amount: 1799 },
      { amount: 900 },
      { amount: 2398 },
      { amount: 400 },
      { amount: 600 },
      { amount: 1799 },
      { amount: 599 },
      { amount: 2398 },
      { amount: -1799 },
      { amount: -599 },
    ],
    expenses: [500],
    closingInventory: [
      { quantity: 19, unitCost: 600, unitRetail: 1000 },
      { quantity: 9, unitCost: 1000, unitRetail: 1799 },
      { quantity: 8, unitCost: 1400, unitRetail: 2398 },
    ],
    purchasesReceived: [3000],
    supplierPayables: [3000],
  });
  assert.deepEqual(actual, {
    grossSales: 13394,
    discounts: 100,
    returns: 5996,
    replacementSales: 4197,
    netSales: 11495,
    cogs: 6800,
    grossProfit: 4695,
    expenses: 500,
    netProfit: 4195,
    orders: 8,
    unitsSold: 8,
    averageOrderValue: 1436.88,
    collections: 13893,
    refundsPaid: 2398,
    netCustomerMovement: 11495,
    receivables: 0,
    stockOnHand: 36,
    inventoryCostValue: 31600,
    inventoryRetailValue: 54375,
    purchasesReceived: 3000,
    supplierPayables: 3000,
  });
});
