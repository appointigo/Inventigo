import assert from "node:assert/strict";
import test from "node:test";
import { buildWhatsAppSetupMilestones } from "../setupMilestones.ts";

test("reports every onboarding milestone from persisted and server-derived evidence", () => {
  const milestones = buildWhatsAppSetupMilestones({
    integrationState: "CONNECTED",
    businessAccounts: [{ status: "ACTIVE", phoneNumbers: [{ status: "ACTIVE" }] }],
    templateStatuses: ["APPROVED"],
    readiness: "READY",
  });
  assert.deepEqual(milestones.map(milestone => milestone.key), ["authorization", "waba", "phone", "webhook", "registration", "template", "readiness"]);
  assert.equal(milestones.every(milestone => milestone.complete), true);
});

test("does not claim webhook, registration, template, or send readiness from partial setup", () => {
  const milestones = buildWhatsAppSetupMilestones({
    integrationState: "ACTION_REQUIRED",
    businessAccounts: [{ status: "ACTIVE", phoneNumbers: [{ status: "PENDING" }] }],
    templateStatuses: ["REJECTED"],
    readiness: "ACTION_REQUIRED",
  });
  assert.equal(milestones.find(milestone => milestone.key === "authorization")?.complete, true);
  assert.equal(milestones.find(milestone => milestone.key === "webhook")?.complete, false);
  assert.equal(milestones.find(milestone => milestone.key === "registration")?.complete, false);
  assert.equal(milestones.find(milestone => milestone.key === "template")?.state, "REJECTED");
  assert.equal(milestones.find(milestone => milestone.key === "readiness")?.complete, false);
});
