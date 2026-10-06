import {
  canonicalInventoryValue,
  canonicalSettlementTotals,
  fromMinorUnits,
  toMinorUnits,
  type MoneyValue,
} from "./canonicalMetrics.ts";

export type ControlSale = {
  finalAmount: MoneyValue;
  discount: MoneyValue;
  cogs: MoneyValue;
  units: number;
};
export type ControlReturn = {
  returnedValue: MoneyValue;
  replacementValue: MoneyValue;
  returnedCost: MoneyValue;
  replacementCost: MoneyValue;
  returnedUnits: number;
  replacementUnits: number;
};

export function reconcileControlDataset(input: {
  sales: ControlSale[];
  returns: ControlReturn[];
  payments: Array<{ amount: MoneyValue }>;
  expenses: MoneyValue[];
  closingInventory: Array<{ quantity: number; unitCost: MoneyValue; unitRetail: MoneyValue }>;
  purchasesReceived: MoneyValue[];
  supplierPayables: MoneyValue[];
}) {
  const saleNetMinor = input.sales.reduce((sum, row) => sum + toMinorUnits(row.finalAmount), 0);
  const discountsMinor = input.sales.reduce((sum, row) => sum + toMinorUnits(row.discount), 0);
  const returnMinor = input.returns.reduce((sum, row) => sum + toMinorUnits(row.returnedValue), 0);
  const replacementMinor = input.returns.reduce(
    (sum, row) => sum + toMinorUnits(row.replacementValue),
    0
  );
  const netSalesMinor = saleNetMinor - returnMinor + replacementMinor;
  const cogsMinor =
    input.sales.reduce((sum, row) => sum + toMinorUnits(row.cogs), 0) -
    input.returns.reduce((sum, row) => sum + toMinorUnits(row.returnedCost), 0) +
    input.returns.reduce((sum, row) => sum + toMinorUnits(row.replacementCost), 0);
  const expensesMinor = input.expenses.reduce<number>((sum, value) => sum + toMinorUnits(value), 0);
  const inventory = canonicalInventoryValue(input.closingInventory);
  const settlement = canonicalSettlementTotals(input.payments);
  const unitsSold =
    input.sales.reduce((sum, row) => sum + row.units, 0) -
    input.returns.reduce((sum, row) => sum + row.returnedUnits, 0) +
    input.returns.reduce((sum, row) => sum + row.replacementUnits, 0);
  return {
    grossSales: fromMinorUnits(saleNetMinor + discountsMinor),
    discounts: fromMinorUnits(discountsMinor),
    returns: fromMinorUnits(returnMinor),
    replacementSales: fromMinorUnits(replacementMinor),
    netSales: fromMinorUnits(netSalesMinor),
    cogs: fromMinorUnits(cogsMinor),
    grossProfit: fromMinorUnits(netSalesMinor - cogsMinor),
    expenses: fromMinorUnits(expensesMinor),
    netProfit: fromMinorUnits(netSalesMinor - cogsMinor - expensesMinor),
    orders: input.sales.length,
    unitsSold,
    averageOrderValue: fromMinorUnits(Math.round(netSalesMinor / input.sales.length)),
    ...settlement,
    receivables: fromMinorUnits(
      netSalesMinor - (toMinorUnits(settlement.collections) - toMinorUnits(settlement.refundsPaid))
    ),
    stockOnHand: inventory.units,
    inventoryCostValue: fromMinorUnits(inventory.costMinor),
    inventoryRetailValue: fromMinorUnits(inventory.retailMinor),
    purchasesReceived: fromMinorUnits(
      input.purchasesReceived.reduce<number>((sum, value) => sum + toMinorUnits(value), 0)
    ),
    supplierPayables: fromMinorUnits(
      input.supplierPayables.reduce<number>((sum, value) => sum + toMinorUnits(value), 0)
    ),
  };
}
