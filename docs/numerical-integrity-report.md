# Numerical integrity audit report

Audit date: 2026-10-06. Scope: repository application logic, APIs, screens, reports, exports/print models, schema and tests. No production data was read or modified.

## Executive audit result

- 50 material numerical consumers were mapped across dashboard, POS/billing, analytics, customers, finance, inventory, procurement, reports and forecasting.
- 14 implementation inconsistencies were confirmed and corrected; no known formula inconsistency remains in the mapped canonical paths.
- The corrections are code/schema changes only. Historical cached customer spend was not rewritten.

## Confirmed discrepancies and remediation

| Metric                       | Locations                                                | Before                                                                                      | Root cause                                                               | Fix                                                                                                                  | After                                                      | Status |
| ---------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ------ |
| Exchange revenue             | Overview vs Sales Analytics                              | A ₹1,799 original exchanged for ₹2,398 could be reported as ₹4,197 by Overview              | Dashboard added original sale and raw replacement value (`offset + net`) | Dashboard now consumes canonical sales analytics; return adjustment is `netAmount - refundAmount`                    | Retained sale value ₹2,398; incremental adjustment ₹599    | PASS   |
| Product exchange revenue     | Product, inventory, replenishment and owner intelligence | Raw replacement unit prices bypassed exchange discount, tax and round-off                   | Independent gross-line formulas                                          | Allocate `finalPayable` across replacement lines at paise precision                                                  | Line totals sum exactly to finalized replacement bill      | PASS   |
| Customer lifetime spend      | Customer cache/list/stats                                | Initial sale and later receivable collection both increased spend                           | Payment collection mutated revenue cache; returns used only `netAmount`  | Removed collection increment; all computed views use retained sale + `net-refund`                                    | Collection changes cash/receivable only                    | PASS   |
| Customer order stats         | Customer mobile stats vs customer intelligence           | Refunded/exchanged sales were omitted entirely in one endpoint                              | Filter was `status = COMPLETED` and ignored return events                | Query recognized statuses and calculate retained value per order                                                     | Same retained-order definition                             | PASS   |
| Refund liability             | POS, Finance, Billing KPI                                | Immediate negative refund payment and a full pending liability represented the same ₹ twice | Return flow always created a pending liability                           | Immediate refund creates a settled liability plus linked payment/settlement; deferred creates only pending liability | Immediate outstanding ₹0; deferred outstanding full amount | PASS   |
| Refund retry                 | POS return submission                                    | A retried request could repeat stock, return and refund mutations                           | No return idempotency key                                                | Stable client idempotency header plus unique ReturnTransaction key and concurrent retry lookup                       | One transaction per request key                            | PASS   |
| Collections/payment mix      | Billing and payment chart                                | Negative refunds reduced “Total Received” and payment shares                                | Positive and negative SalePayment rows were summed together              | Positive rows feed Collections; canonical RefundSettlements feed Refunds Paid; net movement is separate              | Three explicit values reconcile                            | PASS   |
| Pending refund KPI           | Billing vs Finance                                       | Billing summed every historical return refund as pending                                    | KPI read ReturnTransaction.refundAmount, not liability balance           | Sum only PENDING/PARTIAL RefundLiability.outstandingAmount                                                           | Same outstanding balance as Finance                        | PASS   |
| Refund count                 | Billing                                                  | Fully refunded sales plus their return transaction were counted twice                       | Two representations were added                                           | Count refund-bearing ReturnTransactions once                                                                         | One refund event per return                                | PASS   |
| Inventory totals             | Dashboard/report/alerts vs Stock                         | Fixed 1,000/10,000 row limits silently truncated larger stores                              | Pagination cap used as “all rows”                                        | Added complete stock retrieval and full movement pagination                                                          | All variants included once                                 | PASS   |
| Low-stock pagination         | Stock screen                                             | Filter happened after page slicing and total described unfiltered rows                      | Field comparison was deferred until after pagination                     | Filter complete candidate set, then paginate and return filtered total                                               | Page and total describe same set                           | PASS   |
| Date boundaries              | Billing KPI and expense profitability                    | Host-local month/end-of-day arithmetic could disagree with IST analytics                    | Local `Date` constructors and `setDate`                                  | Shared inclusive IST business dates with exclusive upper bounds                                                      | Equivalent ranges share boundaries                         | PASS   |
| Currency aggregation         | Charts and financial summaries                           | Repeated binary floating-point sums could expose fraction drift                             | Independent `Number` accumulation                                        | Shared paise conversion, sum, rounding and exact allocation                                                          | Exact two-decimal totals                                   | PASS   |
| Duplicate dashboard formulas | Two dashboard services                                   | Parallel raw-SQL implementations could drift                                                | Compatibility and main services duplicated formulas                      | Legacy path re-exports the canonical implementation                                                                  | One dashboard formula path                                 | PASS   |

## Deterministic control dataset

The independent control ledger covers cash, UPI, card, discounted, split and partial sales; later collection; pure return; higher-value exchange/top-up; lower-value exchange/refund; expense; purchase receipt/payable; and closing inventory. Cancellation is not modeled because the active recognized-sale path has no supported cancellation event in this dataset.

| Metric                  |   Expected | Reconciled |
| ----------------------- | ---------: | ---------: |
| Gross sales             | ₹13,394.00 | ₹13,394.00 |
| Discounts               |    ₹100.00 |    ₹100.00 |
| Returned merchandise    |  ₹5,996.00 |  ₹5,996.00 |
| Replacement sales       |  ₹4,197.00 |  ₹4,197.00 |
| Net sales               | ₹11,495.00 | ₹11,495.00 |
| COGS                    |  ₹6,800.00 |  ₹6,800.00 |
| Gross profit            |  ₹4,695.00 |  ₹4,695.00 |
| Expenses                |    ₹500.00 |    ₹500.00 |
| Net profit              |  ₹4,195.00 |  ₹4,195.00 |
| Orders                  |          8 |          8 |
| Units sold              |          8 |          8 |
| AOV                     |  ₹1,436.88 |  ₹1,436.88 |
| Collections             | ₹13,893.00 | ₹13,893.00 |
| Refunds paid            |  ₹2,398.00 |  ₹2,398.00 |
| Net settlement movement | ₹11,495.00 | ₹11,495.00 |
| Receivables             |      ₹0.00 |      ₹0.00 |
| Closing stock           |   36 units |   36 units |
| Inventory cost value    | ₹31,600.00 | ₹31,600.00 |
| Inventory retail value  | ₹54,375.00 | ₹54,375.00 |
| Purchases received      |  ₹3,000.00 |  ₹3,000.00 |
| Supplier payable        |  ₹3,000.00 |  ₹3,000.00 |

## Historical-data note

The customer `totalSpent` cache may already contain historical payment-as-revenue drift. This release corrects prospective writes and exposes drift through the data-integrity diagnostic; it deliberately does not alter production data. Any backfill must be separately reviewed and run against a confirmed non-production copy before production approval.

## Validation and remaining limits

- Prisma schema validation, TypeScript typecheck, all configured unit/module test scripts, the numerical reconciliation suite, production build and `git diff --check` pass.
- Repository-wide ESLint remains at its pre-existing baseline of 222 findings (139 errors, 83 warnings); this audit did not broaden into unrelated lint cleanup.
- Database-writing legacy integration tests were not run because the configured database was not confirmed as an isolated test database. No migration was applied.
- Browser E2E was intentionally deferred until this prerequisite audit; responsive and print calculation paths were traced statically and the production build completed.
