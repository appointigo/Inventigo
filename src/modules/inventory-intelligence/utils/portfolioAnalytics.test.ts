import test from "node:test";
import assert from "node:assert/strict";
import { buildCategorySizeDemand, buildInventoryValuation } from "./portfolioAnalytics.ts";

test("aggregates brand and category valuation from positive on-hand stock", () => {
  assert.deepEqual(buildInventoryValuation([
    { dimensionId: "brand-a", dimensionLabel: "Brand A", quantity: 3, unitCost: 100 },
    { dimensionId: "brand-a", dimensionLabel: "Brand A", quantity: 2, unitCost: 50 },
    { dimensionId: "brand-b", dimensionLabel: "Brand B", quantity: -4, unitCost: 500 },
  ]), [
    { id: "brand-a", label: "Brand A", inventoryValue: 400, units: 5 },
    { id: "brand-b", label: "Brand B", inventoryValue: 0, units: 0 },
  ]);
});

test("heat map aggregates the complete period rows as net units by category and size", () => {
  const rows = buildCategorySizeDemand([
    { categoryId: "c1", category: "Shirts", sizeId: "m", size: "M", units: 5 },
    { categoryId: "c1", category: "Shirts", sizeId: "m", size: "M", units: -2 },
    { categoryId: "c1", category: "Shirts", sizeId: "l", size: "L", units: 4 },
  ]);
  assert.deepEqual(rows.map((row) => [row.size, row.netUnitsSold]), [["L", 4], ["M", 3]]);
});
