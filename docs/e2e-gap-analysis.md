# Stockiva non-WhatsApp E2E gap analysis

Reviewed 2026-10-07 against the matrix, API routes, services, Playwright suite, and deterministic unit coverage. This final pass started at **89 automated, 9 unit-only, 14 deferred, 6 blocked, 1 N/A, and 11 WhatsApp deferred** and ended at **102 automated, 8 unit-only, 7 deferred, 4 blocked, 1 N/A, and 11 WhatsApp deferred** across 133 scenarios. WhatsApp is excluded and remained uninvoked.

The table below accounts for every one of the 33 non-WhatsApp matrix rows that was not fully E2E automated at the start of this phase. “Unit sufficient” means browser/API/DB coverage would currently add little confidence without first adding a missing adapter, authorization identity, historical fixture, or product decision.

| ID | Why it was missing | Safe automation / prerequisite | Expected business behavior | Priority | Unit sufficient? | Phase result |
|---|---|---|---|---:|---|---|
| AUTH-08 | Real Google OAuth is an external dependency | Safe only with a local OAuth provider/callback stub | Valid state/nonce links the intended identity; invalid callbacks fail closed | P2 | No | Deferred — provider stub required |
| AUTH-09 | Registration/reset require email tokens | Add an in-memory SMTP/token capture adapter | Verification and reset tokens are single-use, scoped, and expiring | P1 | No | Blocked — mail capture required |
| AUTH-10 | No deterministic invitation token lifecycle fixture | Seed invitation and clock-controlled expired token | Only intended org/role can accept once; expired token rejected | P1 | No | Automated — lifecycle passes; cross-tenant revoke exposes P1-005 |
| SALE-11 | Current service requires customer mobile | Product decision on anonymous/walk-in customer semantics | Either documented rejection or a canonical walk-in identity | P1 | No | N/A for current supported workflow |
| SALE-12 | No durable sale idempotency contract | Safe API retry plus DB deltas | One logical retry creates one sale and one set of side effects | P0 | No | Automated — reproduces P0-001 |
| INV-04 | Constraint existed but public error semantics were undecided | Safe duplicate SKU/barcode API probes | Duplicate identifiers rejected atomically with stable client error | P1 | Partly | Automated — duplicate import is 422 and atomic |
| INV-05 | Archive/deactivation sale semantics were unspecified | Decide whether inactive stock is sellable/transferable/returnable | Inactive product is consistently excluded from new commerce but historical documents remain valid | P1 | No | Automated — inactive product retained; new sale rejected |
| CAT-02 | CSV/bulk routes need representative fixtures | Add valid, duplicate, malformed, and cross-tenant CSV fixtures | Atomic or explicitly partial import with actionable row errors | P2 | No | Automated at API + DB boundary; parser remains unit-level |
| CAT-04 | Same bulk/import gap as categories | Add brand CSV fixture pack | Scoped import with deterministic duplicate behavior | P2 | No | Automated at API + DB boundary; parser remains unit-level |
| CUST-07 | Intelligence rules had unit tests and page smoke only | Historical customer fixture with known segment/action outputs | UI/API aggregates equal direct sale/return history | P2 | Partly | Deferred — history fixture required |
| CUST-08 | Visit/follow-up routes lacked deterministic lifecycle data | Safe now after purpose-built visit/outcome fixture | Visit, demand, follow-up and outcome remain customer/org scoped | P2 | No | Deferred — secondary workflow fixture |
| CUST-09 | Lost-opportunity calculations depend on historical evidence | Multi-period demand and fulfillment fixture | Lost demand is counted once and closes on fulfillment | P2 | Yes for rules | Deferred — E2E history fixture required |
| PO-06 | Procurement suggestions depend on demand snapshots | Seed multi-period demand, lead time, and inbound orders | Recommendations preserve safety stock and avoid double-counting inbound | P2 | Yes for policy | Deferred — historical fixture required |
| EXP-05 | Budgets/recurrence/edit/delete were secondary and stateful | Basic amount/edit probes are safe; recurrence needs a clock/job harness | Positive valid expenses only; settled expense and ledger stay reconciled | P1 | No | Partially automated — reproduces P1-001 and P0-004; recurrence remains deferred |
| FIN-07 | Transfer/adjustment invariants only had rule tests | Safe with deterministic accounts and idempotency keys | Retry yields one transfer pair or one adjustment posting | P1 | No | Automated — API + DB retry coverage added |
| ANA-08 | Billing history had underlying sale coverage, not table paging | Create records crossing its actual paging/filter boundary | Complete, stable pages and aggregates independent of visible page | P1 | No | Deferred — dedicated history pagination still needed |
| ANA-10 | Date utility was unit-only; real DB clocks were not exercised | Explicit transaction instants around 00:00 IST | All screens assign the same business date/month | P0 | No | Automated — reproduces P1-002 Finance mismatch |
| ANA-11 | Integrity endpoint needs deliberate inconsistent legacy data | Use an isolated synthetic legacy fixture, never ad-hoc corruption | Diagnostics identify mismatch without mutating records | P1 | No | Automated — exact negative-stock diagnostic and restoration |
| SEC-09 | Admin mutations can be destructive and invitations need email | Disposable secondary store/user plus mail capture | Role/store/invitation changes are authorized, scoped, auditable | P1 | No | Automated without delivery — token/user lifecycle; cross-tenant revoke exposes P1-005 |
| SEC-10 | Settings service is platform-global rather than tenant-scoped | Product decision and tenant migration first | Organization A cannot observe or change Organization B settings | P0 | No | Blocked — tenancy model decision required |
| SEC-11 | Only WhatsApp exists in tenant feature enum | Add a real non-WhatsApp entitlement first | Disabled feature is blocked in UI and API | P1 | N/A | N/A outside excluded WhatsApp scope |
| OPS-03 | Safety policy intentionally removed cron secret | Fixed web-server-only E2E secret with all provider credentials absent | Authorized evaluation is read-only and deterministic | P1 | No | Automated — missing/wrong 401; correct 200; no durable job row by design |
| INT-01 | Inventory intelligence had policy tests/page smoke | Historical stock/demand snapshots | Portfolio and drill-down equal direct stock/movement calculations | P2 | Partly | Deferred — historical fixture required |
| INT-02 | Recommendations need history and policy inputs | Multi-period product fixture | Recommendations are explainable, scoped, and numerically reproducible | P2 | Yes for rules | Deferred — history fixture required |
| INT-03 | Owner KPI/action UI lacked broad assertions | Composite multi-period tenant fixture | Owner KPIs equal canonical domain metrics | P2 | Partly | Deferred — fixture expansion required |
| INT-04 | Forecasting needs sufficient observations | Seed clock-stable daily observations and supplier signals | Forecast range/evidence quality are deterministic and scoped | P2 | Yes for rules | Deferred — observations required |
| INT-05 | Only policy and transfer consumption were covered | Seed recommendations through completion | Recommendation transitions once and reconciles to stock/PO | P2 | Partly | Deferred — lifecycle fixture required |
| INT-06 | Store comparison needs multiple stores and periods | Seed matched multi-period Store A/B sales | Same filters yield comparable canonical metrics | P2 | No | Deferred — multi-period fixture required |
| INT-07 | Promo CRUD exists but canonical POS integration is unclear | Decide supported POS linkage and usage rollback | Server validates promo and usage remains idempotent through returns | P2 | No | Deferred — product integration decision required |
| INT-08 | Platform admin is a separate privileged surface | Disposable `SUPER_ADMIN` bootstrap and isolated context | Tenant users are denied; admin actions are audited and scoped | P0 | No | Automated — authorization/mutations pass; stale inactive JWT exposes P0-005 |
| INT-09 | Admin management depends on INT-08 | Same disposable super-admin fixture | Plan changes are authorized and entitlement-consistent | P2 | Yes for catalog | Automated authorization + existing catalog Unit coverage |
| INT-10 | Upload requires external blob credentials | Local blob adapter with deterministic object cleanup | Type/size/scope enforced; no cross-tenant object access | P2 | No | Blocked — local blob adapter required |
| EXT-01 | Public demo request sends email | Local mail capture with real delivery credentials absent | Valid lead captured once; invalid/rate-limited submissions rejected | P2 | No | Blocked — mail capture required; public route also reproduces P1-006 |

## Coverage added from this review

- Durable sale retry evidence; receivable, return, refund, exchange, supplier, account-transfer and adjustment retry behavior.
- Simultaneous last-unit sale, receivable collection, return, refund, and supplier payable settlement.
- Paise, under/overpayment, maximum discount, oversized flat discount, percentage overflow, split-payment allocation, discounted return, and invalid-return atomicity.
- Zero/negative expense probes and settled-expense ledger reconciliation.
- Real three-page customer pagination and a combined customer business lifecycle.
- Strong direct-ID tenant attacks across customer, sale, invoice/PDF, supplier, purchase order, and expense routes.
- Lower-privilege Finance/Reports UI-versus-API authorization comparison.
- Real IST month-boundary comparison between Sales Analytics and Finance.

## Deliberately not converted

External OAuth, email, and blob cases remain blocked because their provider boundaries cannot be replaced without a production seam. Legacy global settings remain blocked on a tenancy decision. Historical intelligence remains deferred with exact multi-period fixture prerequisites; its pure policies retain deterministic unit coverage. Authorized reorder cron and platform admin were safely converted using test-only configuration and disposable database identities. No production behavior was changed.

## Final remaining non-WhatsApp gaps

The complete pre-implementation decision record is in `docs/e2e-remaining-gaps.md`. After this pass, the remaining release-relevant gaps are:

| Scenario | Why not automated | Exact prerequisite | Future test type | Release significance |
|---|---|---|---|---|
| AUTH-08 Google OAuth | No local OIDC/provider replacement | Local OIDC stub with callback/state/nonce inspection | Contract + integration + browser | P2; required before relying on Google sign-in |
| AUTH-09 registration/reset email | Tokens cannot be captured without invoking provider code | Local mail capture with failure controls | Integration + browser | P1; required before auth release confidence |
| SEC-10 tenant settings | Current implementation is platform-global | Tenant model/product decision and migration | Integration + API | P0 cross-tenant design risk |
| INT-10 blob upload | Direct Vercel Blob boundary has no local adapter | Blob emulator/adapter with object inspection | Contract + integration | P2; required before upload release |
| EXT-01 demo email | Direct Resend boundary has no capture adapter | Local mail capture with payload/failure inspection | Integration + API | P2 lead-delivery risk |
| CUST-08 visits/follow-ups | Lifecycle fixture not yet shared across intelligence domains | Reusable customer visit/demand/follow-up history pack | API + DB | P2 |
| EXP-05 recurrence execution | No scheduler/clock execution harness | Clock-controlled recurrence runner | Integration | P1 accounting |
| ANA-08 history pagination | Needs an isolated high-cardinality sale pack | Stable multi-page invoice fixture | API + DB | P1 |
| INT-01/02/03/04/05/06 and CUST-07/09, PO-06 | Routes require coherent multi-period sales, return, demand, forecast, supplier and store evidence | One reusable clock-stable historical fixture with independent expected calculations | API + DB | P2 decision-support; unit rules already pass |
| INT-07 promo usage | POS does not consume the promo contract | Product decision and canonical sale/return integration | API + DB | P2 until feature is wired |
