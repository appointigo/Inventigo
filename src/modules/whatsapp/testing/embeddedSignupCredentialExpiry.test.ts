import assert from "node:assert/strict";
import test from "node:test";
import { earliestMetaCredentialExpiry } from "../metaCredentialExpiry.ts";

test("stores the earliest available Meta credential expiry", () => {
  const exchange = new Date("2026-12-01T00:00:00.000Z");
  const token = new Date("2026-11-01T00:00:00.000Z");
  const dataAccess = new Date("2026-10-01T00:00:00.000Z");
  assert.equal(
    earliestMetaCredentialExpiry(exchange, token, dataAccess)?.toISOString(),
    dataAccess.toISOString()
  );
  assert.equal(earliestMetaCredentialExpiry(), undefined);
});
