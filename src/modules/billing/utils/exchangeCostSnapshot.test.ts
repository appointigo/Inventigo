import test from "node:test";
import assert from "node:assert/strict";
import { attachReplacementCostSnapshots } from "./exchangeCostSnapshot.ts";

test("captures the current product cost without changing replacement price or quantity", () => {
  const [line] = attachReplacementCostSnapshots(
    [{ productId: "replacement", sizeId: "m", quantity: 2, total: 1_400 }],
    [{ id: "replacement", costPrice: "425.50" }],
  );
  assert.deepEqual(line, {
    productId: "replacement", sizeId: "m", quantity: 2, total: 1_400, costPrice: 425.5,
  });
});

test("rejects an exchange when a valid immutable replacement cost cannot be captured", () => {
  assert.throws(
    () => attachReplacementCostSnapshots(
      [{ productId: "missing", sizeId: "m", quantity: 1, total: 500 }],
      [],
    ),
    /Invalid exchange product/,
  );
});
