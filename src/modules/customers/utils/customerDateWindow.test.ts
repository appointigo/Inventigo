import test from "node:test";
import assert from "node:assert/strict";
import { getCustomerDateWindow, isInCustomerDateWindow, type CustomerDatePreset } from "./customerDateWindow.ts";

const now = new Date("2026-09-26T18:45:00.000Z"); // 27 Sep, 00:15 in Asia/Kolkata

for (const [days, expectedStart] of [
  [7, "2026-09-20T18:30:00.000Z"],
  [30, "2026-08-28T18:30:00.000Z"],
  [90, "2026-06-29T18:30:00.000Z"],
  [180, "2026-03-31T18:30:00.000Z"],
] as const) {
  test(`last ${days} days uses inclusive Asia/Kolkata calendar dates`, () => {
    const window = getCustomerDateWindow(days, now);
    assert.equal(window.startInclusive.toISOString(), expectedStart);
    assert.equal(window.endExclusive.toISOString(), "2026-09-27T18:30:00.000Z");
    assert.equal(isInCustomerDateWindow(window.startInclusive, window), true);
    assert.equal(isInCustomerDateWindow(new Date(window.startInclusive.getTime() - 1), window), false);
    assert.equal(isInCustomerDateWindow(new Date(window.endExclusive.getTime() - 1), window), true);
    assert.equal(isInCustomerDateWindow(window.endExclusive, window), false);
  });
}

test("customers without a purchase never qualify", () => {
  assert.equal(isInCustomerDateWindow(null, getCustomerDateWindow(30, now)), false);
});

test("KPI group and last-purchase filters combine rather than replace each other", () => {
  const window = getCustomerDateWindow(30, now);
  const rows = [
    { id: "match", groups: ["Need Attention"], lastPurchaseAt: "2026-09-01T12:00:00.000Z" },
    { id: "wrong-group", groups: ["Repeat Customer"], lastPurchaseAt: "2026-09-01T12:00:00.000Z" },
    { id: "too-old", groups: ["Need Attention"], lastPurchaseAt: "2026-08-01T12:00:00.000Z" },
    { id: "no-purchase", groups: ["Need Attention"], lastPurchaseAt: null },
  ];
  assert.deepEqual(rows.filter(row => row.groups.includes("Need Attention") && isInCustomerDateWindow(row.lastPurchaseAt, window)).map(row => row.id), ["match"]);
});

test("all supported presets produce distinct starts", () => {
  const starts = ([7, 30, 90, 180] satisfies CustomerDatePreset[]).map(days => getCustomerDateWindow(days, now).startInclusive.toISOString());
  assert.equal(new Set(starts).size, 4);
});
