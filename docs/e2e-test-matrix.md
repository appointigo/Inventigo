# Stockiva application-wide E2E matrix

This inventory was derived from navigation, pages, API route handlers, Prisma models, services, and business-rule tests on 2026-10-07. P0 protects money, inventory, tenant data, or authorization; P1 is a primary workflow; P2 is secondary/intelligence behavior; P3 is presentation-only; OUT is WhatsApp and is intentionally deferred. All automated cases use the reset-only `stockiva_e2e` database, fake `.invalid` identities, disabled external credentials, and the isolated `.next-e2e` build.

Status meanings: **Automated** is covered by Playwright plus direct persistence assertions where material; **Unit** has deterministic lower-level coverage but no end-to-end workflow in this phase; **Deferred** is discovered and retained as future coverage; **Blocked** explains the missing prerequisite; **OUT** is prohibited in this phase.

Final remediation classification: **133 total = 103 E2E automated + 8 unit-only + 7 deferred + 3 blocked + 1 N/A + 11 WhatsApp deferred**. The full non-WhatsApp Playwright regression passed all 92 executable tests (including auth setup), all of which are ordinary regressions; no expected-failure defect reproductions remain. E2E safety passed 10/10. All 12 registered defects are FIXED + VERIFIED.

| ID | Surface | P | Scenario / expected result | Evidence | Status |
|---|---|---:|---|---|---|
| AUTH-01 | Login | P0 | Valid owner login and reusable session | Real login UI, secure session, dashboard | Automated |
| AUTH-02 | Login | P1 | Unknown user rejected | UI error, no session | Automated |
| AUTH-03 | Login | P1 | Known user / invalid password rejected | UI error, no session | Automated |
| AUTH-04 | Routing | P0 | Anonymous protected page redirects | Billing → login | Automated |
| AUTH-05 | APIs | P0 | Anonymous critical APIs reject | Billing, stock, finance 401 | Automated |
| AUTH-06 | Session | P1 | Navigation and reload retain session | Dashboard and products | Automated |
| AUTH-07 | Logout | P1 | Logout removes session | Cookie removed, protected redirect | Automated |
| AUTH-08 | OAuth | P2 | Google OAuth internal callback behavior | Provider absent with disabled credentials; no callback provider stub | Deferred — requires a safe provider stub |
| AUTH-09 | Registration | P1 | Register, verify email, forgot password | Would require email capture/token harness | Blocked — outbound email intentionally disabled |
| AUTH-10 | Invitations | P1 | Invite acceptance, expiry, single-use, and revoke authorization | Seeded token lifecycle; role and tenant-scoped revocation | Automated — FIXED P1-005 |
| SALE-01 | POS | P0 | Cash sale | Sale/item/payment/ledger/customer/stock exact deltas | Automated |
| SALE-02 | POS | P1 | UPI sale | Mapped UPI inflow and one stock movement | Automated |
| SALE-03 | POS | P1 | Card sale | Mapped card inflow and one stock movement | Automated |
| SALE-04 | POS | P0 | Split settlement | Two payments, one sale, one inventory decrement | Automated |
| SALE-05 | POS | P0 | Multiple products and quantities | Per-variant quantities and movements | Automated |
| SALE-06 | Discounts | P0 | Percentage discount | Billed total and allocated discount | Automated |
| SALE-07 | Discounts | P0 | Fixed discount | Billed total and allocated discount | Automated |
| SALE-08 | Validation | P0 | Zero quantity rejected atomically | No Sale delta | Automated |
| SALE-09 | Validation | P0 | Excess/invalid payment rejected atomically | Cash change is clamped; any non-cash excess, including ₹0.01, rejects atomically | Automated — FIXED P1-004 |
| SALE-10 | Stock race | P0 | Last unit sells once | Second sale rejected, stock remains zero | Automated (sequential contention) |
| SALE-11 | POS | P1 | Sale without customer | Current service requires mobile by design | Deferred — not a supported workflow |
| SALE-12 | Idempotency | P0 | Browser double-click/retry | Concurrent retry and later replay resolve to one sale; changed payload/key reuse returns 409 | Automated — FIXED P0-001 |
| PAY-01 | Receivables | P0 | ₹1,000 sale, ₹600 paid, ₹400 due | Sale/payment/customer/stock | Automated |
| PAY-02 | Receivables | P0 | Later ₹400 collection | Atomic conditional balance claim permits one simultaneous final collection | Automated — FIXED P0-002 |
| PAY-03 | Receivables | P0 | Fully unpaid credit sale | PENDING, ₹1,000 due, no payment/inflow | Automated |
| PAY-04 | Receivables | P0 | Over-collection rejected | No payment or due mutation | Automated |
| PAY-05 | Receivables | P1 | Aging and pagination | Credit row returned through receivables API | Automated (listing); boundary aging is Unit |
| RET-01 | Return | P0 | Full immediate refund | Return/items/liability/settlement/outflow/stock/customer | Automated |
| RET-02 | Return | P0 | Deferred refund | Liability only at return time; no cash | Automated |
| RET-03 | Refund | P0 | Two partial deferred settlements | Liability and two outflows reconcile | Automated |
| RET-04 | Return | P0 | Retry same idempotency key | Same transaction, one stock movement | Automated |
| RET-05 | Return | P0 | Partial quantity return | Only selected unit restored | Automated |
| RET-06 | Return | P0 | Excess/already-returned quantity | Rejected with no return/movement deltas | Automated |
| EX-01 | Exchange | P0 | Higher-value replacement | Return + replacement stock; only top-up collected | Automated |
| EX-02 | Exchange | P0 | Cheaper replacement | One refund settlement; no duplicate collection | Automated |
| EX-03 | Exchange | P0 | Equal-value replacement | No collection/refund, two stock movements | Automated |
| INV-01 | Products | P1 | Create product and size variant | Product/stock/opening movement | Automated |
| INV-02 | Products | P1 | Edit and search | Persisted update, paged search | Automated |
| INV-03 | Products | P1 | Barcode lookup | Exact tenant product/stock; invalid/not-found paths | Automated |
| INV-04 | Products | P1 | Duplicate SKU/barcode | Bulk retry returns 422 atomically; one product/stock row remains | Automated |
| INV-05 | Products | P2 | Activate/deactivate/archive | Inactive product remains stored/listable and new sale returns 400 | Automated |
| INV-06 | Stock | P0 | Manual stock in/out | Signed before/after/delta audit snapshots | Automated |
| INV-07 | Stock | P0 | Prevent negative manual stock | 422; stock unchanged | Automated |
| INV-08 | Stock | P1 | Search, low-stock, zero-stock filters | Store-scoped complete results | Automated |
| INV-09 | Stock | P1 | Movement history | Movements verified directly and dashboard renders | Automated |
| INV-10 | Stock | P0 | Inventory valuation | Finance KPI equals independent quantity × cost | Automated |
| INV-11 | Transfers | P1 | Draft→approved→dispatched→received | Two stores, paired movements, org net zero | Automated |
| INV-12 | Transfers | P0 | Store-scoped actor cannot create org transfer | Direct API 403 | Automated |
| INV-13 | Alerts | P2 | Low-stock rule and invalid threshold | Scoped detected item; invalid config rejected | Automated |
| CAT-01 | Categories | P1 | Tenant catalog read and page render | API scope and operational page smoke | Automated |
| CAT-02 | Categories | P2 | CRUD/bulk/template imports | Valid/duplicate/malformed API batches and CRUD/reference deletion | Automated (API + DB); client file parser remains Unit |
| CAT-03 | Brands | P1 | Tenant catalog read | API scope | Automated |
| CAT-04 | Brands | P2 | CRUD/bulk/template imports | Valid/duplicate/malformed API batches and CRUD/reference deletion | Automated (API + DB); client file parser remains Unit |
| CUST-01 | Customers | P1 | Create/normalize/update | Persisted normalized mobile/profile | Automated |
| CUST-02 | Customers | P1 | Duplicate and invalid customer | 400 validation | Automated |
| CUST-03 | Customers | P1 | Search/sort/pagination validation | Three real pages pass; phone matching is limited to phone-like queries | Automated — FIXED P1-003 |
| CUST-04 | Customers | P0 | Purchase history and lifetime spend | Customer detail vs persisted sale | Automated |
| CUST-05 | Customers | P0 | Collection is not a new purchase | Spend remains sale value | Automated |
| CUST-06 | Customers | P0 | Return/exchange spend adjustment | Zero/refinalized spend assertions | Automated |
| CUST-07 | Customer intelligence | P2 | Insights/action center | Page renders; query service unit coverage exists | Unit + page smoke |
| CUST-08 | Visits/follow-ups | P2 | Visit, demand, follow-up lifecycle | Routes/models discovered | Deferred — secondary workflow |
| CUST-09 | Lost opportunity | P2 | Demand evidence and fulfillment | Routes/services discovered | Unit; E2E deferred for deterministic history |
| PO-01 | Suppliers | P1 | Supplier scope/list | Seeded supplier visible only in tenant | Automated |
| PO-02 | Purchase orders | P1 | Create and submit | DRAFT→ORDERED, no cash | Automated |
| PO-03 | Receipt | P0 | Receive ordered stock | Receipt evidence and accepted stock delta | Automated |
| PO-04 | Payables | P0 | Create payable from receipt | Liability without automatic cash | Automated |
| PO-05 | Payables | P1 | Partial and final supplier payments | Status/outstanding/two outflows | Automated |
| PO-06 | Procurement intelligence | P2 | Suggested procurement actions | Deterministic policy tests | Unit — E2E needs historical demand snapshots |
| EXP-01 | Expenses | P1 | Approved expense creation/category/date | Valid positive amounts persist; zero/negative amounts are rejected without state | Automated — FIXED P1-001 |
| EXP-02 | Expenses | P1 | Settle expense | Paid financial fields/deletion are immutable, metadata remains editable, and expense equals its ledger outflow | Automated — FIXED P0-004 |
| EXP-03 | Expenses | P0 | Duplicate settlement rejected | One ledger event | Automated |
| EXP-04 | Expenses | P1 | Expense changes profit, not sales | Cross-API/DB reconciliation | Automated |
| EXP-05 | Expenses | P2 | Budgets, recurring, GST, edit/delete | Pages/routes discovered | Deferred — secondary lifecycle |
| FIN-01 | Ledger | P0 | Sale collections | Payment-linked inflows exact | Automated |
| FIN-02 | Ledger | P0 | Refund settlement | Settlement-linked outflows exact | Automated |
| FIN-03 | Ledger | P0 | Exchange top-up | Only incremental inflow | Automated |
| FIN-04 | Ledger | P0 | Supplier and expense settlement | Actual outflows only | Automated |
| FIN-05 | Finance summary | P0 | Cash, month movement, receivables | Independent ledger/account sums | Automated |
| FIN-06 | Working capital | P0 | Inventory value and payables | Independent DB sums | Automated |
| FIN-07 | Account transfers/adjustments | P1 | Idempotent paired ledger entries | Exact API retry plus persisted transfer/ledger assertions | Automated |
| DOC-01 | Invoice | P1 | Customer invoice JSON | Persisted sale/customer identifiers | Automated |
| DOC-02 | Invoice | P1 | PDF download | PDF type, attachment, non-trivial bytes | Automated |
| DOC-03 | Invoice | P0 | Cross-customer invoice denied | 404 | Automated |
| DOC-04 | Invoice management | OUT | Settings route mixes WhatsApp template options | Not invoked because WhatsApp calls are prohibited | OUT — architectural coupling documented |
| ANA-01 | Sales analytics | P0 | Revenue/returns/COGS/gross profit | Independent persisted sums | Automated |
| ANA-02 | Profitability | P0 | Gross profit−expenses=net profit | Analytics and expense DB sums | Automated |
| ANA-03 | Reports | P1 | Profit margin and sales breakdown | Same canonical trend totals | Automated |
| ANA-04 | Dashboard | P1 | Revenue series matches sales analytics | Exact day-series equality | Automated |
| ANA-05 | Finance | P0 | Cash differs correctly from revenue | Ledger reconciliation | Automated |
| ANA-06 | Customer | P0 | Lifetime spend follows sales/returns | Direct customer assertions | Automated |
| ANA-07 | Inventory | P0 | Closing stock/valuation | Movement and stock reconciliation | Automated |
| ANA-08 | Billing/order history | P1 | Invoice history and filters | Underlying sales checked | Deferred — dedicated table pagination assertions |
| ANA-09 | Date/time | P0 | Business-date range and invalid/reversed dates | IST canonical helper and 400 validation | Automated + Unit |
| ANA-10 | IST boundary | P0 | Transaction across 00:00 IST | Explicit 23:59/00:00/00:01 IST and cross-screen month/year semantics | Automated — FIXED P1-002 |
| ANA-11 | Integrity endpoint | P1 | Analytics integrity diagnostics | Isolated negative-stock fixture detected exactly and restored | Automated |
| SEC-01 | Tenancy | P0 | Org A cannot read Org B product/stock/analytics | Direct ID/store attempts denied | Automated |
| SEC-02 | Tenancy | P0 | Org B catalog excludes Org A | Independent real login | Automated |
| SEC-03 | Tenancy | P0 | Catalog/store/team/supplier reads exclude foreign IDs | Multi-endpoint response inspection | Automated |
| SEC-04 | Roles | P0 | Staff purchasing mutation forbidden | Direct API 403 | Automated |
| SEC-05 | Roles | P0 | Staff finance forbidden | UI, direct pages, expense CRUD and reports deny STAFF; OWNER/ADMIN allowed | Automated — FIXED P0-003 |
| SEC-06 | Workforce | P1 | Attendance in/out and repeat guards | One daily record, timestamps/minutes | Automated |
| SEC-07 | Workforce | P1 | Leave apply/overlap/approve/repeat guard | Request and balance exact | Automated |
| SEC-08 | Organization | P1 | Store and team scoped reads | Seeded members/stores, no foreign IDs | Automated |
| SEC-09 | Organization | P1 | Store/user/invitation mutations | Disposable invitation and platform user lifecycle; foreign OWNER and same-tenant STAFF revocation denied | Automated — FIXED P1-005 |
| SEC-10 | Settings | P1 | Organization/billing config | Legacy settings service is platform-global, not tenant-scoped | Blocked — product decision required |
| SEC-11 | Feature entitlements | P1 | Non-WhatsApp feature flags | Current tenant feature enum only contains WhatsApp | Not applicable outside OUT scope |
| OPS-01 | Pages | P2 | Primary operational pages render authenticated | 10 non-WhatsApp pages, no HTTP/application error | Automated |
| OPS-02 | Cron | P0 | Reorder cron unauthorized without secret | 401; no job side effects | Automated |
| OPS-03 | Cron | P1 | Authorized reorder evaluation | Missing/wrong secret 401; fixed E2E secret evaluates two orgs and low stock | Automated |
| OPS-04 | Database invariants | P0 | Critical CHECK constraints reject invalid business rows | Same-store transfer, zero requested quantity, negative purchase rejected | Automated (integration through Playwright worker) |
| INT-01 | Inventory intelligence | P2 | Portfolio/drilldown pages and calculations | Page smoke + metric unit suites | Unit + page smoke |
| INT-02 | Product intelligence | P2 | Product recommendations | Policy unit tests | Unit — historical fixtures deferred |
| INT-03 | Owner intelligence | P2 | Owner KPIs/actions | Unit tests | Unit — broad UI assertions deferred |
| INT-04 | Forecasting | P2 | Generate/outlook/customer/supplier signals | Scope/rule unit tests | Unit — insufficient historical observations |
| INT-05 | Replenishment | P2 | Recommendation lifecycle | Policy unit tests; transfer consumes live safety | Unit + partial E2E |
| INT-06 | Store performance | P2 | Multi-store comparison | Page/route discovered | Deferred — needs multi-period sales |
| INT-07 | Promo codes | P2 | CRUD and usage | API/model discovered; not wired into canonical POS | Deferred — product integration unclear |
| INT-08 | Platform admin | P1 | Organizations/users/features/audit/announcements/analytics | Separate SUPER_ADMIN login, global reads, owner denial, audited mutations; inactive and stale-claim sessions are revalidated | Automated — FIXED P0-005 |
| INT-09 | Pricing plans | P2 | Plan catalog/admin management | Catalog unit coverage plus privileged admin surface authorization | Automated + Unit |
| INT-10 | Upload | P2 | Product image/file upload | Anonymous 401 and disabled-provider 400 proven; successful object contract unavailable | Blocked — needs local blob adapter |
| EXT-01 | Demo request email | P2 | Public lead submission | Offline server-controlled capture proves exact lead payload and 202 success; deterministic adapter rejection proves sanitized 502; unrelated anonymous Finance API stays 401 | Automated — FIXED + VERIFIED P1-006 |
| SEC-12 | Direct API validation | P1 | Malformed JSON, foreign store, invalid IDs and referenced deletes | Controlled 4xx responses and atomic DB assertions | Automated |
| REF-01 | Referential integrity | P0 | Delete a product already used by a completed sale | Direct deletion is rejected; product, sale/COGS, invoice/customer and stock history survive | Automated — FIXED P0-006 |
| WA-01 | WhatsApp overview/readiness/health/status | OUT | Discovered pages and APIs | No invocation | OUT — deferred |
| WA-02 | WhatsApp accounts/embedded signup/sync | OUT | Account credential lifecycle | No invocation | OUT — deferred |
| WA-03 | WhatsApp phone numbers/sender mappings | OUT | Sender lifecycle | No invocation | OUT — deferred |
| WA-04 | WhatsApp templates | OUT | Template create/list/sync | No invocation | OUT — deferred |
| WA-05 | WhatsApp contacts/consent | OUT | Contact lifecycle | No invocation | OUT — deferred |
| WA-06 | WhatsApp conversations/messages/test-message | OUT | Messaging lifecycle | No invocation | OUT — deferred |
| WA-07 | WhatsApp campaigns/preview/execution | OUT | Campaign lifecycle | No invocation | OUT — deferred |
| WA-08 | WhatsApp automations | OUT | Automation lifecycle | No invocation | OUT — deferred |
| WA-09 | WhatsApp invoices/store profiles | OUT | Delivery/configuration | No invocation | OUT — deferred |
| WA-10 | WhatsApp webhooks and cron workers | OUT | Background processing | No invocation | OUT — deferred |

## Strong reconciliation scenario

The domain files create a deterministic composite business day: cash/UPI/card/split/discount/credit sales, later collection, immediate and deferred refunds, partial refund settlements, three exchange price cases, expense settlement, purchase receipt, supplier settlements, stock adjustments, and an inter-store transfer. `zz-reconciliation.spec.ts` then independently derives revenue, return adjustment, COGS, expenses, cash movement, receivables, and inventory value from persisted transaction data and compares those values with Sales Analytics, Profitability, Reports, Dashboard, and Finance.

## Explicit exclusions and limits

- **WhatsApp — intentionally deferred to separate testing phase.** The E2E tenant remains disabled and no WhatsApp page, route, worker, webhook, template, campaign, message, credential, or Meta API is exercised.
- Google OAuth, outbound email, external blob storage, and authorized cron execution require safe local adapters before they can be automated.
- Platform-admin operations need a separate disposable super-admin bootstrap and must not reuse tenant-owner authorization.
- Forecasting and several intelligence workflows need a purpose-built multi-period historical fixture. Their deterministic rules remain covered by the repository's unit suites.
- The current run uses Chromium desktop. Mobile layout, scanner hardware focus behavior, visual snapshots, and accessibility auditing remain P2/P3 follow-up coverage.
