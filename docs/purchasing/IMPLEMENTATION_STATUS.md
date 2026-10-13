# Purchase Management implementation baseline

Baseline captured on 2026-10-12 before the master purchase-management implementation continued. This file records code and schema state; it does not assert that any migration has been applied to a shared database.

## Status legend

- **ALREADY IMPLEMENTED** — present and reusable in the current worktree.
- **PARTIALLY IMPLEMENTED** — usable foundation exists but the master workflow is incomplete.
- **MISSING** — no production implementation was found.
- **NEEDS REFACTORING** — current behavior conflicts with a required invariant or cannot safely support the target workflow.
- **BLOCKED** — requires an external decision or an explicitly authorized deployment/database operation.

## Existing architecture

| Capability | Status | Current implementation | Gap / action |
| --- | --- | --- | --- |
| PO draft, edit, issue, cancel | PARTIALLY IMPLEMENTED | `src/modules/purchase-orders/services/poService.ts`, `src/app/api/purchase-orders/` | Human PO numbers, issued document evidence, delivery instructions, richer filters and edit UI are absent. |
| Existing-product PO lines | ALREADY IMPLEMENTED | `PurchaseOrderItem.productId/sizeId`, `POForm.tsx` | Selection UI loads a bounded client-side product list and needs server-side search, zero-stock visibility, and variant metadata. |
| Provisional PO lines | PARTIALLY IMPLEMENTED | `PurchaseOrderItemKind`, snapshot columns, migration `20261011110000_add_provisional_purchase_items` | UI is limited; unknown/assorted lines still require brand, category and size. One source line cannot currently be submitted as multiple receipt mappings. |
| Product creation without stock | ALREADY IMPLEMENTED | Product APIs/services do not post stock on Product creation. | Product and receiving forms must share the same creation contract. |
| Receipt idempotency | NEEDS REFACTORING | Unique `PurchaseOrderReceipt.confirmationId`; receipt posting is serializable and locks the PO row. | The idempotency key is not bound to a canonical payload. Same key + changed payload currently returns the prior result instead of `409`. |
| Concurrent receipt safety | ALREADY IMPLEMENTED | Serializable transaction, PO row lock, remaining-quantity validation and retry logic in `poService.ts`. | Preserve and add focused regression coverage. |
| Partial/multiple deliveries | PARTIALLY IMPLEMENTED | PO status derives from accumulated physical receipt quantities. | Receipt UI lacks delivery batches, held quantity, split mappings, history and immutable correction/reversal events. |
| Accepted-only stock posting | ALREADY IMPLEMENTED | Receipt transaction increments `StockEntry` and creates `StockMovement` only for accepted quantity. | Add generic variant and valuation evidence while preserving this single posting path. |
| Defect evidence | PARTIALLY IMPLEMENTED | `PurchaseOrderReceiptDefect` stores quantity, reason and image references. | No discrepancy number, inspection policy, quarantine balance, supplier claim or controlled attachment access workflow. |
| Short close | ALREADY IMPLEMENTED | `CLOSED` status and closure audit columns/API. | UI label should expose “Closed Short”; reporting must exclude closed remainder from inbound. |
| Generic product variants | MISSING | Product uses JSON `attributes`; stock identity is fixed to `Product + Size + Store`. | Add a compatible `ProductVariant` identity while retaining legacy `Size` FKs during migration. |
| Supplier claims/returns/replacements | MISSING | No purchasing claim aggregate. | Add discrepancy, claim, dispatch, replacement receipt and credit resolution records. |
| Supplier bills / 3-way match | MISSING | `SupplierPayable` can reference one receipt; invoice metadata is minimal. | Add bill/header/lines/receipt allocations/attachments and post into the existing payable ledger exactly once. |
| Supplier settlement | ALREADY IMPLEMENTED | `financeService`, payables/payment APIs, idempotent `SupplierPayment` and `FinancialTransaction`. | Link payments to posted supplier bills; bills establish obligations, payments alone create cash outflow. |
| Direct purchase | PARTIALLY IMPLEMENTED | Legacy `Purchase`, `PurchaseItem`, `PurchaseItemOption` foundation exists. | It is disconnected from accepted-only receipt posting, payables and valuation. Evolve it as an origin into the shared receipt/bill pipeline. |
| Inventory valuation / COGS | NEEDS REFACTORING | Product `costPrice`, sale-item cost snapshots and transfer cost fields exist; receipt actual cost is recorded. | No authoritative per-store variant moving-average layer or immutable valuation event tied to receipts. Never backfill guessed historical costs. |
| Purchase UX | PARTIALLY IMPLEMENTED | List, create, detail and basic receive screens use Ant Design and existing dashboard shell. | Nine-screen workspace, queue, step receiving, inspection, claims, bills, payment summary, responsive polish and accessibility remain. |
| Tenant/store isolation | PARTIALLY IMPLEMENTED | Purchase routes use `requirePurchaseUser`, `resolveAnalyticsStore`, org-scoped service checks and role rules. | New records need direct org/store scope, ownership validation and attachment authorization. |

## Current data model and constraints

- `PurchaseOrder` is scoped indirectly through `Store`, references one `Supplier`, and supports `DRAFT`, `ORDERED`, `PARTIALLY_RECEIVED`, `RECEIVED`, `CLOSED`, and `CANCELLED`. It has no readable PO number or immutable issued snapshot.
- `PurchaseOrderItem` supports nullable catalog links and immutable descriptive snapshots. Existing provisional validation nevertheless requires brand, category and size labels.
- `PurchaseOrderReceipt.confirmationId` is globally unique. `PurchaseOrderReceiptItem` records accepted/rejected/damaged totals and optional resolved product/size. There is no payload hash or receipt posting state.
- `StockEntry` is uniquely identified by `(productId, sizeId, storeId)`. `variantSku` is descriptive, not an identity FK. `StockMovement` records before/after/delta and PO source references.
- `Product` is tenant-scoped and SKU-unique per organization. `Size` is category-scoped. `ProductSupplier` is unique per product/supplier.
- `SupplierPayable.receiptId` is unique, so the legacy model assumes at most one payable per receipt. `SupplierPayment` and `FinancialTransaction` use unique idempotency keys.
- Legacy direct purchases use `Purchase`, `PurchaseItem`, and `PurchaseItemOption`; they are separate from the PO receipt workflow.

## Reusable services and components

- Authorization and error mapping: `src/modules/purchase-orders/purchaseRoute.ts`, analytics store scoping, Finance access helpers.
- PO state and stock posting transaction: `src/modules/purchase-orders/services/poService.ts`.
- Catalog query across product, SKU, brand and category: `src/modules/purchase-orders/services/purchaseCatalogService.ts` and `/api/purchase-orders/catalog`.
- Product creation: `src/modules/products/services/productService.ts` and `/api/products`.
- Financial obligations and settlements: `src/modules/finance/financeService.ts`, `/api/finance/payables`, `/api/finance/payables/[id]/payments`.
- Stock movement audit fields and transfer cost preservation: stock and stock-transfer services.
- Dashboard shell, Ant Design controls, responsive page conventions, supplier/product hooks and existing report services.

## Major consistency and migration risks

1. A receipt key reused with changed content is currently accepted as a replay. Add a canonical SHA-256 payload hash and reject mismatches before returning the original response.
2. Creating a second stock/bill ledger would double-count inventory or cash. All accepted stock must continue through one receipt posting transaction; all settlements must continue through `SupplierPayment`/`FinancialTransaction`.
3. Replacing `Size` relationships in one cutover would break POS, sales, returns, transfers and reports. Generic variants must be additive with legacy compatibility columns.
4. Existing receipt rows have no held quantity, payload hash or posting state. Backfills may derive only deterministic facts; ambiguous inspection/valuation history must remain explicitly unknown.
5. Existing global receipt confirmation IDs are stricter than tenant-local uniqueness. Keep them globally unique for compatibility unless a later controlled cutover proves otherwise.
6. `SupplierPayable.receiptId @unique` cannot represent flexible bill allocations. New bill allocation records must coexist; legacy payable references remain for compatibility.
7. Historic product `costPrice` is not reliable evidence for reconstructing receipt cost. Do not manufacture valuation events for legacy stock.

## Implementation sequence

1. Add organization-aware PO numbering, generic variants, receipt payload/posting evidence, discrepancy/claim, bill/allocation, valuation and direct-purchase links through additive migrations.
2. Bind receipt idempotency keys to canonical request payloads and permit multiple mapping groups for one PO line while retaining transactional quantity enforcement.
3. Redesign list/create/detail/receiving UI and add queue, inspection, claims, bills and summary routes in the existing dashboard shell.
4. Connect bill posting to the existing payable ledger and payment service; connect accepted receipts to the valuation layer without re-posting stock.
5. Integrate direct purchases as a shared receipt-and-finance orchestration path.
6. Add focused domain/integration tests, then run the final static, build, regression and isolated E2E gates.

## Deployment boundary

Schema and migration files may be created locally. Applying migrations to shared/staging/production databases and any production rollout remain **BLOCKED** pending explicit authorization and environment verification.
