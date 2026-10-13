# Purchase Management QA Report

Audit date: 2026-10-13

## 1. Executive Summary

**Overall result: FAIL. Production readiness: BLOCKED.**

The current implementation has strong foundations for accepted-only receiving, receipt idempotency, concurrent receiving protection, moving-average valuation, payable/payment separation, tenant isolation, and aggregate reconciliation. Those areas passed real database-backed tests.

Five reproducible defects prevent release:

1. Description-only provisional POs are rejected by a legacy database constraint.
2. Receipt reversal is unusable because its append-only negative rows violate a database CHECK.
3. The Direct Purchase endpoint rejects every valid body containing its own required fields.
4. Supplier claims can bypass required replacement/return/credit workflow and resolve immediately.
5. Three-way matching ignores invoiced quantity, allowing an over-invoiced bill to be marked `MATCHED` and posted.

Supplier return dispatch/inventory reversal, replacement-receipt linkage, inspection enforcement, secure purchasing attachments, partial claim resolution, bill editing, and serial/IMEI capture are not complete. The reference image was not available, so pixel/reference comparison is blocked.

## 2. Coverage Summary

### Automated test cases

| Measure | Count | Notes |
| --- | ---: | --- |
| Existing tests reused | 135 | 97 historical Playwright + 10 safety + 28 relevant domain/contract tests. |
| New tests added | 11 | `purchase-management-qa.spec.ts`; authentication setup is not counted as new. |
| Unique automated tests executed | 146 | Deduplicated safety, domain and E2E cases. |
| Passed | 141 | Includes focused rerun validation of the return/exchange serial file. |
| Failed | 5 | All five reproduced in both focused and clean full-suite execution. |
| Skipped | 0 | Seven full-run serial skips were subsequently executed and passed in focused rerun. |
| Blocked | 1 | Reference-image comparison only. |
| Not implemented | 11 | Contractual scenarios; see matrix/missing-feature register. |
| Not run | 17 | Contractual scenarios lacking deterministic execution; not counted as passes. |

Raw invocations were higher because focused discovery runs and final regression repeated tests. The clean full Playwright run reported **95 passed, 6 failed, 7 did not run**; the sixth failure was a remote-database transaction timeout. A focused rerun then passed **10/10**, executing the timed-out case and all seven serial dependents. Normalized unique Playwright status is **103 passed, 5 failed, 0 skipped**.

### Quality gates

| Gate | Result |
| --- | --- |
| TypeScript `tsc --noEmit` | PASS |
| Prisma schema validation | PASS |
| Targeted source lint | PASS |
| Repository `npm run lint` | BLOCKED by tooling defect: it scans `.next-e2e` generated chunks; stopped and replaced with targeted lint. |
| Next.js production build | PASS, 218 routes/pages; one non-purchasing Turbopack NFT trace warning. |
| Domain/contract tests | PASS, 28/28 |
| E2E safety tests | PASS, 10/10 |
| Final E2E regression (normalized) | FAIL, 103 passed / 5 reproducible failures |

## 3. Module Results

| Module | Result | Key finding |
| --- | --- | --- |
| Test infrastructure | PASS | Live database identity verified before reset; migrations/drift audited. |
| Purchase orders | FAIL | Existing-product paths pass; description-only provisional/mixed PO fails. |
| Product/variant mapping | PASS with gaps | Existing linking and split mapping pass; inline-create concurrency/category breadth not run. |
| Receiving | FAIL | Accepted-only, damaged, short-close and concurrency pass; reversal fails. |
| Idempotency/concurrency | PASS | Receipt replay/conflict and concurrent supplier settlement pass. |
| Inspection/claims | FAIL | Defect evidence and claim creation pass; policy enforcement/transition controls incomplete. |
| Supplier bills | FAIL | Posting/price difference/duplicates pass; quantity match is wrong. |
| Payments/finance | PASS with direct-purchase blocker | Standard payables/payments reconcile; direct purchase cannot enter pipeline. |
| Valuation/COGS/transfers | PASS with correction blocker | Moving average and reporting pass; reversal/correction path fails. |
| Direct purchase | FAIL | Route parser blocks valid requests. |
| UI/responsive | PASS with visual observations | 10 screens rendered at 1440×900, 768×1024 and 390×844; two creation modals exercised. |
| Security/tenancy | PASS with attachment gap | Tenant/store/role/ID isolation passed; purchasing attachment security absent. |

Full scenario detail is in [QA_COVERAGE_MATRIX.md](./QA_COVERAGE_MATRIX.md).

## 4. Defect Register

### QA-DEF-001 — Provisional PO contract contradicts database constraint

- Severity: High
- Feature: Provisional and mixed Purchase Orders
- Reproduction: POST a PO line with `itemKind=PROVISIONAL_PRODUCT`, description, quantity and unit cost, without existing product/category/brand.
- Expected: Draft PO created; no Product Master or stock created.
- Actual: HTTP 400; `purchase_order_items_provisional_classification_check` violation.
- Evidence: `QA-PO-001`, Playwright failure artifact under `e2e/test-results/purchase-management-qa-*49fca*`.
- Root cause: API schema makes brand/category optional, but migration `20261011110000_add_provisional_purchase_items` still requires provisional classification fields.
- Suggested fix: Align the DB constraint with the public contract, add migration-level constraint tests, then split the draft lifecycle test so later behavior cannot be masked.

### QA-DEF-002 — Receipt reversal cannot persist its audit rows

- Severity: High
- Feature: Goods receipt correction/reversal
- Reproduction: Post an accepted receipt, then POST its reversal with confirmation ID and reason.
- Expected: Stock and valuation reverse once; original evidence retained; reversal evidence appended.
- Actual: HTTP 400; `purchase_order_receipt_items_quantities_valid` rejects negative quantities.
- Evidence: `QA-GRN-002`, `poService.ts` reversal writes negative receipt quantities at line 825.
- Root cause: Reversal implementation conflicts with the older nonnegative receipt-item CHECK.
- Suggested fix: Model signed correction rows explicitly or use a dedicated reversal-item table/constraint; preserve idempotency and valuation ordering.

### QA-DEF-003 — Direct Purchase route rejects valid direct-purchase fields

- Severity: High
- Feature: Direct Purchase
- Reproduction: POST an unpaid direct purchase with `idempotencyKey`, `supplierInvoiceNumber`, `invoiceDate`, store, supplier and valid item.
- Expected: One internal PO/receipt/bill/payable, one stock posting, zero cash movement.
- Actual: HTTP 400; Zod reports the direct-purchase fields as unrecognized.
- Evidence: `QA-DP-001`.
- Root cause: `src/app/api/purchasing/direct/route.ts:11` applies strict `createPurchaseOrderSchema` to the extended request shape.
- Suggested fix: Define one strict direct-purchase schema that composes the PO fields with invoice/payment/resolution fields, then pass its parsed result to the service.

### QA-DEF-004 — Claim workflow permits immediate terminal resolution

- Severity: High
- Feature: Supplier Claims and Replacements
- Reproduction: Create a replacement claim from a damage discrepancy, then send `action=RESOLVE` immediately.
- Expected: Rejection until replacement receipt or approved alternative resolution evidence exists.
- Actual: HTTP 200; claim and discrepancy become resolved.
- Evidence: `QA-CLAIM-001`.
- Root cause: `purchaseManagementService.ts:247` maps any `RESOLVE` action directly to terminal state without a transition table or evidence checks.
- Suggested fix: Implement an explicit state machine with role checks, required evidence, idempotency, partial quantities, and replacement/return/credit linkage.

### QA-DEF-005 — Three-way match ignores quantity and accepted receipts

- Severity: Critical
- Feature: Supplier Bills / Accounts Payable
- Reproduction: Order and accept 2 units at ₹500, then draft a bill for 3 units at ₹500.
- Expected: `DIFFERENCE`; posting requires explicit review/approval.
- Actual: `MATCHED`; the bill can establish a ₹1,500 obligation.
- Evidence: `QA-BILL-002`.
- Root cause: `purchaseManagementService.ts:96-99` compares only line presence and unit cost; it does not compare ordered, accepted, previously billed, or allocated quantities.
- Suggested fix: Calculate match status per PO line from ordered quantity, accepted receipt allocations, cumulative prior bills, invoice quantity and price; prevent unallocated excess from posting.

### QA-INFRA-001 — Remote E2E transaction timeout

- Severity: Medium (test reliability/operational risk)
- Feature: Sale/return regression
- Reproduction: During the 108-test full run, a sale transaction exceeded Prisma's 5-second timeout by 1.257 seconds.
- Expected: Deterministic completion or bounded retry.
- Actual: One test failed and seven serial dependents did not run.
- Evidence: Full run `returns-exchanges.spec.ts:90`; focused rerun passed 10/10.
- Root cause: Remote database latency plus a short interactive transaction timeout; `pg` also emitted a concurrent-query deprecation warning.
- Suggested fix: Reduce transaction work/round trips, remove concurrent use of a busy client, and introduce bounded retry only for recognized transient transaction failures.

## 5. Missing Feature Register

| Priority | Feature | Status | Evidence |
| --- | --- | --- | --- |
| P0 | Accepted-stock supplier return dispatch and stock/value reversal | NOT IMPLEMENTED | Claim transition records a timestamp/status only. |
| P0 | Replacement receipt linkage | NOT IMPLEMENTED | No schema relation or receiving workflow links replacements to claims. |
| P0 | Secure invoice/defect-photo storage and tenant authorization | NOT IMPLEMENTED | Metadata arrays/table exist; no purchasing upload/retrieval route. |
| P0 | Inspection policy administration and enforcement | NOT IMPLEMENTED | Policy model exists but receiving does not consult it. |
| P0 | Inspection decision workflow | NOT IMPLEMENTED | No accept/reject/release transition for held goods. |
| P0 | Supplier claim transition controls | DEFECTIVE | Arbitrary terminal resolution is allowed. |
| P1 | Partial claim resolution | NOT IMPLEMENTED | No resolved/remaining quantity accounting. |
| P1 | Claim action UI | NOT IMPLEMENTED | Create/list only. |
| P1 | Supplier bill editing/correction UX | NOT IMPLEMENTED | No edit route or posted correction workflow. |
| P1 | Bill attachment UX/storage | NOT IMPLEMENTED | No secure end-to-end flow. |
| P2 | Serial/IMEI capture | NOT IMPLEMENTED | Tracking enum exists; serial instance capture does not. |

## 6. Financial Reconciliation

- Standard PO → accepted receipt → bill → payable → partial/final supplier payment reconciled successfully.
- Bill posting created one payable, no second stock receipt, and no immediate cash outflow.
- Duplicate and concurrent supplier payments did not exceed the payable.
- Dashboard, Finance, Purchasing and aggregate reporting reconciled to independently queried persisted sums in `zz-reconciliation.spec.ts`.
- Moving-average validation passed exactly: 10 units @ ₹400 plus 10 @ ₹600 produced 20 units @ ₹500, with matching immutable valuation evidence.
- **Exception:** quantity-based three-way matching is not financially reliable. A bill for 3 units against 2 ordered/accepted units was marked `MATCHED`; therefore accounts payable can be overstated.
- Direct Purchase reconciliation is blocked by the request parser defect.

## 7. UI Verification

All ten screens were rendered and checked at desktop 1440×900, tablet 768×1024, and mobile 390×844. The automation asserted headings, absence of whole-document horizontal overflow, no HTTP 5xx responses, no page exceptions, completed loading skeletons, and modal opening on Claims and Bills.

| Screen | Status | Screenshot prefix |
| --- | --- | --- |
| Purchase Orders List | PASS | `qa-evidence/purchase-orders-*` |
| Create Purchase Order | PASS | `qa-evidence/create-purchase-order-*` |
| Create Product | PASS | `qa-evidence/create-product-*` |
| Goods Receiving Queue | PASS | `qa-evidence/receiving-queue-*` |
| Receive Items & Map Products | PASS | `qa-evidence/receive-map-*` |
| Inspection & Defects | PASS (workflow incomplete) | `qa-evidence/inspection-*` |
| Supplier Claims & Returns | PASS (actions incomplete) | `qa-evidence/claims-*` |
| Supplier Bill & 3-Way Match | PASS (matching defect) | `qa-evidence/supplier-bills-*` |
| Payments & Purchase Summary | PASS | `qa-evidence/purchase-summary-*` |
| Direct Purchase | PASS UI / FAIL backend | `qa-evidence/direct-purchase-*` |

Visual observations:

- Mobile bottom navigation can overlay lower form/table content; the floating issue badge also overlaps the first nav label.
- The horizontal purchasing sub-navigation truncates labels on mobile, although the document itself does not overflow.
- Ant Design reports deprecated `Alert.message` and `Space.direction` props.
- Exact reference comparison is **BLOCKED** because the source nine-screen reference image was not supplied.

## 8. Test Infrastructure

- Database: dedicated PostgreSQL database named `stockiva_e2e`; URL equality, name marker and production-marker guards passed. Secret values are intentionally omitted.
- Application: loopback `127.0.0.1:3002`, `NODE_ENV=test`.
- External effects: real email/WhatsApp/OAuth/cron recipients and credentials absent; capture/disabled test adapters used.
- Browser: Playwright 1.63.0 Chromium project, one worker, deterministic serial database setup.
- Database setup: live identity verified, public schema reset, 50 baseline migration records reconstructed, 4 forward migrations applied, drift none.
- Important commands: `npm run test:e2e:safety`, focused Playwright purchase runs, `node --experimental-transform-types --test ...`, `npx tsc --noEmit`, `npx prisma validate`, targeted `npx eslint ...`, `npm run build`, `npm run test:e2e`, and focused `returns-exchanges.spec.ts` rerun.
- No deployment, production mutation, real notification, or external payment request occurred.

## 9. Production Readiness

**BLOCKED.**

Do not promote this purchase-management implementation to controlled production. Critical/high stock and financial issues remain: three-way quantity matching is unsafe, receipt reversal is broken, direct purchase is unusable, provisional POs contradict their published contract, and claim resolution lacks controls. Required attachment security and supplier-return/replacement workflows are also missing.

## 10. Next Actions

1. Fix quantity-aware three-way matching and prevent posting bills beyond accepted/unbilled receipt allocations.
2. Redesign receipt reversal evidence so database constraints and append-only accounting agree; add retry/idempotency regression coverage.
3. Replace Direct Purchase parsing with a composed strict schema and execute paid, unpaid, partial and retry cases.
4. Align provisional PO database constraints with the API contract, then rerun draft edit/cancel/mixed-PO coverage.
5. Implement a supplier claim state machine with accepted-stock return dispatch, replacement receipt linkage, credit evidence and partial quantities.
6. Add secure tenant-scoped attachment storage/retrieval for invoices and defect photos.
7. Wire inspection policy administration and enforcement into receiving/held-stock release.
8. Exclude `.next-e2e` from repository lint and reduce remote transaction latency/flakiness.
9. Supply the original design reference and perform visual-diff review after the functional blockers are fixed.
