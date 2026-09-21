import assert from "node:assert/strict";
import test from "node:test";
import { updateBarcodeSelection } from "./barcodeSelection.ts";

type ProductStub = { id: string; name: string };
const product = (id: string): ProductStub => ({ id, name: id });

test("merges selections across filters and keeps cached products", () => {
  const brandA = Array.from({ length: 20 }, (_, index) => product(`a-${index}`));
  const brandB = Array.from({ length: 20 }, (_, index) => product(`b-${index}`));
  const categoryC = Array.from({ length: 10 }, (_, index) => product(`c-${index}`));

  let state = updateBarcodeSelection({ ids: [], productsById: {} }, brandA, brandA.map((p) => p.id));
  state = updateBarcodeSelection(state, brandB, brandB.map((p) => p.id));
  state = updateBarcodeSelection(state, categoryC, categoryC.map((p) => p.id));

  assert.equal(state.ids.length, 50);
  assert.equal(Object.keys(state.productsById).length, 50);
  assert.deepEqual(new Set(state.ids).size, 50);
});

test("deselects only the visible unchecked product", () => {
  const brandA = [product("a-1"), product("a-2")];
  const brandB = [product("b-1"), product("b-2")];
  let state = updateBarcodeSelection({ ids: [], productsById: {} }, brandA, ["a-1", "a-2"]);
  state = updateBarcodeSelection(state, brandB, ["b-1", "b-2"]);
  state = updateBarcodeSelection(state, brandA, ["a-2"]);

  assert.deepEqual(state.ids, ["b-1", "b-2", "a-2"]);
  assert.equal(state.productsById["a-1"], undefined);
  assert.ok(state.productsById["b-1"]);
});
