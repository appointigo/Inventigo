# Stockiva E2E defect register

Discovery date: 2026-10-07. Scope: non-WhatsApp workflows against the reset-only `stockiva_e2e` database. The register retains the original discovery-time reproduction evidence and labels it as such. Current remediation state: **all 12 defects are FIXED + VERIFIED**, and no defect regression uses `test.fail`.

## P0-001 — Sale retry duplicates the complete business transaction

- **Severity:** P0
- **Domain:** Billing / idempotency
- **Scenario:** Repeat the identical sale POST with the same `x-request-id` as a simulated network retry.
- **Preconditions:** Stock at least 2; new customer mobile; authenticated store owner.
- **Steps:** Capture sale/item/payment/ledger/movement/stock/customer values; POST the same payload twice with `x-request-id: e2e-identical-sale-retry`; recalculate all deltas.
- **Expected:** Both attempts resolve to one durable business result: 1 sale, 1 item, 1 payment, 1 financial transaction, 1 stock movement, stock −1, lifetime spend ₹1,000.
- **Original actual:** Both responses were 201. Deltas were 2 sales, 2 items, 2 payments, 2 ledger inflows, 2 stock movements, stock −2, lifetime spend ₹2,000.
- **DB evidence:** `duplicate-sale-db-evidence.json`; deterministic mobile `9990000801`.
- **Financial impact:** Duplicate revenue, cash, and customer lifetime spend.
- **Inventory impact:** Duplicate stock reduction; may falsely exhaust inventory.
- **Tenant/security impact:** None observed; mutation remains tenant-scoped.
- **Reproducibility:** 100% in repeated isolated runs.
- **Suspected root cause:** `x-request-id` is logged and returned but is not stored behind a unique idempotency key or replay-result record in sale creation.
- **Fix status:** FIXED 2026-10-07. Sale rows now persist a store-scoped idempotency key and canonical payload hash in the sale transaction. A tenant/store/key-scoped PostgreSQL advisory transaction lock serializes concurrent retries before pre-transaction preparation; committed retries replay the same sale, while payload mismatch returns HTTP 409. Forward migration `20261007130000_add_sale_idempotency` applies cleanly after the audited baseline with zero drift. The normal Playwright regression covers concurrent duplicates, sequential replay, conflict rejection, and one-only sale/item/payment/ledger/movement/stock/customer effects.

## P0-002 — Concurrent receivable collection over-collects one balance

- **Severity:** P0
- **Domain:** Receivables / concurrency
- **Scenario:** Two authenticated clients simultaneously collect ₹400 against the same ₹400 outstanding sale.
- **Preconditions:** ₹1,000 sale with ₹600 already paid and ₹400 due.
- **Steps:** Submit CASH ₹400 and UPI ₹400 concurrently, then read the sale, payments, and linked ledger rows.
- **Expected:** One 201 and one conflict/client rejection; final paid ₹1,000, due ₹0, two total payments including the original ₹600.
- **Original actual:** Both returned 201. Sale persisted `amountPaid=1400`, `amountDue=0`; payments were ₹600 + ₹400 + ₹400 and all three had ledger inflows.
- **DB evidence:** `receivable-concurrency-db-evidence.json`; deterministic mobile `9990000810`.
- **Financial impact:** Cash and collected receivables overstate reality by ₹400 per reproduced race.
- **Inventory impact:** None; stock is not changed by collection.
- **Tenant/security impact:** None observed.
- **Reproducibility:** 2/2 focused runs plus final consolidated run.
- **Suspected root cause:** Outstanding balance is validated from a stale pre-transaction read, then `amountPaid` is incremented without an atomic conditional update/row lock tied to remaining due.
- **Fix status:** FIXED 2026-10-07. Receivable settlement now first claims the outstanding amount with a tenant-scoped conditional `updateMany` inside the same transaction as payment and ledger creation. A losing concurrent request rolls back with a controlled 400 and cannot create a payment or inflow. The normal Playwright regression asserts one 201, one 400, paid ₹1,000, due ₹0, two total payments/ledger rows, and ₹1,000 collected.

## P0-003 — STAFF can bypass hidden Finance and Reports navigation

- **Severity:** P0
- **Domain:** Authorization / expenses / reports
- **Scenario:** A lower-privilege STAFF user calls APIs for modules hidden from that role in navigation.
- **Preconditions:** Authenticated seeded STAFF fixed to the primary store; Finance and Reports links absent.
- **Steps:** POST a valid ₹1 expense and GET the stock report directly.
- **Expected:** Both APIs return 403; no expense is persisted.
- **Original actual:** Expense POST returned 201 and report GET returned 200. The probe expense was captured, then removed by test cleanup to protect later reconciliation.
- **DB evidence:** `staff-authorization-evidence.json` records both responses and the created expense ID/body.
- **Financial impact:** A STAFF user can create approved expenses, changing profit and enabling later cash settlement.
- **Inventory impact:** Report read exposes same-tenant stock data beyond the configured UI role.
- **Tenant/security impact:** Vertical privilege escalation within the tenant; no cross-tenant access was observed.
- **Reproducibility:** 2/2 focused/full runs.
- **Suspected root cause:** Expense and report routes call `requireOrgAuth` and store scoping but do not enforce the `ADMIN_MANAGER` role used by navigation.
- **Fix status:** FIXED 2026-10-07.
- **Root cause:** Navigation used the OWNER/ADMIN/MANAGER role set, but expense and several report handlers only required tenant authentication; expense/report pages also had no server-side role boundary.
- **Production fix:** Centralized expense/report capabilities in `src/lib/rbac.ts`, applied them to every expense CRUD/budget/category/summary handler and report handler, and added server layouts that redirect unauthorized direct page access. Existing finance routes retain their equivalent centralized guard.
- **Regression test:** The normal tenancy/permissions regression proves STAFF UI absence, direct-page denial, expense GET/POST/PUT/DELETE 403 responses, report GET 403, persistence immutability, and successful equivalent OWNER and ADMIN operations. Existing foreign-tenant cases continue to prove tenant isolation.
- **Validation:** Focused Playwright 2/2 passed (setup + regression); `next typegen`, TypeScript, targeted ESLint, and `git diff --check` passed.

## P0-004 — Editing a settled expense breaks ledger reconciliation

- **Severity:** P0
- **Domain:** Expenses / ledger integrity
- **Scenario:** Settle a ₹300 expense, then edit its amount to ₹500.
- **Preconditions:** Approved expense with one completed ₹300 financial outflow.
- **Steps:** POST expense; settle it; PUT `{ amount: 500 }`; read expense with linked financial transaction.
- **Expected:** Mutation is rejected (the test expects 409) or the system performs an explicit correcting ledger workflow that preserves auditability.
- **Actual:** PUT returns 200. Expense amount becomes ₹500 while its immutable linked outflow remains ₹300 and payment status remains PAID.
- **DB evidence:** `paid-expense-edit-evidence.json`: expense ₹500, ledger ₹300, status PAID. Probe rows are removed after capture.
- **Financial impact:** Profit reports and cash ledger diverge by ₹200 in the reproduced case.
- **Inventory impact:** None.
- **Tenant/security impact:** Requires an authenticated user currently allowed to edit expenses; compounds P0-003 for STAFF.
- **Reproducibility:** 2/2 full runs.
- **Suspected root cause:** `expenseService.update` permits monetary edits regardless of `paymentStatus` and does not post a reversal/correction to `FinancialTransaction`.
- **Fix status:** FIXED 2026-10-07.
- **Root cause:** Expense updates and deletion ignored settlement state, while settlement copied the expense amount into an immutable ledger row without protecting that snapshot from a concurrent edit.
- **Production fix:** Paid expenses now reject amount, category, and business-date changes plus deletion with HTTP 409, while non-financial receipt metadata remains editable. Unpaid financial edits use a conditional write, and settlement atomically claims the unpaid row before re-reading the authoritative values posted to the ledger.
- **Files:** `src/modules/expenses/services/expenseService.ts`, `src/modules/finance/financeService.ts`, `src/app/api/expenses/[id]/route.ts`, `e2e/tests/expenses-finance.spec.ts`.
- **Migration:** None.
- **Regression:** Normal Playwright coverage proves unpaid financial edits succeed; paid amount/date edits and deletion fail; metadata edits succeed; persisted expense and ledger amounts remain equal.
- **Validation:** Focused Playwright 6/6, TypeScript, targeted ESLint, and `git diff --check` passed.

## P1-001 — Zero and negative expenses are accepted

- **Severity:** P1
- **Domain:** Expense validation
- **Scenario:** Create expenses for ₹0 and −₹0.01.
- **Preconditions:** Authenticated owner and valid store/category/date.
- **Steps:** POST both boundary amounts; query rows by deterministic note.
- **Expected:** Both return 400 and persist no rows.
- **Actual:** Both return 201 and two approved rows persist with amounts 0 and −0.01. Test removes the probe rows after evidence capture.
- **DB evidence:** `invalid-expense-boundary-evidence.json`.
- **Financial impact:** Negative expense can inflate net profit; zero expense creates meaningless accounting records.
- **Inventory impact:** None.
- **Tenant/security impact:** Same authorization implications as P0-003.
- **Reproducibility:** 2/2 full runs.
- **Suspected root cause:** Expense POST validates only presence (`amount == null`), while service/database enforce no positive-amount constraint.
- **Fix status:** FIXED 2026-10-07.
- **Root cause:** Expense creation checked only for a missing amount, and the shared service accepted zero, negative, non-numeric, and non-finite values.
- **Production fix:** The expense service now requires a finite numeric amount greater than zero for both creation and update; route handlers return a controlled HTTP 400.
- **Files:** `src/modules/expenses/services/expenseService.ts`, `src/app/api/expenses/route.ts`, `src/app/api/expenses/[id]/route.ts`, `e2e/tests/expenses-finance.spec.ts`.
- **Migration:** None.
- **Regression:** Normal Playwright coverage proves ₹0 and −₹0.01 both return 400 and persist no expense or ledger state.
- **Validation:** Focused Playwright 6/6, TypeScript, targeted ESLint, and `git diff --check` passed.

## P1-002 — Finance month boundary is UTC while analytics is IST

- **Severity:** P1
- **Domain:** Finance / analytics / date-time
- **Scenario:** Compare sales immediately before and after 00:00 IST at a month boundary.
- **Preconditions:** Current test month October 2026; explicit sales at `2026-09-30T18:29:00Z` (23:59 IST) and `18:31:00Z` (00:01 IST).
- **Steps:** Capture September 30 analytics, October 1 analytics, and current-month Finance inflow; create both sales; compare deltas.
- **Expected:** Analytics deltas are ₹1,000 on each respective IST day, and October Finance inflow increases ₹1,000 for the 00:01 IST sale.
- **Actual:** Analytics correctly reports +₹1,000 for September 30 and +₹1,000 for October 1; Finance October inflow delta is ₹0.
- **DB evidence:** `ist-month-boundary-evidence.json`.
- **Financial impact:** Beginning-of-month collections are omitted from the Finance monthly movement window, causing cross-screen cash inconsistency.
- **Inventory impact:** Stock still decrements correctly.
- **Tenant/security impact:** None.
- **Reproducibility:** 2/2 full runs.
- **Suspected root cause:** `financeService.summary` builds month boundaries with `Date.UTC`, while sales analytics uses the canonical +05:30 business-date helpers.
- **Fix status:** FIXED 2026-10-07.
- **Root cause:** Finance used UTC instant boundaries for a PostgreSQL DATE column, while sale-payment timestamps were implicitly truncated by the database instead of being converted to canonical IST business-date labels.
- **Production fix:** Shared date utilities now explicitly distinguish IST instant boundaries from UTC-midnight storage values for business-date labels. Sale payments normalize their ledger date through that contract, and Finance month/day windows use the same labels.
- **Files:** `src/modules/analytics/utils/dateRange.ts`, `src/modules/analytics/utils/dateRange.test.ts`, `src/modules/finance/financeService.ts`, `e2e/tests/date-boundaries.spec.ts`.
- **Migration:** None.
- **Regression:** Normal Playwright coverage proves 23:59 IST belongs to September and 00:01 IST to October in both analytics and Finance; unit coverage proves 23:59/00:00/00:01 at a year boundary.
- **Validation:** Focused Playwright 2/2, date-range unit tests 6/6, TypeScript, targeted ESLint, and `git diff --check` passed.

## P1-003 — Alphanumeric customer name search broadens into phone search

- **Severity:** P1
- **Domain:** Customer directory / search
- **Scenario:** Search the directory for the customer name `E2E Updated` after enough customers exist to cross pages.
- **Preconditions:** Target customer named `E2E Updated Customer`; other mobile numbers contain digit `2`.
- **Steps:** GET `/api/customers?search=E2E%20Updated...`; compare returned IDs to the exact matching customer.
- **Expected:** Only the name-matching customer is returned.
- **Actual before fix:** Unrelated customers whose phone contains `2` were also eligible; before isolation, page 1 returned `E Two E Customer` instead of the target.
- **DB evidence:** `alphanumeric-customer-search-evidence.json` records query, total, rows, and expected ID.
- **Financial impact:** No direct mutation; users can act on the wrong customer/history.
- **Inventory impact:** None.
- **Tenant/security impact:** Results remain tenant/store scoped; no foreign customer leaked.
- **Reproducibility:** 2/2 full runs once the directory contained multiple customers.
- **Root cause:** Customer intelligence extracted all digits from every search string (`E2E` → `2`) and ORed `mobile.includes(digits)` with the name predicate.
- **Fix:** A shared search classifier now enables normalized mobile matching only when the complete query is phone-like; names containing digits stay name-only searches. The same rule is applied to both customer list implementations.
- **Fix status:** FIXED
- **Files:** `src/modules/customers/utils/customerSearch.ts`, `src/modules/customers/utils/customerSearch.test.ts`, `src/modules/customers/services/customerIntelligenceService.ts`, `src/modules/customers/services/customerService.ts`, `e2e/tests/customers-invoices.spec.ts`, `package.json`.
- **Migration:** None.
- **Regression:** Normal Playwright coverage proves `E2E Updated` returns only the intended name match; customer unit coverage proves formatted and partial phone normalization without converting alphanumeric names.
- **Validation:** Focused Playwright 5/5, customer unit tests 30/30, TypeScript, targeted ESLint, and `git diff --check` passed.

## P1-004 — Exactly one-paise overpayment bypasses payment policy

- **Severity:** P1
- **Domain:** Billing / monetary boundary
- **Scenario:** Pay ₹1,000.01 against a ₹1,000 invoice using CASH and CARD.
- **Preconditions:** Standard ₹1,000 item and sufficient stock.
- **Steps:** Submit one cash and one card sale, then inspect sale/payment/ledger amounts.
- **Expected:** CASH may return 201 but must clamp the recorded settlement to ₹1,000; CARD must return 400 and remain atomic.
- **Actual before fix:** Both returned 201 and persisted `amountPaid=1000.01`, payment ₹1,000.01, due ₹0, and matching ₹1,000.01 ledger inflow against a ₹1,000 invoice.
- **DB evidence:** `one-paise-overpayment-evidence.json` contains both responses and persisted payment/ledger rows.
- **Financial impact:** Cash/card ledger exceeds invoiced revenue by ₹0.01 per affected sale; systematic reconciliation drift is possible.
- **Inventory impact:** Each accepted request also completes its normal single stock decrement.
- **Tenant/security impact:** None.
- **Reproducibility:** Cash and card reproduced in two discovery runs plus focused/final runs.
- **Root cause:** `overpayment > EPSILON` with `EPSILON = 0.01` excluded exactly ₹0.01, so neither the cash-clamp nor rejection branch executed.
- **Fix:** Sale settlement now compares integer minor units. Any positive overpayment enters policy handling: a single cash tender up to ₹1 is clamped to the invoice, while non-cash overpayment is rejected atomically. Split-total equality is also checked in minor units.
- **Fix status:** FIXED
- **Files:** `src/modules/billing/services/billingService.ts`, `e2e/tests/boundary-discounts.spec.ts`.
- **Migration:** None.
- **Regression:** Normal Playwright coverage proves a ₹1,000.01 cash tender records exactly ₹1,000 and a card attempt returns 400 with no sale, payment, ledger, or stock side effect; adjacent underpayment, round-off, maximum-discount, and allocation boundaries remain covered.
- **Validation:** Focused Playwright 6/6, numerical-integrity tests 14/14, TypeScript, and `git diff --check` passed. Whole-file ESLint remains blocked by pre-existing `no-explicit-any` debt in `billingService.ts`; the changed lines introduce no lint finding.

## P0-005 — Deactivated users retain API access through an issued session

- **Severity:** P0
- **Domain:** Authentication / session authorization
- **Scenario:** Authenticate as STAFF, set that user inactive in the authoritative database, then call a protected organization API using the already-issued session.
- **Expected:** The protected request is rejected with 401 (or an equivalent forced re-authentication response) immediately after deactivation.
- **Actual:** `GET /api/products` returns 200 and organization data because API authorization trusts JWT claims without re-checking whether the user remains active.
- **Reproduction:** Login as `e2e.staff@stockiva.invalid`; update seeded user `00000000-0000-4000-8000-00000000e213` to `isActive=false`; reuse the same cookie for `/api/products`.
- **DB evidence:** `inactive-session-evidence.json` records `isActive=false`, role STAFF, API status, and response body. The test restores the account in `finally`.
- **Financial impact:** A revoked user can continue invoking any financial mutation their stale role is allowed to invoke; this compounds P0-003 for STAFF expense creation.
- **Inventory impact:** The stale session can continue reading and potentially mutating inventory according to its cached role/store claims.
- **Security impact:** Revocation is ineffective until the JWT expires or is otherwise discarded; role/store reassignment is susceptible to the same stale-claim design.
- **Suspected root cause:** Credentials login validates `isActive`, but `getAuthUser()` reconstructs authorization exclusively from the JWT and protected routes do not re-read the user record.
- **Fix status:** FIXED 2026-10-07.
- **Root cause:** JWT authorization claims were refreshed only after an explicit client update, and that update path trusted client-supplied role, organization, and store values. Normal session reads never checked authoritative user activity.
- **Production fix:** Existing JWT sessions now carry identity while every session read revalidates the database user, fails closed for missing/inactive users or lookup failure, and refreshes role, store, organization, verification, and organization name together.
- **Files:** `src/lib/auth.ts`, `e2e/tests/platform-admin.spec.ts`.
- **Migration:** None.
- **Regression:** Normal Playwright coverage proves active access, then same-session denial for a protected page/API plus expense and stock mutations after deactivation, with no persisted side effects. A second case proves role/store/org changes replace stale JWT claims.
- **Validation:** Focused Playwright 5/5, TypeScript, targeted ESLint, and `git diff --check` passed.

## P1-005 — A different tenant can revoke an organization invitation

- **Severity:** P1
- **Domain:** Organization administration / broken access control
- **Scenario:** Tenant A's OWNER creates a pending STAFF invitation; an authenticated OWNER from Tenant B sends `DELETE /api/invitations/{invitationId}`.
- **Expected:** 403/404 with the pending invitation unchanged.
- **Actual before fix:** 200 with `{"message":"Invitation revoked"}` and the invitation row deleted.
- **Reproduction:** Create a disposable invitation as Tenant A, resolve its database ID, sign in as the isolated foreign-tenant owner, then call its DELETE route.
- **DB evidence:** `cross-tenant-invitation-revoke-evidence.json` records both organization IDs, response, and `persistedAfterAttack=null`.
- **Financial impact:** None directly.
- **Inventory impact:** None directly.
- **Security impact:** Cross-tenant denial of service against invitation onboarding when an invitation ID is learned or disclosed.
- **Root cause:** The DELETE handler in `/api/invitations/[token]` relied only on the global authenticated-route proxy and performed no role or organization-scope check.
- **Fix:** Revocation now requires authoritative organization authentication plus OWNER/ADMIN user-management permission, and performs an atomic `deleteMany` constrained by both invitation ID and authenticated organization ID. A foreign invitation is reported as not found.
- **Fix status:** FIXED
- **Files:** `src/app/api/invitations/[token]/route.ts`, `e2e/tests/invitations-security.spec.ts`.
- **Migration:** None.
- **Regression:** Normal Playwright coverage proves foreign OWNER denial with the invitation preserved, same-tenant STAFF denial with the invitation preserved, and same-tenant OWNER revocation success; public token validation/acceptance remains covered.
- **Validation:** Focused Playwright 3/3, TypeScript, targeted ESLint, and `git diff --check` passed.

## P0-006 — Deleting a sold product erases historical transaction evidence

- **Severity:** P0
- **Domain:** Product lifecycle / referential integrity
- **Scenario:** Create a disposable stocked product, complete a paid sale for it, then delete the product through its authenticated API.
- **Expected:** Deletion is rejected with 409, or the product is safely archived while the sale item, immutable cost snapshot, and stock movements remain queryable.
- **Actual:** DELETE returns 200. The product, its sale item, stock entry, opening movement, and sale movement are deleted, while the completed sale, payment, and financial inflow remain.
- **Reproduction:** Create SKU `E2E-DELETE-HISTORY`, sell one unit to `9990000898`, then `DELETE /api/products/{id}` and inspect the sale graph.
- **DB evidence:** `sold-product-delete-evidence.json` records the response, missing product, surviving itemless sale/payment, and zero product movements. All disposable remnants are removed in `finally`.
- **Financial impact:** Revenue/cash remains posted while line-level revenue, COGS, and product attribution disappear; historical profit and invoice reconstruction become unreliable.
- **Inventory impact:** Stock history and the remaining on-hand row are erased rather than preserved through an inactive/archive state.
- **Security impact:** Any authenticated organization user currently able to invoke the product DELETE route can destroy audit history; role enforcement on this route is not stronger than organization membership.
- **Suspected root cause:** `productService.delete` explicitly calls `saleItem.deleteMany`, `purchaseOrderItem.deleteMany`, `stockMovement.deleteMany`, and `stockEntry.deleteMany` before deleting the product instead of rejecting referenced deletion or archiving.
- **Fix status:** FIXED 2026-10-07.
- **Root cause:** Product deletion explicitly removed sale items, purchase-order items, stock movements, and stock entries before deleting the master record, bypassing the database relationships that otherwise protect history.
- **Production fix:** Product deletion now rejects any product with inventory, transaction, return, purchase, transfer, supplier, demand, replenishment, or forecast references and directs users to the existing deactivation lifecycle. Concurrent references remain protected by foreign keys and map to HTTP 409.
- **Files:** `src/modules/products/services/productService.ts`, `src/app/api/products/[id]/route.ts`, `e2e/tests/referential-integrity.spec.ts`.
- **Migration:** None.
- **Regression:** Normal Playwright coverage proves direct API deletion returns 409 while product, sale item/COGS snapshot, invoice, customer link, payment, and stock movements remain intact.
- **Validation:** Focused Playwright 2/2, TypeScript, targeted ESLint, and `git diff --check` passed.

## P1-006 — Public demo-request endpoint is unreachable without authentication

- **Severity:** P1
- **Domain:** Public lead capture / route authorization
- **Scenario:** A logged-out prospective customer submits malformed or valid demo-request data to the endpoint used by the public marketing form.
- **Expected:** Malformed input returns 400 without delivery; valid input is accepted with 202 and produces exactly one delivery payload; provider failure returns a controlled application error; unrelated APIs remain protected.
- **Actual before fix:** Both requests returned 401 from the global proxy before schema validation, honeypot, rate limiting, or delivery handling ran.
- **Reproduction:** Without a session cookie, POST to `/api/demo-requests` with `{fullName:""}` and then with a complete valid lead payload.
- **DB evidence:** This endpoint has no database mutation. `public-demo-request-auth-evidence.json` records both 401 responses and bodies.
- **Financial impact:** Prospective-customer leads cannot enter the sales funnel from the public form.
- **Inventory impact:** None.
- **Security impact:** No data exposure; this is an over-restrictive route-policy defect.
- **Root cause:** `/api/demo-requests` was absent from `publicRoutes` in `src/proxy.ts`, despite the handler being designed as a public, rate-limited endpoint.
- **Fix:** The single demo-request API prefix is explicitly public in the Next 16 Proxy allowlist. A server-controlled E2E delivery seam captures the same logical payload offline and supports a deterministic failure result. Activation requires the isolated E2E database, reset consent, loopback URL, `.next-e2e` runtime, a restricted capture path, and no real delivery credentials; no request header, query, body, cookie, or public endpoint can select it.
- **Fix status:** FIXED + VERIFIED 2026-10-07.
- **Files:** `src/proxy.ts`, `src/app/api/demo-requests/route.ts`, `src/modules/marketing/demoRequestDelivery.ts`, `playwright.config.ts`, `e2e/setup/environment.mjs`, `e2e/setup/environment.test.mjs`, `e2e/tests/external-boundaries.spec.ts`.
- **Migration:** None.
- **Regression:** Normal anonymous Playwright coverage proves invalid input returns 400 with zero delivery attempts, valid input returns 202 with exactly one captured name/business/mobile/email/message payload, deterministic delivery rejection returns a sanitized 502, and an unrelated Finance API remains 401. Anonymous upload and disabled OAuth controls also remain covered.
- **Validation:** Focused Playwright 6/6 and the full non-WhatsApp Playwright regression 92/92 passed. E2E safety 10/10, TypeScript, targeted ESLint, `git diff --check`, and zero remaining `test.fail` markers passed. No Resend or other external provider was contacted.

## Confirmed passing controls

- Concurrent last-unit sale: one 201, one 400, one sale/item/payment/ledger/movement, closing stock 0.
- Concurrent return: one 201, one stale-sale 400, one return and one restoring movement.
- Concurrent refund settlement: one accepted settlement; liability cannot be overpaid.
- Concurrent supplier settlement: one accepted payment; payable closes exactly once.
- Exact-key retries: return, exchange, refund settlement, supplier payment, account transfer, and cash adjustment remain single-posted.
- Failed invalid quantity, ordinary overpayment, insufficient stock, invalid return item, excessive return, and negative stock leave no partial business rows.
- Direct foreign-ID GET/PUT/PATCH/DELETE probes across customer, sale, invoice/PDF, supplier, purchase order, expense, product, stock, and analytics remained denied/scoped.

## Historical discovery-time remediation order (completed)

The following was the priority order recorded when all defects were still open. It is retained as historical evidence; there is no remaining defect remediation queue.

1. **P0-003** — close the authorization bypass before any affected role can create financial data.
2. **P0-006** — stop destructive master deletion from erasing historical financial/inventory evidence.
3. **P0-005** — revalidate revocable user/role/store state for protected requests.
4. **P0-001** — introduce a durable sale idempotency contract covering all side effects.
5. **P0-002** — make receivable settlement conditional/locked against remaining due.
6. **P0-004** — prohibit paid-expense amount mutation or implement audited reversal/correction.
7. **P1-005** — require role and organization scope for invitation revocation.
8. **P1-001** — validate positive expense values at API/service/database layers.
9. **P1-002** — use the canonical IST business-date range in Finance.
10. **P1-004** — correct minor-unit overpayment comparison and cash clamp behavior.
11. **P1-003** — apply phone matching only to phone-like queries.
12. **P1-006** — expose the demo-request endpoint to unauthenticated prospects while retaining its handler validation/rate limits.

No remediation was performed in this discovery phase.
