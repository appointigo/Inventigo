import assert from "node:assert/strict";
import test from "node:test";
import { getInvoiceDeliveryFeedback } from "./invoiceDeliveryFeedback.ts";

test("does not describe queued or Meta-submitted invoices as delivered", () => {
  const processing = getInvoiceDeliveryFeedback("Sale", { id: "1", status: "QUEUED" });
  assert.equal(processing.level, "info");
  assert.match(processing.text, /processing/i);

  const submitted = getInvoiceDeliveryFeedback("Sale", { id: "1", status: "SUBMITTED" });
  assert.equal(submitted.level, "info");
  assert.match(submitted.text, /submitted to Meta/i);
  assert.match(submitted.text, /delivery is still pending/i);
});

test("reports persisted failure without obscuring billing success", () => {
  const failed = getInvoiceDeliveryFeedback("Sale", { id: "1", status: "FAILED" });
  assert.equal(failed.level, "warning");
  assert.match(failed.text, /^Sale completed/);
  assert.match(failed.text, /processing failed/i);
});
