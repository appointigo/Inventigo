import { expect, test } from "@playwright/test";
import { readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { apiFetch, expectJson } from "../helpers/business";

test.describe.configure({ mode: "serial" });

const capturePath = path.resolve("e2e/test-results/demo-request-deliveries.jsonl");
const lead = {
  fullName: "E2E Demo Lead",
  businessName: "E2E Business",
  mobile: "9990000777",
  email: "demo.lead@stockiva.invalid",
  city: "Pune",
  businessType: "Other retail",
  storeCount: "1",
  message: "No external email must be sent",
  website: "",
};

type CapturedDelivery = {
  attempt: number;
  outcome: "success" | "failure";
  lead: typeof lead;
  delivery: {
    from: string;
    to: string[];
    reply_to: string;
    subject: string;
    text: string;
  };
};

const capturedDeliveries = (): CapturedDelivery[] => {
  try {
    return readFileSync(capturePath, "utf8")
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line) as CapturedDelivery);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
};

test.beforeAll(() => {
  rmSync(capturePath, { force: true });
});

test("anonymous invalid demo request creates no delivery attempt", async ({ request }) => {
  const response = await request.post("/api/demo-requests", { data: { fullName: "" } });
  expect(response.status()).toBe(400);
  expect(capturedDeliveries()).toHaveLength(0);
});

test("anonymous valid demo request is captured once and accepted", async ({ request }, testInfo) => {
  const response = await request.post("/api/demo-requests", { data: lead });
  const body = await response.json();
  const captured = capturedDeliveries();
  await testInfo.attach("public-demo-request-auth-evidence.json", {
    body: Buffer.from(JSON.stringify({
      status: response.status(),
      body,
      captured,
    }, null, 2)),
    contentType: "application/json",
  });
  expect(response.status()).toBe(202);
  expect(body).toEqual({ accepted: true });
  expect(captured).toHaveLength(1);
  expect(captured[0]).toMatchObject({
    attempt: 1,
    outcome: "success",
    lead,
    delivery: {
      from: "stockiva-e2e-sender@stockiva.invalid",
      to: ["stockiva-e2e-recipient@stockiva.invalid"],
      reply_to: lead.email,
      subject: `Stockiva demo request — ${lead.businessName}`,
    },
  });
  expect(captured[0].delivery.text).toContain(`Name: ${lead.fullName}`);
  expect(captured[0].delivery.text).toContain(`Business: ${lead.businessName}`);
  expect(captured[0].delivery.text).toContain(`Mobile: ${lead.mobile}`);
  expect(captured[0].delivery.text).toContain(`Email: ${lead.email}`);
  expect(captured[0].delivery.text).toContain(`Message: ${lead.message}`);

  const protectedResponse = await request.get("/api/finance/summary");
  expect(protectedResponse.status()).toBe(401);
});

test("anonymous valid demo request fails closed when the test adapter rejects delivery", async ({ request }) => {
  const response = await request.post("/api/demo-requests", {
    data: { ...lead, email: "demo.failure@stockiva.invalid" },
  });
  const body = await response.json() as { error?: string };
  const captured = capturedDeliveries();
  expect(response.status()).toBe(502);
  expect(body.error).toBe("We couldn’t send your request. Please try again later.");
  expect(body).not.toHaveProperty("stack");
  expect(captured).toHaveLength(2);
  expect(captured[1]).toMatchObject({
    attempt: 2,
    outcome: "failure",
    lead: { email: "demo.failure@stockiva.invalid" },
  });
});

test("Google OAuth provider is absent when external credentials are disabled", async ({ request }) => {
  const response = await request.get("/api/auth/providers");
  expect(response.status()).toBe(200);
  const providers = await response.json() as Record<string, unknown>;
  expect(Object.keys(providers)).toContain("credentials");
  expect(Object.keys(providers)).not.toContain("google");
});

test("blob upload rejects anonymous access and fails closed without provider credentials", async ({ browser, page }) => {
  const anonymous = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  try {
    const unauthorized = await anonymous.request.post(`${process.env.E2E_BASE_URL}/api/upload`, {
      data: { type: "blob.generate-client-token", payload: {} },
    });
    expect(unauthorized.status()).toBe(401);
  } finally {
    await anonymous.close();
  }

  const response = await apiFetch(page, "/api/upload", {
    method: "POST",
    data: { type: "blob.generate-client-token", payload: {} },
  });
  expect(response.status).toBe(400);
  const body = response.body as { error?: string };
  expect(body.error).toBeTruthy();
  await expectJson(await apiFetch(page, "/api/upload", { method: "POST", data: {} }), 400);
});
