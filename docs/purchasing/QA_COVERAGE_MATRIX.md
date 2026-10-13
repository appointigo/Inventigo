# Purchase Management QA Coverage Matrix

Audit date: 2026-10-13  
Environment: isolated `stockiva_e2e` PostgreSQL database; Chromium via Playwright 1.63.0; Next.js 16.2.0.

Status legend: PASS, FAIL, BLOCKED, NOT IMPLEMENTED, NOT RUN, SKIPPED WITH REASON.

Evidence keys:

- `PM-QA`: `e2e/tests/purchase-management-qa.spec.ts`
- `PM`: `e2e/tests/purchase-management.spec.ts`
- `PF`: `e2e/tests/purchasing-finance.spec.ts`
- `CR`: `e2e/tests/concurrency-retries.spec.ts`
- `TP`: `e2e/tests/tenancy-permissions.spec.ts`
- `REC`: `e2e/tests/zz-reconciliation.spec.ts`
- `INV`: `e2e/tests/inventory-products.spec.ts`
- `RET`: `e2e/tests/returns-exchanges.spec.ts`
- `TR`: `e2e/tests/transfers-cron.spec.ts`
- `DOM`: focused Node domain/contract tests
- `SRC`: source/schema inspection

## T0 — Infrastructure and historical coverage

| Test ID | Module | Scenario | Priority | Existing evidence | New test required | Status | Result / evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| T0-001 | Safety | E2E environment rejects unsafe targets/effects | P0 | `e2e/setup/environment.test.mjs` | No | PASS | 10/10 safety tests passed. |
| T0-002 | Inventory | Map historical Playwright claim | P0 | 28 Playwright files | No | PASS | Exactly 97 tests were listed before additions. |
| T0-003 | Schema | Disposable reset, migrations, drift verification | P0 | `e2e/setup/*` | No | PASS | 54 migrations; drift none; 8 CHECK constraints; 3 partial indexes. |
| T0-004 | External effects | Email/WhatsApp/OAuth/blob delivery guarded | P0 | `external-boundaries.spec.ts` | No | PASS | Capture/disabled adapters only; no real recipients or credentials. |

## T1 — Purchase orders

| Test ID | Module | Scenario | Priority | Existing test | New test required | Status | Result / evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| PO-001 | PO | Existing-product PO; no stock/cash on order | P0 | PF | Yes | PASS | PF and PM-QA invariants. |
| PO-002 | PO | Description-only provisional PO | P0 | None | Yes | FAIL | DB rejects valid line with `purchase_order_items_provisional_classification_check`. |
| PO-003 | PO | Mixed catalog/provisional PO | P0 | None | Yes | FAIL | Same constraint prevents mixed PO creation. |
| PO-004 | PO | Draft edit/remove/change/issue | P1 | None | Yes | NOT RUN | New test could not pass the preceding provisional creation step. |
| PO-005 | PO | Invalid quantity/money/store/product/tenant | P0 | TP | Yes | PASS | Atomic invalid and cross-tenant requests rejected. |
| PO-006 | PO | Cancellation rules/history | P1 | None | Yes | NOT RUN | Cancellation code inspected; full behavioral branch was not reached after PO-002 failure. |
| PO-007 | PO | Close short preserves receipt evidence | P0 | None | Yes | PASS | PM-QA closes 6 ordered / 4 arrived and keeps receipt/discrepancy. |
| PO-008 | PO | Search/date/pagination filters | P2 | None | Yes | NOT IMPLEMENTED | API exposes supplier/status/store only; no PO-number/date/pagination contract. |
| PO-009 | Auth | Role permissions | P0 | TP | No | PASS | Staff purchase and finance mutations rejected. |

## T2 — Product creation and variant mapping

| Test ID | Scenario | Priority | Existing test | New test required | Status | Result / evidence |
| --- | --- | --- | --- | --- | --- | --- |
| PROD-001 | Product creation without implicit stock | P0 | INV | No | PASS | Product/opening-stock operations remain separate. |
| PROD-002 | Inline create from receiving | P1 | None | Yes | NOT RUN | Service path exists; no complete browser/API test executed. |
| PROD-003 | Link provisional receipt to existing SKU | P0 | PM | No | PASS | No duplicate Product Master created. |
| PROD-004 | Split one provisional line into grouped variants | P0 | PM | No | PASS | Two mappings, accepted-only stock and discrepancy persisted. |
| PROD-005 | Concurrent duplicate SKU prevention | P0 | None | Yes | NOT RUN | Unique DB constraint exists; concurrency behavior not executed. |
| PROD-006 | Generic attributes across retail categories | P1 | None | Yes | NOT RUN | Schema is generic, but category matrix was not executed. |
| PROD-007 | Zero-stock variants selectable/restockable | P1 | INV | No | PASS | Zero-stock second-store fixture remains queryable. |

## T3 — Goods receiving

| Test ID | Scenario | Priority | Existing test | New test required | Status | Result / evidence |
| --- | --- | --- | --- | --- | --- | --- |
| GRN-001 | Full accepted receipt | P0 | PM/PF | No | PASS | One receipt, stock and valuation posting. |
| GRN-002 | Two partial receipts complete an order | P0 | None | Yes | NOT RUN | Multiple receipt implementation exists; exact 30+20 case not executed. |
| GRN-003 | Missing/undelivered quantity remains open | P0 | None | Yes | PASS | PM-QA partial receipt stays `PARTIALLY_RECEIVED`. |
| GRN-004 | Damaged/held goods post accepted stock only | P0 | PM | Yes | PASS | Receipt, defect and discrepancy reconcile; held stock not sellable. |
| GRN-005 | Wrong-product approval/rejection workflow | P1 | None | Yes | NOT IMPLEMENTED | Discrepancy type exists but no decision workflow. |
| GRN-006 | Over-delivery and concurrent enforcement | P0 | None | Yes | PASS | Concurrent full receipts allow one posting only. |
| GRN-007 | Receipt history/cumulative quantities | P1 | PM | No | PASS | Persisted receipt-item history verified. |
| GRN-008 | Unposted receiving draft | P1 | None | Yes | NOT IMPLEMENTED | API always posts; no draft receiving route/UI. |
| GRN-009 | Controlled transactional posting failure/retry | P0 | None | Yes | NOT RUN | Atomicity inferred from transaction, not fault-injected. |
| GRN-010 | Append-only receipt reversal | P0 | None | Yes | FAIL | Negative reversal rows violate the existing receipt quantity CHECK. |

## T4 — Idempotency and concurrency

| Test ID | Scenario | Priority | Existing test | New test required | Status | Result / evidence |
| --- | --- | --- | --- | --- | --- | --- |
| CON-001 | Identical receipt replay | P0 | PM/DOM | No | PASS | One receipt, movement and valuation. |
| CON-002 | Same key with changed payload | P0 | PM/DOM | No | PASS | HTTP 409; no additional stock. |
| CON-003 | Concurrent receipt requests | P0 | None | Yes | PASS | PM-QA: one 200, one rejection, one stock delta. |
| CON-004 | Concurrent duplicate SKU | P0 | None | Yes | NOT RUN | Database uniqueness present; service race not executed. |
| CON-005 | UI double-click | P1 | None | Yes | NOT RUN | API idempotency is covered; actual rapid-click UI not executed. |
| CON-006 | Lost response and retry | P0 | PM | No | PASS | Same key replays prior logical result. |
| CON-007 | Concurrent supplier settlement | P0 | CR | No | PASS | Duplicate and over-settlement both prevented. |

## T5 — Inspection, defects and claims

| Test ID | Scenario | Priority | Existing test | New test required | Status | Result / evidence |
| --- | --- | --- | --- | --- | --- | --- |
| QC-001 | Inspection-disabled quick receive | P1 | PM | No | PASS | Normal receipt posts without inspection. |
| QC-002 | Mandatory policy administration/enforcement | P0 | None | Yes | NOT IMPLEMENTED | `PurchasingPolicy` is not read by receiving and has no admin UI/API. |
| QC-003 | Defect metadata persistence | P0 | PM-QA | Yes | PASS | Reason, quantity and reference persist. |
| QC-004 | Held goods unavailable to POS | P0 | PM | No | PASS | Held quantity never enters `StockEntry`. |
| QC-005 | Unique discrepancy reference | P1 | PM-QA | Yes | PASS | `DISC-*` reference persisted. |
| QC-006 | Claim from receipt discrepancy | P1 | PM-QA | Yes | PASS | Supplier/PO/receipt/discrepancy relationships persist. |
| QC-007 | Supplier return dispatch and stock/value reversal | P0 | None | Yes | NOT IMPLEMENTED | Status/date change only; no dispatch aggregate or stock/valuation consequence. |
| QC-008 | Replacement receipt linkage | P0 | None | Yes | NOT IMPLEMENTED | No replacement receipt relationship. |
| QC-009 | Supplier credit note | P0 | None | Yes | NOT RUN | Service path exists; full reconciliation test not executed. |
| QC-010 | Partial claim resolution | P1 | None | Yes | NOT IMPLEMENTED | Claim has one terminal status; no resolved/remaining quantities. |
| QC-011 | Invalid claim transitions | P0 | None | Yes | FAIL | OPEN replacement claim can be directly resolved without replacement receipt. |
| QC-012 | Claim action UI | P1 | None | Yes | NOT IMPLEMENTED | UI can create/list only; transition actions are absent. |

## T6 — Supplier bills and three-way match

| Test ID | Scenario | Priority | Existing test | New test required | Status | Result / evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BILL-001 | Draft bill and totals | P0 | PM | No | PASS | Draft persists supplier, dates and totals. |
| BILL-002 | Ordered vs accepted vs invoiced match | P0 | None | Yes | FAIL | Quantity is ignored by match calculation. |
| BILL-003 | Price mismatch approval | P0 | None | Yes | PASS | Difference requires explicit approval. |
| BILL-004 | Invoice quantity exceeds accepted quantity | P0 | None | Yes | FAIL | 3 invoiced vs 2 accepted is labeled `MATCHED`. |
| BILL-005 | Several receipts allocated to one bill | P1 | None | Yes | NOT RUN | Allocation model exists; multi-receipt case not executed. |
| BILL-006 | Several bills against one PO | P1 | None | Yes | NOT RUN | Not executed. |
| BILL-007 | Duplicate supplier invoice | P0 | None | Yes | PASS | Duplicate identity rejected. |
| BILL-008 | Post one payable without stock/cash duplication | P0 | PM | No | PASS | One payable; zero bill-time cash; stock unchanged. |
| BILL-009 | Secure attachment upload/access/isolation | P0 | None | Yes | NOT IMPLEMENTED | Table exists; no attachment route or storage workflow. |
| BILL-010 | Credit application | P0 | None | Yes | NOT RUN | Service exists; end-to-end credit test absent. |
| BILL-011 | Draft edits/posted immutability | P1 | None | Yes | NOT IMPLEMENTED | No bill edit route/UI. |

## T7 — Payments and reconciliation

| Test ID | Scenario | Priority | Existing test | New test required | Status | Result / evidence |
| --- | --- | --- | --- | --- | --- | --- |
| FIN-001 | Unpaid bill creates no cash | P0 | PM/PF | No | PASS | Payable only. |
| FIN-002 | Partial payment | P0 | PF | No | PASS | ₹25,000 less ₹10,000 semantics covered by persisted reconciliation. |
| FIN-003 | Final payment | P0 | CR | No | PASS | Outstanding reaches zero. |
| FIN-004 | Duplicate payment | P0 | CR | No | PASS | One payment and one outflow. |
| FIN-005 | Supplier credit | P0 | None | Yes | NOT RUN | Service exists; not independently executed. |
| FIN-006 | Invalid payments | P0 | CR/PF | No | PASS | Over-settlement and authorization rejected. |
| FIN-007 | Ledger consistency | P0 | PF/REC | No | PASS | Payables, payments, accounts and transactions reconcile. |
| FIN-008 | No expense double-counting | P0 | PF/REC | No | PASS | Supplier settlement remains finance outflow, not operating expense. |
| FIN-009 | Direct purchase settlement | P0 | None | Yes | FAIL | Valid direct purchase body is rejected before orchestration. |
| FIN-010 | Dashboard/report reconciliation | P0 | REC | No | PASS | Independent persisted sums reconcile. |

## T8 — Valuation, COGS and transfers

| Test ID | Scenario | Priority | Existing test | New test required | Status | Result / evidence |
| --- | --- | --- | --- | --- | --- | --- | 
| VAL-001 | 10 @ ₹400 + 10 @ ₹600 = ₹500 average | P0 | None | Yes | PASS | PM-QA verifies stock and immutable valuation event. |
| VAL-002 | Store-specific costs | P1 | None | Yes | NOT RUN | Per-store field exists; differing-cost case not executed. |
| VAL-003 | Sale COGS after cost change | P0 | RET/REC/DOM | No | PASS | Sale cost snapshots reconcile. |
| VAL-004 | Later receipt does not rewrite prior COGS | P0 | REC/DOM | No | PASS | Historical snapshots retained. |
| VAL-005 | Return/exchange cost handling | P0 | RET | No | PASS | Focused rerun 10/10. |
| VAL-006 | Transfer preserves quantity/value policy | P0 | TR | No | PASS | Organization quantity net zero; cost fields preserved. |
| VAL-007 | Inventory valuation report reconciliation | P0 | REC | No | PASS | Independent closing value reconciles. |
| VAL-008 | Legacy cost fallback disclosure | P1 | None | Yes | NOT RUN | Fallback code inspected; no explicit unknown-cost reporting test. |
| VAL-009 | Negative stock and rounding | P0 | INV/DOM | No | PASS | Negative stock rejected; signed movements exact. |
| VAL-010 | Controlled corrections | P0 | None | Yes | FAIL | Receipt reversal/cost correction path is unusable due CHECK conflict. |

## T9 — Direct purchase

| Test ID | Scenario | Priority | Existing test | New test required | Status | Result / evidence |
| --- | --- | --- | --- | --- | --- | --- |
| DP-001 | Immediate paid purchase | P0 | None | Yes | FAIL | Route rejects valid direct-purchase-only fields. |
| DP-002 | Unpaid purchase | P0 | None | Yes | FAIL | Same parser defect blocks stock/payable pipeline. |
| DP-003 | Partial payment | P0 | None | Yes | FAIL | Blocked by parser defect. |
| DP-004 | Existing/new products | P1 | None | Yes | FAIL | Blocked by parser defect. |
| DP-005 | Invalid direct purchase | P0 | None | Yes | NOT RUN | Missing idempotency key is guarded; full invalid matrix not executed. |
| DP-006 | Retry safety | P0 | None | Yes | FAIL | Valid initial request cannot reach idempotency service. |
| DP-007 | Shared stock/finance pipeline | P0 | None | Yes | FAIL | Service is designed to share it but route cannot invoke it successfully. |

## T10 — UI and responsive coverage

| Test ID | Screen/scenario | Priority | Existing test | New test required | Status | Result / evidence |
| --- | --- | --- | --- | --- | --- | --- |
| UI-001 | Purchase Orders list | P1 | None | Yes | PASS | Heading, API health, desktop/tablet/mobile overflow; screenshots. |
| UI-002 | Create Purchase Order | P1 | None | Yes | PASS | Form renders at required viewports; screenshots. |
| UI-003 | Create Product | P1 | INV | Yes | PASS | Responsive form shell; screenshots. |
| UI-004 | Goods Receiving Queue | P1 | None | Yes | PASS | Search/filter/table shell; screenshots. |
| UI-005 | Receive Items & Map Products | P0 | None | Yes | PASS | Step workflow renders responsively; screenshots. |
| UI-006 | Inspection & Defects | P1 | None | Yes | PASS | Responsive table/filter shell; screenshots. |
| UI-007 | Supplier Claims & Returns | P1 | None | Yes | PASS | New Claim modal opens; responsive screenshots. |
| UI-008 | Supplier Bill & 3-Way Match | P0 | None | Yes | PASS | New Bill modal opens; responsive screenshots. |
| UI-009 | Payments & Purchase Summary | P1 | None | Yes | PASS | KPI/payables shell; responsive screenshots. |
| UI-010 | Direct Purchase | P0 | None | Yes | PASS | Form finishes loading at all viewports; backend confirmation remains FAIL. |
| UI-REF | Reference-image comparison | P2 | None | N/A | BLOCKED | Original nine-screen reference image was not supplied. |

## T11 — Security and integrity

| Test ID | Scenario | Priority | Existing test | New test required | Status | Result / evidence |
| --- | --- | --- | --- | --- | --- | --- |
| SEC-001 | Cross-tenant supplier/store access | P0 | TP/PM-QA | No | PASS | Foreign store and IDs rejected. |
| SEC-002 | Cross-tenant product links | P0 | TP/PM-QA | No | PASS | Foreign product rejected atomically. |
| SEC-003 | Cross-store scope | P0 | TP/TR | No | PASS | Fixed-store/organization rules enforced. |
| SEC-004 | Unauthorized PO creation | P0 | TP | No | PASS | Staff rejected. |
| SEC-005 | Unauthorized receipt posting | P0 | TP | No | PASS | Staff rejected. |
| SEC-006 | Unauthorized bill/payment operations | P0 | TP | No | PASS | Staff rejected. |
| SEC-007 | Attachment tenant isolation | P0 | None | Yes | NOT IMPLEMENTED | No supplier attachment endpoint exists. |
| SEC-008 | Malformed payload handling | P0 | multiple | No | PASS | Controlled 4xx responses. |
| SEC-009 | ID enumeration/isolation | P0 | TP | No | PASS | Foreign direct IDs cannot be read/mutated. |
| INT-001 | PO commitments | P0 | PF/REC | No | PASS | Open accepted remainder independently reconciled. |
| INT-002 | Arrived = accepted + held + rejected | P0 | PM/DOM | No | PASS | Contract and persistence verified. |
| INT-003 | Inventory movement equation | P0 | REC/DOM | No | PASS | Closing quantity/value reconciles. |
| INT-004 | Bills/credits to obligations | P0 | PM-QA | Yes | FAIL | Quantity mismatch can create an overstated payable. |
| INT-005 | Payments to account/ledger movement | P0 | PF/REC | No | PASS | Reconciled. |
| INT-006 | Valuation to inventory/COGS | P0 | REC/PM-QA | Yes | PASS | Receipt average and aggregate report reconcile. |

## Matrix totals

These totals count contractual scenarios in this matrix, not test-run invocations:

| Status | Count |
| --- | ---: |
| PASS | 69 |
| FAIL | 15 |
| BLOCKED | 1 |
| NOT IMPLEMENTED | 11 |
| NOT RUN | 17 |
| SKIPPED WITH REASON | 0 |
| Total scenarios | 113 |

Several FAIL rows share one root defect (for example, all direct-purchase cases share the strict-parser failure). Automated execution counts and deduplicated defect counts are reported separately in `PURCHASE_MANAGEMENT_QA_REPORT.md`.
