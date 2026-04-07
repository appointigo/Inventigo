# Bug Fixes & Issue Resolution Log

---

## 1. Category Page — 500 Error on Create

### Issue
Creating a new category returned a 500 Internal Server Error. The API gave no useful error message in the response or server logs.

### Root Cause
Two separate problems combined:
1. **Stale Prisma Client** — The Prisma schema had been updated (new fields added) but `prisma generate` had not been re-run. Turbopack was serving a cached, outdated Prisma client bundle from `.next/`.
2. **Non-atomic category update** — `categoryService.update()` was running a loop of individual DB operations without a transaction, which could leave data in a partially-updated state. A failure mid-loop left no useful error surfaced to the API layer.
3. **Silent catch block** — The POST `/api/categories` route caught errors but never logged them (`catch { }` with no `console.error`), making it impossible to see the actual failure.

### Solution
- Ran `npx prisma generate` and cleared `.next/` cache to rebuild with the correct Prisma client.
- Wrapped `categoryService.update()` in `prisma.$transaction()` to make all writes atomic.
- Added `console.error("[categories POST]", err)` to the catch block so errors surface in the dev server terminal.

---

## 2. Product Page — 500 Error on Create & Deprecated Ant Design APIs

### Issue A — Product creation returning 500
Adding a new product via the form returned `{"error": "Internal server error"}` with no further detail.

### Root Cause A
The POST `/api/products` route had a bare `catch { }` block with no logging, so the actual Prisma/DB error was invisible. The root cause was the same stale Prisma client issue (schema had `variantSku String?` and `reorderLevel` added to `StockEntry` by a collaborator's commit, but the client wasn't regenerated).

### Solution A
- Added `console.error("[products POST]", err)` to the route's catch block.
- Ensured `prisma generate` was run after schema changes.

---

### Issue B — Deprecated Ant Design component APIs (warnings in console)
A collaborator's commit (`b82aa20`) rewrote `ProductForm.tsx` using APIs that were marked deprecated in the current version of Ant Design:
- `dropdownRender` on `<Select>` → should use `popupRender`
- `addonAfter` on `<Input>` → should use `<Space.Compact>`
- Inline "Create New Brand" and "Create New Category" buttons inside dropdowns (user requested removal)

### Root Cause B
The collaborator used older Ant Design patterns without checking the current API docs.

### Solution B
- **Brand & Category Select**: Removed `dropdownRender` and its buttons entirely. The selects now render their options cleanly with no deprecated prop.
- **Barcode Input**: Replaced `addonAfter={<BarcodeOutlined />}` with `<Space.Compact>` wrapping a plain `<Input>` alongside a `<Button icon={<BarcodeOutlined />}>`.
- Removed dead code: `CreateCategoryModal`, `CreateBrandModal`, `COMMON_SIZES`, and modal-related state variables (`showCatModal`, `showBrandModal`, `extraCategories`, `extraBrands`).
- Cleaned up imports: removed `Modal` and `PlusOutlined`.

---

## 3. Barcode Generation & Variant SKU

### Issue
The app generates per-size barcodes (variant SKUs) in the format `{PRODUCT-SKU}-{SIZE}` (e.g. `NK-TS-506-M`). However:
- Searching by variant barcode on the **Stock Management** page returned no results.
- Searching by variant barcode on the **Billing** page returned no results.

### Root Cause
Both search implementations only matched against `product.name` and `product.sku`. They had no awareness of the `variantSku` field stored on individual `StockEntry` records.

- `stockService.getStockLevels()` — built its `where` clause on the nested `product` relation only.
- `productService.list()` — similarly only checked `name` and `sku` on the product table.

### Solution
- **`stockService.getStockLevels()`** — Changed the `search` filter to use a top-level `OR` on `StockEntry`:
  ```ts
  where.OR = [
    { variantSku: { contains: search, mode: "insensitive" } },
    { product: { OR: [{ name: ... }, { sku: ... }] } },
  ];
  ```
- **`productService.list()`** — Extended the `OR` filter:
  ```ts
  { stockEntries: { some: { variantSku: { contains: search, mode: "insensitive" } } } }
  ```
- **Billing page** — Added a `useEffect` that auto-selects the matching size when the search term exactly equals a `variantSku`. The Size column renders a static, non-editable blue tag (e.g. `M`) instead of a dropdown when a variant match is found.

---

## 4. Stock & Billing — Inventory Not Updating on Sale

### Issue A — Stock not decremented correctly
The billing `createSale` function decremented stock using `updateMany` with no pre-check. This meant:
- Negative stock was possible (no guard against selling more than available).
- No `StockMovement` audit record was created, so the Movement History tab showed nothing for sales.

### Root Cause A
`billingService.createSale()` used a raw `tx.stockEntry.updateMany({ data: { quantity: { decrement: n } } })` — no availability check, no audit trail.

### Solution A
Replaced the naive decrement with a robust per-item flow inside the transaction:
1. **Fetch** the `StockEntry` for the product+size+store combination.
2. **Guard** — throw `Insufficient stock` if available quantity < requested quantity.
3. **Decrement** using `tx.stockEntry.update()` (specific record, not `updateMany`).
4. **Audit** — create a `StockMovement` record with `type: "SALE"`, linked to the sale via `referenceType: "SALE"` and `referenceId: sale.id`.

---

### Issue B — Refund not creating audit records
`billingService.refundSale()` restored stock with `updateMany` but also created no `StockMovement` records, leaving refunds invisible in movement history.

### Solution B
Added `tx.stockMovement.create()` with `type: "RETURN"` for each item inside the refund transaction, referencing the original sale.

---

### Issue C — Billing page Size column showed dropdown even for barcode scans
When a user searched by variant barcode (e.g. `NK-TS-506-M`), the product appeared but the Size column still showed an empty dropdown, requiring manual selection.

### Root Cause C
The Size column always rendered a `<Select>` regardless of whether the search had already identified a specific variant.

### Solution C
Added `getVariantMatch(product)` — a function that checks whether the current search exactly matches any `variantSku` in the product's stock. When matched:
- Size column renders a non-editable `<Tag>` showing just the size label (e.g. `M`).
- Stock column shows that specific size's quantity (e.g. `20`) instead of the total across all sizes.
- `handleAddToCart` uses the matched size directly without requiring dropdown selection.

---

### Issue D — Attribute columns missing from Billing table
The Billing product table had no visibility into product attributes (Color, Pattern, Sleeves, etc.).

### Solution D
Added dynamic attribute columns derived at runtime from the loaded product list:
```ts
const attributeKeys = useMemo(() => {
  const keys = new Set<string>();
  for (const p of products) {
    Object.keys(p.attributes)
      .filter((k) => k !== "unit" && k !== "supplierId")
      .forEach((k) => keys.add(k));
  }
  return [...keys];
}, [products]);
```
Each key becomes a column with a capitalised header and `—` for products that don't define that attribute.

---

## 5. Onboarding → Dashboard Redirect Failing After Business Setup

### Issue
After completing the business setup form on `/onboarding`, the user was redirected back to `/onboarding` instead of landing on `/dashboard`. The business was being created successfully in the database (confirmed by logging out and back in, which opened the dashboard correctly), so the problem was entirely in the session state after onboarding.

### Root Cause
**NextAuth v5 beta.30 `update()` does not reliably trigger a DB re-read via `trigger: "update"`.**

The JWT callback included a DB re-read block guarded by `trigger === "update"`, but the call to `update()` (with no arguments) in NextAuth v5 beta issues only a GET to `/api/auth/session` rather than a PATCH — the JWT callback's `trigger` was never set to `"update"`, so the DB re-read was silently skipped and the stale token (with `orgId: null`) was returned unchanged.

This caused the following chain of failure:
1. `register-business` API wrote `orgId`/`storeId` to the DB ✅
2. `await updateSession()` (no args) fired — JWT callback ran but `trigger` was not `"update"` in all cases, returning the old token with `orgId: null`
3. `router.push("/dashboard")` navigated to the dashboard
4. `dashboard/layout.tsx` read the session — `orgId` was still `null`
5. Layout called `update()` once (one-shot guard), got the same stale token back
6. Redirected user to `/onboarding` ❌

A secondary issue: the layout's `update()` call was fire-and-forget (not awaited), so even if the refresh succeeded, the redirect to `/onboarding` could fire before the session state updated.

### Fix

**`src/lib/auth.ts` — JWT callback** now handles `update(data)` with explicit values directly from the `session` param, bypassing the DB round-trip:
```ts
async jwt({ token, user, account, trigger, session }) {
  if (trigger === "update") {
    const payload = session as { orgId?: string | null; storeId?: string | null; role?: string; ... };
    if (payload?.orgId) {
      // Apply values passed directly via updateSession(data) — no DB race
      token.orgId = payload.orgId;
      token.storeId = payload.storeId ?? token.storeId;
      token.role = payload.role ?? token.role;
    } else {
      // Bare update() call — fall back to DB re-read
      const fresh = await prisma.user.findUnique(...);
      if (fresh) { token.orgId = fresh.orgId; ... }
    }
  }
}
```

**`src/app/(auth)/onboarding/page.tsx`** — passes the server-returned `orgId`/`storeId` directly into `updateSession()` so the JWT callback receives them immediately under `trigger: "update"`:
```ts
const data = await res.json(); // { orgId, storeId } from register-business API
await updateSession({ orgId: data.orgId, storeId: data.storeId, role: "OWNER" });
router.push("/dashboard");
```

**`src/app/(dashboard)/layout.tsx`** — the `update()` call is now awaited inside a `.then()` handler, so the redirect to `/onboarding` only fires if the DB-refreshed session genuinely has no `orgId`:
```ts
void update().then((updated) => {
  if (!updated?.user?.orgId) router.replace("/onboarding");
});
```
