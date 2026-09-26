import assert from "node:assert/strict";
import test from "node:test";
import { demoRequestSchema } from "./demoRequestSchema.ts";

const valid = {
  fullName: "Aman Verma",
  businessName: "Meadow Clothing",
  mobile: "+91 98765 43210",
  email: "aman@example.com",
  city: "Lucknow",
  businessType: "Clothing & Apparel",
  storeCount: "1",
  message: "Interested in billing and inventory.",
  website: "",
};

test("accepts a valid clothing-retailer demo request", () => {
  assert.equal(demoRequestSchema.safeParse(valid).success, true);
});

test("rejects invalid contact details and unsupported choices", () => {
  assert.equal(
    demoRequestSchema.safeParse({ ...valid, email: "bad", mobile: "12" }).success,
    false
  );
  assert.equal(demoRequestSchema.safeParse({ ...valid, storeCount: "unknown" }).success, false);
});

test("rejects the honeypot and oversized messages", () => {
  assert.equal(demoRequestSchema.safeParse({ ...valid, website: "bot.example" }).success, false);
  assert.equal(demoRequestSchema.safeParse({ ...valid, message: "x".repeat(1001) }).success, false);
});
