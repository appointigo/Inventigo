import assert from "node:assert/strict";
import test from "node:test";
import { formatPurchaseItem, getAdditionalItemCount } from "./customerPurchasePresentation.ts";

test("formats short, long and unbroken product names without mutating them", () => {
  for (const name of [
    "Shirt",
    "Adidas Premium Full Sleeve Cotton Casual Checked Shirt with Printed Design",
    "A".repeat(180),
  ]) {
    assert.equal(formatPurchaseItem({ name, size: "XL", quantity: 2 }), `${name} (XL) ×2`);
  }
});

test("additional item count is based on distinct item lines, not quantity", () => {
  assert.equal(getAdditionalItemCount([{ name: "One", size: null, quantity: 99 }]), 0);
  assert.equal(
    getAdditionalItemCount([
      { name: "One", size: null, quantity: 99 },
      { name: "Two", size: "M", quantity: 1 },
      { name: "Three", size: null, quantity: 4 },
    ]),
    2
  );
});
