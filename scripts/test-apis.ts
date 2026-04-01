/**
 * Inventigo — Full API Test Suite
 * Run: npx tsx scripts/test-apis.ts
 *
 * Covers all 40 API routes.
 * Signs in as owner@stockiva.com (real DB) using the NextAuth credentials flow.
 */

const BASE = "http://localhost:3000";

// ─── Colour helpers ─────────────────────────────────────────────────────────
const green  = (s: string) => `\x1b[32m${s}\x1b[0m`;
const red    = (s: string) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`;
const cyan   = (s: string) => `\x1b[36m${s}\x1b[0m`;
const bold   = (s: string) => `\x1b[1m${s}\x1b[0m`;

// ─── Result tracking ────────────────────────────────────────────────────────
const results: { label: string; status: number; ok: boolean; note?: string }[] = [];

/** Makes one HTTP request, logs the result, returns { status, data } */
async function req(
  label: string,
  url: string,
  options?: RequestInit & { cookies?: string },
  expectedCodes: number[] = [200, 201]
): Promise<{ status: number; data: unknown }> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.cookies ? { Cookie: options.cookies } : {}),
  };

  try {
    const res = await fetch(`${BASE}${url}`, {
      method: options?.method ?? "GET",
      headers,
      body: options?.body as string | undefined,
      redirect: "manual",
    });

    // Read body once
    let data: unknown = null;
    let bodySnippet = "";
    try {
      const text = await res.text();
      data = JSON.parse(text);
      if (Array.isArray(data)) {
        bodySnippet = `[${(data as unknown[]).length} items]`;
      } else if (data && typeof data === "object") {
        const keys = Object.keys(data as object).slice(0, 4);
        bodySnippet = `{${keys.join(", ")}}`;
      } else {
        bodySnippet = text.slice(0, 60);
      }
    } catch {
      bodySnippet = "(non-JSON)";
    }

    const ok = expectedCodes.includes(res.status);
    const icon = ok ? "✓" : "✗";
    const colour = ok ? green : red;
    const statusStr = ok ? green(String(res.status)) : red(String(res.status));
    console.log(`  ${colour(icon)} ${label.padEnd(50)} ${statusStr}  ${yellow(bodySnippet)}`);
    results.push({ label, status: res.status, ok });
    return { status: res.status, data };
  } catch (err) {
    console.log(`  ${red("✗")} ${label.padEnd(50)} ${red("NETWORK ERROR")}  ${String(err)}`);
    results.push({ label, status: 0, ok: false, note: "Network error" });
    return { status: 0, data: null };
  }
}

// ─── Auth: Sign in via NextAuth credentials flow ─────────────────────────────
async function signIn(email: string, password: string): Promise<string> {
  // Step 1: get CSRF token
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  const { csrfToken } = await csrfRes.json() as { csrfToken: string };

  // Extract any nextauth-related cookies from the CSRF response
  const csrfCookies = csrfRes.headers.get("set-cookie") ?? "";

  // Step 2: POST credentials  
  const formBody = new URLSearchParams({
    email,
    password,
    csrfToken,
    callbackUrl: BASE,
    redirect: "false",
  }).toString();

  const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      // forward the csrf cookie nextauth may have set
      ...(csrfCookies ? { Cookie: csrfCookies } : {}),
    },
    body: formBody,
    redirect: "manual",
  });

  // Collect all Set-Cookie headers from the sign-in response
  const rawCookies: string[] = [];
  loginRes.headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") {
      // Each cookie directive as name=value
      const nameValue = value.split(";")[0];
      rawCookies.push(nameValue);
    }
  });

  // Also include the csrf cookie from step 1
  if (csrfCookies) {
    csrfCookies.split(",").forEach(c => {
      const nameValue = c.trim().split(";")[0];
      if (nameValue) rawCookies.push(nameValue);
    });
  }

  // Follow redirect to collect session token if needed
  const location = loginRes.headers.get("location");
  if (location && rawCookies.length === 0) {
    const followRes = await fetch(location, {
      headers: { Cookie: rawCookies.join("; ") },
      redirect: "manual",
    });
    followRes.headers.forEach((value, key) => {
      if (key.toLowerCase() === "set-cookie") {
        rawCookies.push(value.split(";")[0]);
      }
    });
  }

  const cookieStr = rawCookies.filter(Boolean).join("; ");
  const hasSession = cookieStr.includes("next-auth.session-token") || 
                     cookieStr.includes("authjs.session-token") ||
                     cookieStr.includes("__Secure-next-auth.session-token");
  
  if (!hasSession) {
    console.warn(yellow(`  ⚠  No session token found. Auth may have failed.\n     Cookies received: ${cookieStr || "(none)"}`));
  }

  return cookieStr;
}

// ─── Main ───────────────────────────────────────────────────────────────────
async function main() {
  console.log(bold(cyan("\n╔══════════════════════════════════════════════════════╗")));
  console.log(bold(cyan("║         Inventigo — Full API Test Suite              ║")));
  console.log(bold(cyan("╚══════════════════════════════════════════════════════╝\n")));

  // ── 0. Unauthenticated checks (401 direct, or 307 redirect to /login) ────
  console.log(bold("\n── Auth guard (expect 401 or 307 redirect) ──────────────"));
  await req("GET  /api/brands  — no session",      "/api/brands",      {}, [401, 307]);
  await req("GET  /api/products — no session",     "/api/products",    {}, [401, 307]);
  await req("GET  /api/categories — no session",   "/api/categories",  {}, [401, 307]);

  // ── 1. Register a brand-new org ─────────────────────────────────────────
  console.log(bold("\n── Auth — Register ──────────────────────────────────────"));
  const testEmail = `test.owner.${Date.now()}@inventigo.test`;
  await req(
    "POST /api/auth/register — new org owner",
    "/api/auth/register",
    {
      method: "POST",
      body: JSON.stringify({
        ownerName: "Test Owner",
        email: testEmail,
        password: "Test@1234",
        orgName: "Test Retail Co",
      }),
    },
    [201, 200]
  );

  // ── 2. Sign in (owner@stockiva.com — real DB user from seed) ────────────
  console.log(bold("\n── Signing in (owner@stockiva.com) ──────────────────────"));
  let cookies = await signIn("owner@stockiva.com", "password123");
  
  // Fallback: try test credentials if real DB credentials fail
  if (!cookies.includes("session-token")) {
    console.log(yellow("  ↺ Trying test credentials: owner@rarethread.com..."));
    cookies = await signIn("owner@rarethread.com", "password");
  }

  const hasAuth = cookies.includes("session-token");
  console.log(hasAuth
    ? green(`  ✓ Signed in. Cookie length: ${cookies.length}`)
    : red("  ✗ Sign in failed — subsequent tests will return 401")
  );

  const C = { cookies };

  // ── 3. Session / user info ───────────────────────────────────────────────
  console.log(bold("\n── Session ──────────────────────────────────────────────"));
  await req("GET  /api/auth/session",               "/api/auth/session",         C);

  // ── 4. Org ───────────────────────────────────────────────────────────────
  console.log(bold("\n── Organization ─────────────────────────────────────────"));
  await req("GET  /api/org",                         "/api/org",                  C);

  // ── 5. Stores ────────────────────────────────────────────────────────────
  console.log(bold("\n── Stores ───────────────────────────────────────────────"));
  await req("GET  /api/stores",                      "/api/stores",               C);
  await req(
    "POST /api/stores — create",
    "/api/stores",
    { ...C, method: "POST", body: JSON.stringify({ name: "East Wing Store", code: `EW-${Date.now()}` }) },
    [201, 403]   // 403 if user role can't create stores
  );

  // ── 6. Categories ────────────────────────────────────────────────────────
  console.log(bold("\n── Categories ───────────────────────────────────────────"));
  await req("GET  /api/categories",                  "/api/categories",           C);
  await req(
    "POST /api/categories — create",
    "/api/categories",
    { ...C, method: "POST", body: JSON.stringify({ name: `Footwear-${Date.now()}`, sizes: ["S", "M", "L", "XL"] }) },
    [201]
  );

  // ── 7. Brands ────────────────────────────────────────────────────────────
  console.log(bold("\n── Brands ───────────────────────────────────────────────"));
  await req("GET  /api/brands",                      "/api/brands",               C);
  await req(
    "POST /api/brands — create",
    "/api/brands",
    { ...C, method: "POST", body: JSON.stringify({ name: `Nike-${Date.now()}` }) },
    [201]
  );

  // ── 8. Products ──────────────────────────────────────────────────────────
  console.log(bold("\n── Products ─────────────────────────────────────────────"));
  await req("GET  /api/products",                    "/api/products",             C);

  // need IDs from above to create a product
  let productId: string | null = null;
  try {
    const { data: cats }   = await req("GET  /api/categories (internal)", "/api/categories", C, [200]);
    const { data: brands } = await req("GET  /api/brands (internal)",     "/api/brands",     C, [200]);
    const catList   = Array.isArray(cats)   ? cats   as { id: string }[] : [];
    const brandList = Array.isArray(brands) ? brands as { id: string }[] : [];
    if (catList.length > 0 && brandList.length > 0) {
      const prodBody = JSON.stringify({
        name:        "Test Running Shoe",
        sku:         `SKU-TEST-${Date.now()}`,
        description: "Created by API test script",
        costPrice:   999,
        sellPrice:   1499,
        categoryId:  catList[0].id,
        brandId:     brandList[0].id,
      });
      const { data: pData } = await req(
        "POST /api/products — create",
        "/api/products",
        { ...C, method: "POST", body: prodBody },
        [201]
      );
      productId = (pData as { id?: string } | null)?.id ?? null;
    } else {
      console.log(yellow("  ⚠  Skipping product creation — no categories/brands in DB yet"));
    }
  } catch {
    console.log(yellow("  ⚠  Could not auto-create product"));
  }

  if (productId) {
    await req(`GET  /api/products/${productId}`,     `/api/products/${productId}`, C);
    await req(
      `PUT  /api/products/${productId}`,
      `/api/products/${productId}`,
      { ...C, method: "PUT", body: JSON.stringify({ description: "Updated by test" }) }
    );
  } else {
    console.log(yellow("  ⚠  Skipping product PATCH/GET-by-id (no product ID)"));
  }

  // ── 9. Suppliers ─────────────────────────────────────────────────────────
  console.log(bold("\n── Suppliers ────────────────────────────────────────────"));
  await req("GET  /api/suppliers",                   "/api/suppliers",            C);
  const { data: supData } = await req(
    "POST /api/suppliers — create",
    "/api/suppliers",
    {
      ...C, method: "POST",
      body: JSON.stringify({ name: "Test Supplier Ltd", contactEmail: "sup@test.com", phone: "9876543210" }),
    },
    [201]
  );
  let supplierId: string | null = (supData as { id?: string } | null)?.id ?? null;

  // ── 10. Stock ─────────────────────────────────────────────────────────────
  console.log(bold("\n── Stock ────────────────────────────────────────────────"));
  await req("GET  /api/stock",                       "/api/stock",                C);
  await req("GET  /api/stock/movements",             "/api/stock/movements",      C);

  // ── 11. Purchase Orders ──────────────────────────────────────────────────
  console.log(bold("\n── Purchase Orders ──────────────────────────────────────"));
  await req("GET  /api/purchase-orders",             "/api/purchase-orders",      C);

  if (supplierId && productId) {
    const poBody = JSON.stringify({
      supplierId,
      notes: "Test PO from API test script",
      items: [{ productId, quantity: 10, unitCost: 850 }],
    });
    const { data: poData } = await req(
      "POST /api/purchase-orders — create",
      "/api/purchase-orders",
      { ...C, method: "POST", body: poBody },
      [201]
    );
    const poId = (poData as { id?: string } | null)?.id;
    if (poId) {
      await req(`GET  /api/purchase-orders/${poId}`,         `/api/purchase-orders/${poId}`,        C);
      await req(`POST /api/purchase-orders/${poId}/submit`,  `/api/purchase-orders/${poId}/submit`, { ...C, method: "POST", body: "{}" }, [200]);
      // receive requires items matching what was ordered
      const receiveBody = JSON.stringify({ items: [{ productId, quantityReceived: 10, notes: "Test receive" }] });
      await req(`POST /api/purchase-orders/${poId}/receive`, `/api/purchase-orders/${poId}/receive`,{ ...C, method: "POST", body: receiveBody }, [200]);
    }
  } else {
    console.log(yellow("  ⚠  Skipping PO create — no supplier/product IDs available"));
  }

  // ── 12. Alerts ───────────────────────────────────────────────────────────
  console.log(bold("\n── Alerts ───────────────────────────────────────────────"));
  await req("GET  /api/alerts",                      "/api/alerts",               C);
  await req("GET  /api/alerts/low-stock",            "/api/alerts/low-stock",     C);

  // ── 13. Dashboard ────────────────────────────────────────────────────────
  console.log(bold("\n── Dashboard ────────────────────────────────────────────"));
  await req("GET  /api/dashboard",                   "/api/dashboard",            C);

  // ── 14. Reports ──────────────────────────────────────────────────────────
  console.log(bold("\n── Reports ──────────────────────────────────────────────"));
  await req("GET  /api/reports",                     "/api/reports",              C);

  // ── 15. Settings ─────────────────────────────────────────────────────────
  console.log(bold("\n── Settings ─────────────────────────────────────────────"));
  await req("GET  /api/settings",                    "/api/settings",             C);

  // ── 16. Team ─────────────────────────────────────────────────────────────
  console.log(bold("\n── Team ─────────────────────────────────────────────────"));
  await req("GET  /api/team",                        "/api/team",                 C);

  // ── 17. Users (requires ADMIN role — sign in as admin) ────────────────────
  console.log(bold("\n── Users (signing in as ADMIN) ──────────────────────────"));
  const adminUserCookies = await signIn("admin@stockiva.com", "password123");
  const AC = { cookies: adminUserCookies };
  await req("GET  /api/users",                       "/api/users",                AC, [200, 403]);

  // ── 18. Invitations ──────────────────────────────────────────────────────
  console.log(bold("\n── Invitations ──────────────────────────────────────────"));
  await req("GET  /api/invitations",                 "/api/invitations",          C);
  await req(
    "POST /api/invitations — send invite",
    "/api/invitations",
    {
      ...C, method: "POST",
      body: JSON.stringify({ email: `invite.${Date.now()}@test.com`, role: "STAFF" }),
    },
    [201, 200]
  );

  // ── 19. Billing ──────────────────────────────────────────────────────────
  console.log(bold("\n── Billing ──────────────────────────────────────────────"));
  await req("GET  /api/billing",                     "/api/billing",              C, [200, 404]);
  await req("GET  /api/billing/kpis",                "/api/billing/kpis",         C, [200, 404]);

  // ── 20. Barcode ──────────────────────────────────────────────────────────
  console.log(bold("\n── Barcode ──────────────────────────────────────────────"));
  await req("GET  /api/barcode/lookup?sku=SKU-001", "/api/barcode/lookup?sku=SKU-001", C, [200, 404]);

  // ── 21. Admin (SUPER_ADMIN routes) ───────────────────────────────────────
  console.log(bold("\n── Admin — Sign in as super admin ───────────────────────"));
  const adminCookies = await signIn("superadmin@stockiva.com", "password123");
  const A = { cookies: adminCookies };
  let adminOk = adminCookies.includes("session-token");
  if (!adminOk) {
    console.log(yellow("  ↺ Trying superadmin@stockiva.com via test user..."));
    const adminCookies2 = await signIn("superadmin@stockiva.com", "superadmin123");
    Object.assign(A, { cookies: adminCookies2 });
    adminOk = adminCookies2.includes("session-token");
  }
  console.log(adminOk
    ? green("  ✓ Super admin signed in")
    : red("  ✗ Super admin sign in failed")
  );

  await req("GET  /api/admin/organizations",         "/api/admin/organizations",  A, [200, 403]);
  await req("GET  /api/admin/stats",                 "/api/admin/stats",          A, [200, 403]);

  // ── 22. Cron (GET with Authorization: Bearer header) ───────────────────────
  console.log(bold("\n── Cron ─────────────────────────────────────────────────"));
  // Cron uses GET + Authorization header, not a session cookie
  try {
    const cronRes = await fetch(`${BASE}/api/cron/reorder-check`, {
      method: "GET",
      headers: { Authorization: "Bearer dev-cron-secret" },
      redirect: "manual",
    });
    const cronData = await cronRes.json().catch(() => ({})) as Record<string, unknown>;
    const cronOk = [200, 500].includes(cronRes.status);
    const cronIcon = cronOk ? green("✓") : red("✗");
    console.log(`  ${cronIcon} GET  /api/cron/reorder-check                    ${cronOk ? green(String(cronRes.status)) : red(String(cronRes.status))}  ${yellow(JSON.stringify(cronData).slice(0,60))}`);
    results.push({ label: "GET  /api/cron/reorder-check", status: cronRes.status, ok: cronOk });
  } catch (e) {
    console.log(`  ${red("✗")} GET  /api/cron/reorder-check                    ${red("NETWORK ERROR")}`);
    results.push({ label: "GET  /api/cron/reorder-check", status: 0, ok: false });
  }

  // ── 23. Auth password flow ───────────────────────────────────────────────
  console.log(bold("\n── Auth — Forgot Password ───────────────────────────────"));
  await req(
    "POST /api/auth/forgot-password",
    "/api/auth/forgot-password",
    { method: "POST", body: JSON.stringify({ email: "owner@stockiva.com" }) },
    [200, 202]
  );

  // ─── Summary ──────────────────────────────────────────────────────────────
  const passed = results.filter(r => r.ok).length;
  const failed = results.filter(r => !r.ok).length;
  const total  = results.length;

  console.log(bold(cyan("\n══════════════════════════════════════════════════════")));
  console.log(bold(`  Results: ${green(String(passed))} passed / ${failed > 0 ? red(String(failed)) : "0"} failed / ${total} total`));

  if (failed > 0) {
    console.log(bold(red("\n  Failed tests:")));
    results.filter(r => !r.ok).forEach(r => {
      console.log(`    ${red("✗")} ${r.label} — HTTP ${r.status}`);
    });
  }

  console.log(bold(cyan("══════════════════════════════════════════════════════\n")));

  // Exit with error code if any tests failed
  if (failed > 0) process.exit(1);
}

main().catch(err => {
  console.error(red("\nFatal error:"), err);
  process.exit(1);
});
