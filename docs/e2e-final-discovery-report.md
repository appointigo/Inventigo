# Stockiva non-WhatsApp E2E discovery — final report

Discovery date: 2026-10-07. Database: reset-only `stockiva_e2e`. This document preserves discovery-time results and separately records the current remediation state. Discovery itself made no production fixes; subsequent controlled remediation has fixed and verified all 12 defects.

## 1. Coverage movement

| Classification | Before | After |
|---|---:|---:|
| E2E automated | 89 | 102 |
| Unit-only | 9 | 8 |
| Deferred | 14 | 7 |
| Blocked | 6 | 4 |
| N/A | 1 | 1 |
| WhatsApp deferred | 11 | 11 |

At discovery close, the matrix grew from 130 to 133 scenarios because direct API validation, database constraint proof, and destructive referential integrity were made explicit. Playwright grew from 72 to 88 executable tests: **76 normal regressions + 12 expected defect reproductions**. This is historical discovery-time inventory, not the current regression count.

## 2. Remaining gaps

Every remaining non-WhatsApp gap, exact prerequisite, future test level, and release significance is recorded in `docs/e2e-gap-analysis.md`. There are no unclassified “not tested yet” rows. The principal blockers are a local OIDC provider, mail capture/failure adapter, tenant-scoped settings decision, and local blob adapter. Historical decision-support routes remain deferred behind one coherent clock-stable multi-period fixture; their deterministic rules are unit-covered.

## 3. Defect inventory

| Severity | Existing defects | Newly discovered in this pass |
|---|---|---|
| P0 | P0-001 sale retry duplication; P0-002 concurrent receivable over-collection; P0-003 STAFF finance/report bypass; P0-004 settled-expense ledger divergence | P0-005 deactivated session remains authorized; P0-006 sold-product deletion erases transaction evidence |
| P1 | P1-001 non-positive expenses; P1-002 UTC/IST Finance boundary; P1-003 alphanumeric customer search; P1-004 one-paise overpayment | P1-005 cross-tenant invitation revoke; P1-006 public demo endpoint blocked by auth proxy |
| P2 | None | None |
| P3 | None | None |

Discovery originally closed with all 12 **NOT FIXED**. Controlled remediation subsequently fixed all six P0 and all six P1 defects with normal regression coverage; no expected defect failures remain.

## 4. External integration readiness

- **Email:** The public demo route now uses a route-specific, server-controlled E2E capture adapter. Anonymous validation, exact outbound lead payload, 202 success, deterministic delivery failure, and narrow public authorization are verified without network access. Auth verification/resend and forgot-password remain separate gaps requiring their own safe mail/token harness. No email was sent.
- **OAuth:** With credentials absent, `/api/auth/providers` exposes credentials only and Google is absent. Callback, state/nonce, account mapping, and provider failure require a local OIDC stub. No OAuth provider was contacted.
- **Blob/storage:** Anonymous upload returns 401 and authenticated calls fail closed without provider credentials. MIME/size/object/tenant/replacement/deletion behavior requires a local blob adapter/emulator. No blob provider was contacted.
- **Other providers:** Low-stock notification delivery is simulated logging only; the authorized cron did not contact email/SMS. No external provider was contacted.

WhatsApp remains intentionally deferred and uninvoked.

## 5. Platform-admin results

Proven with a directly seeded disposable SUPER_ADMIN in a clean context:

- tenant OWNER receives 403 from sampled organizations, users, stats, analytics, feature flags, and audit routes, including mutation;
- SUPER_ADMIN can read both deterministic organizations and global stats/users/analytics;
- a disposable global feature flag can be created/toggled and produces two audit rows;
- user deactivate/reactivate persists and is audited.

Not proven at discovery time: real pricing/billing-provider changes or every announcement UI field. Discovery proved P0-005; subsequent remediation now revalidates authoritative user state and its normal regression passes.

## 6. Cron results

Only one non-WhatsApp cron exists: `/api/cron/reorder-check`.

| Request | Result | DB side effect |
|---|---|---|
| Missing Authorization | 401 | None |
| Wrong bearer secret | 401 | None |
| Fixed E2E-only bearer secret | 200; 2 organizations checked; at least 1 low-stock item detected | None by design: route reads alert/stock state and notification delivery is simulated |

The disposable alert configuration remained unchanged and was deleted after the assertion.

## 7. Forecasting results

The 16 deterministic forecast/scope tests passed. Representative exact controls:

| Historical input | Expected | Actual |
|---|---|---|
| 90 daily observations repeating 10,12,11,13,12; 30-day horizon | READY, STABLE, non-negative bounded forecast | Matched |
| 5 sparse observations `[0,1,0,0,1]`; 7-day horizon | NOT_READY and no precise forecast | Matched |
| 60 days ×2 plus 10 out-of-stock zero days with one unfulfilled unit/day | positive forecast; 10 stockout days; demand pressure 10 | Matched |
| 210 days with weekend=14, weekday=2 | seasonal-naive method, WEEKEND_HEAVY, WAPE 0 | Matched |
| stock 12 + inbound 5 vs expected 34 (27–42) | CRITICAL, shortage 17 | Matched |
| source 47/upper demand 10; destination 6/upper demand 35; buffer 3 | protected 13, transferable 34, need 32, transfer 32 | Matched |
| purchases every 28 days through 2026-03-26, as-of 2026-05-01 | RETURN_DUE, typical interval 28 | Matched |
| supplier lead times stable / volatile / past explicit due date | ON_TRACK / AT_RISK / OVERDUE | Matched |

Persisted forecasting/outlook E2E remains deferred until the shared multi-period fixture listed in the gap analysis exists; no algorithm was changed.

## 8. Import and secondary CRUD results

- Category and brand bulk APIs accept valid batches, reject empty/malformed batches with 400, reject duplicates with 422, and leave no partial row from a mixed duplicate batch.
- Product bulk import creates exactly one product, stock row, and opening quantity; duplicate retry is 422/atomic; negative price is 400; foreign store is 403.
- Category/brand create-update-delete works for disposable unreferenced rows; cross-tenant IDs are hidden; referenced seeded category/brand deletion returns 409.
- Inactive product remains persisted and discoverable through the inactive filter while a new sale is rejected atomically.
- Discovery proved destructive product deletion was unsafe (P0-006). Current remediation rejects referenced deletion and verifies that product, sale/COGS, invoice/customer, and stock evidence survives.
- Malformed JSON for all three bulk endpoints returns controlled 400, not 500.

## 9. Security results

- **Platform admin:** privileged/tenant separation passes; stale inactive-user session fails as P0-005.
- **Tenant isolation:** product, stock, analytics, customer, sale, invoice/PDF, supplier, PO, expense, catalog, store, team, and invitation probes are scoped.
- **Permissions:** purchasing, finance, reporting, expense, and invitation-management controls pass, including direct STAFF method checks.
- **Sessions:** logout/protected navigation passes; authoritative session revalidation immediately denies deactivated users and refreshes changed role/store/organization claims.
- **Feature entitlements:** no non-WhatsApp tenant feature exists, so enforcement is N/A. Global admin feature-flag authorization/audit was proven, but it is not a tenant entitlement gate.
- **Direct API attacks:** anonymous critical APIs, malformed JSON, invalid IDs, foreign stores, duplicate imports, referenced deletes, and unsupported monetary/quantity boundaries return controlled responses except registered defects.
- **Database invariants:** same-store transfer, zero requested transfer quantity, and negative purchase money were rejected by real CHECK constraints.

## 10. Validation counts

- E2E safety: **10/10 passed**.
- Discovery-time Playwright inventory: **88 tests in 26 files**: 1 setup + 87 chromium; **76 normal regressions + 12 expected defect reproductions**.
- Current remediation result: **92/92 executable Playwright tests passed** in the full non-WhatsApp regression, all as normal regressions; expected defect reproductions: **0**. P1-006 focused verification also passed 6/6, including setup and five external-boundary cases.
- Deterministic domain/unit suites: **129/129 passed**.
- Invoice/PDF/document controls: **23/23 passed** when the server-only service suite is run with the required `react-server` export condition; includes long-list pagination, escaping/special content, discount, partial payment, return, and all three exchange settlement shapes.
- Numerical integrity: **14/14 passed** (included in the 129 domain total).
- Pricing catalog: **5/5 passed** (included in the 129 domain total).
- TypeScript: **passed**.
- Targeted ESLint: **passed**.
- `git diff --check`: **passed**.

## 11. Discovery and remediation decisions

Discovery-time decision: every non-WhatsApp scenario was automated, covered at a defensible lower level, blocked by an exact external/product prerequisite, deferred behind an exact fixture, or N/A. Provider limitations and all 12 defects were explicit; no defect was fixed during discovery.

**DISCOVERY COMPLETE — READY FOR REMEDIATION**

Current remediation decision: all 12 registered defects are fixed and verified with ordinary regressions. P1-006 now has offline success-payload and controlled-failure proof, with no external provider contact.

**12/12 FIXED + VERIFIED — READY FOR FINAL RELEASE VALIDATION**
