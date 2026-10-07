import { expect, test } from "@playwright/test";
import { apiFetch, expectJson } from "../helpers/business";

test("known defect: public demo requests reach validation and fail closed with delivery disabled", async ({ request }, testInfo) => {
  test.fail(true, "P1-006: the global route guard makes the public demo-request API require login");
  const invalid = await request.post("/api/demo-requests", { data: { fullName: "" } });
  const valid = await request.post("/api/demo-requests", {
    data: {
      fullName: "E2E Demo Lead",
      businessName: "E2E Business",
      mobile: "9990000777",
      email: "demo.lead@stockiva.invalid",
      city: "Pune",
      businessType: "Other retail",
      storeCount: "1",
      message: "No external email must be sent",
      website: "",
    },
  });
  await testInfo.attach("public-demo-request-auth-evidence.json", {
    body: Buffer.from(JSON.stringify({
      invalidStatus: invalid.status(),
      invalidBody: await invalid.json(),
      validStatus: valid.status(),
      validBody: await valid.json(),
    }, null, 2)),
    contentType: "application/json",
  });
  expect(invalid.status()).toBe(400);
  expect(valid.status()).toBe(503);
  await expect(valid.json()).resolves.toMatchObject({ error: expect.stringContaining("not connected") });
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
