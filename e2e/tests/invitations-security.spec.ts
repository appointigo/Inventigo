import { expect, test } from "@playwright/test";
import { apiFetch, expectJson } from "../helpers/business";
import { E2E_IDS, e2eDb } from "../helpers/database";

test.describe.configure({ mode: "serial" });

test("invitation token is scoped, expiring and single-use without sending email", async ({ page }) => {
  const email = "e2e.invited.user@stockiva.invalid";
  const expiredToken = "e2e-expired-invitation-token";
  await e2eDb.user.deleteMany({ where: { email } });
  await e2eDb.invitation.deleteMany({ where: { OR: [{ email }, { token: expiredToken }] } });
  try {
    const created = await expectJson<{ inviteLink: string }>(
      await apiFetch(page, "/api/invitations", {
        method: "POST",
        data: { email, role: "STAFF", storeId: E2E_IDS.store },
      }),
      201,
    );
    const token = created.inviteLink.split("/").at(-1)!;
    const details = await expectJson<{ email: string; role: string; storeId: string }>(
      await apiFetch(page, `/api/invitations/${token}`),
      200,
    );
    expect(details).toMatchObject({ email, role: "STAFF", storeId: E2E_IDS.store });
    const accepted = await expectJson<{ userId: string }>(
      await apiFetch(page, `/api/invitations/${token}`, {
        method: "POST",
        data: { name: "E2E Invited User", password: process.env.E2E_USER_PASSWORD },
      }),
      200,
    );
    expect(await e2eDb.user.findUniqueOrThrow({ where: { id: accepted.userId } })).toMatchObject({
      email,
      role: "STAFF",
      orgId: E2E_IDS.organization,
      storeId: E2E_IDS.store,
    });
    await expectJson(
      await apiFetch(page, `/api/invitations/${token}`, {
        method: "POST",
        data: { name: "Retry", password: process.env.E2E_USER_PASSWORD },
      }),
      410,
    );

    await e2eDb.invitation.create({
      data: {
        orgId: E2E_IDS.organization,
        storeId: E2E_IDS.store,
        email: "e2e.expired@stockiva.invalid",
        role: "STAFF",
        invitedBy: E2E_IDS.user,
        token: expiredToken,
        expiresAt: new Date("2020-01-01T00:00:00.000Z"),
      },
    });
    await expectJson(await apiFetch(page, `/api/invitations/${expiredToken}`), 410);
    expect((await e2eDb.invitation.findUniqueOrThrow({ where: { token: expiredToken } })).status).toBe("EXPIRED");
  } finally {
    await e2eDb.user.deleteMany({ where: { email } });
    await e2eDb.invitation.deleteMany({ where: { OR: [{ email }, { token: expiredToken }] } });
  }
});

test("only a same-tenant owner or admin can revoke an organization invitation", async ({ browser, page }, testInfo) => {
  const email = "e2e.revoke.attack@stockiva.invalid";
  await e2eDb.invitation.deleteMany({ where: { email } });
  const created = await expectJson<{ inviteLink: string }>(
    await apiFetch(page, "/api/invitations", {
      method: "POST",
      data: { email, role: "STAFF", storeId: E2E_IDS.store },
    }),
    201,
  );
  const token = created.inviteLink.split("/").at(-1)!;
  const invitation = await e2eDb.invitation.findUniqueOrThrow({ where: { token } });
  const foreign = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const foreignPage = await foreign.newPage();
  const staff = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const staffPage = await staff.newPage();
  try {
    await foreignPage.goto("/login");
    await foreignPage.getByPlaceholder("Email address").fill("e2e.foreign.owner@stockiva.invalid");
    await foreignPage.getByPlaceholder("Password").fill(process.env.E2E_USER_PASSWORD!);
    await foreignPage.locator("form").getByRole("button", { name: "Sign In", exact: true }).click();
    await expect(foreignPage).toHaveURL(/\/dashboard/);
    const response = await apiFetch(foreignPage, `/api/invitations/${invitation.id}`, { method: "DELETE" });
    const persistedAfterAttack = await e2eDb.invitation.findUnique({ where: { id: invitation.id } });
    await testInfo.attach("cross-tenant-invitation-revoke-evidence.json", {
      body: Buffer.from(JSON.stringify({
        invitationId: invitation.id,
        organizationId: invitation.orgId,
        attackingOrganizationId: E2E_IDS.foreignOrganization,
        responseStatus: response.status,
        response: response.body,
        persistedAfterAttack,
      }, null, 2)),
      contentType: "application/json",
    });
    expect([403, 404]).toContain(response.status);
    expect(persistedAfterAttack).not.toBeNull();

    await staffPage.goto("/login");
    await staffPage.getByPlaceholder("Email address").fill("e2e.staff@stockiva.invalid");
    await staffPage.getByPlaceholder("Password").fill(process.env.E2E_USER_PASSWORD!);
    await staffPage.locator("form").getByRole("button", { name: "Sign In", exact: true }).click();
    await expect(staffPage).toHaveURL(/\/dashboard/);
    await expectJson(
      await apiFetch(staffPage, `/api/invitations/${invitation.id}`, { method: "DELETE" }),
      403,
    );
    expect(await e2eDb.invitation.findUnique({ where: { id: invitation.id } })).not.toBeNull();

    await expectJson(
      await apiFetch(page, `/api/invitations/${invitation.id}`, { method: "DELETE" }),
      200,
    );
    expect(await e2eDb.invitation.findUnique({ where: { id: invitation.id } })).toBeNull();
  } finally {
    await foreign.close();
    await staff.close();
    await e2eDb.invitation.deleteMany({ where: { email } });
  }
});
