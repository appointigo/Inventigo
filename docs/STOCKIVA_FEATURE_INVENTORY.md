# Stockiva — Complete Feature Inventory

**Audit date:** 26 September 2026  
**Branch:** `front-page-rewamp`  
**Commit:** `c426d43cfba32a2fc148bac0f990612350f0ae7a`  
**Scope:** Repository state at the commit above, including application routes, UI modules, API routes, services, Prisma schema and migrations, authentication/authorization, integrations, scheduled endpoints, utilities, and automated tests.  
**Total features identified:** 192

## Status summary

| Status | Count |
|---|---:|
| Implemented | 155 |
| Partial | 17 |
| Backend Only | 8 |
| UI Only | 3 |
| Broken | 1 |
| Disabled | 2 |
| Unverified | 6 |
| **Total** | **192** |

“Implemented” means the required UI and backend are present with no obvious missing dependency; it does not mean the feature has passed end-to-end production testing. The evidence paths are repository-relative. “Desktop” and “mobile” describe the intended UI surface visible in code.

## Executive summary

Stockiva is a multi-store retail operations product with working catalog, stock, purchasing, POS billing, returns/exchanges, customers, demand capture, expenses, staff attendance/leave, analytics, alerts, barcode tooling, and a large WhatsApp operations suite. It also contains a separate super-admin console. The strongest repository-tested areas are customer workflows, inventory intelligence, demand intelligence, invoice rendering, pricing compatibility, and WhatsApp orchestration.

The principal gaps are not in the core retail flow but around operational completeness: two-factor authentication is not enabled, password recovery does not send recovery mail, pricing-plan editing is static UI, organization suspension has no action behind it, image-based color extraction is a placeholder, no stock-transfer workflow exists, and payroll/accounting beyond expenses and GST reporting is absent. External behavior such as Google sign-in, object uploads, PDF browser rendering, camera access, email, and Meta WhatsApp delivery still requires environment-backed manual verification.

## Modules inspected

Authentication and onboarding; organizations, stores, users, invitations and roles; products, categories, brands and colors; inventory, movements, alerts and barcode tools; suppliers and purchase orders; POS, payments, invoices, promotions, returns and exchanges; customers, visits and follow-ups; demand intelligence; dashboards, inventory intelligence and reports; WhatsApp; settings; expenses/GST/budgets; attendance and leave; platform administration; responsive/mobile interfaces; public landing/demo and technical infrastructure.

## Feature overview

| Module | Features | Status distribution |
|---|---:|---|
| Authentication & organization | 15 | 12 Implemented, 1 Partial, 1 Disabled, 1 Unverified |
| Product catalog | 18 | 16 Implemented, 1 Partial, 1 Unverified |
| Inventory, alerts & barcodes | 16 | 12 Implemented, 2 Backend Only, 1 Partial, 1 Unverified |
| Suppliers & purchasing | 9 | 8 Implemented, 1 Partial |
| Billing, POS & promotions | 20 | 18 Implemented, 1 Partial, 1 Unverified |
| Returns, exchanges & refunds | 8 | 7 Implemented, 1 Partial |
| Customers & follow-ups | 13 | 11 Implemented, 2 Partial |
| Demand intelligence | 10 | 9 Implemented, 1 Partial |
| Dashboards, analytics & reports | 13 | 12 Implemented, 1 Backend Only |
| WhatsApp | 22 | 15 Implemented, 3 Backend Only, 3 Partial, 1 Unverified |
| Settings & administration | 10 | 7 Implemented, 1 Partial, 1 Disabled, 1 Broken |
| Expenses, accounting & payroll | 12 | 8 Implemented, 3 Partial, 1 UI Only |
| Attendance & leave | 8 | 7 Implemented, 1 Backend Only |
| Platform administration | 10 | 7 Implemented, 2 UI Only, 1 Backend Only |
| Mobile & responsive | 5 | 4 Implemented, 1 Partial |
| Other capabilities | 3 | 2 Implemented, 1 Unverified |
| **Total** | **192** | **155 Implemented; 17 Partial; 8 Backend Only; 3 UI Only; 1 Broken; 2 Disabled; 6 Unverified** |

## Detailed feature inventory

### Authentication and organization

| Feature ID | Feature | Description | Status | User interface | Backend | Evidence | Limitations |
|---|---|---|---|---|---|---|---|
| AUTH-001 | Email/password sign-in | Authenticates an active user and starts a JWT session. | Implemented | `/login`; desktop/mobile | NextAuth credentials provider | `src/app/(auth)/login/page.tsx`; `src/lib/auth.ts`; `src/app/api/auth/[...nextauth]/route.ts` | Requires database availability. |
| AUTH-002 | Google sign-in | Offers Google OAuth when client credentials are configured. | Unverified | `/login`; desktop/mobile | Conditional Google provider | `src/app/(auth)/login/page.tsx`; `src/lib/auth.ts` | Hidden without Google environment variables; external OAuth not exercised. |
| AUTH-003 | User registration | Creates an owner account and sends the user into verification/onboarding. | Implemented | `/register` and login registration panel | `POST /api/auth/register` | `src/app/(auth)/register/page.tsx`; `src/app/api/auth/register/route.ts` | Mail delivery is environment-dependent. |
| AUTH-004 | Email verification | Verifies signed tokens and supports resending a verification email. | Implemented | `/verify-email`; desktop/mobile | Verification and resend APIs | `src/app/(auth)/verify-email/page.tsx`; `src/app/api/auth/verify-email/route.ts`; `src/app/api/auth/resend-verification/route.ts` | Delivery requires configured email service. |
| AUTH-005 | Forgot-password request | Accepts a recovery email request. | Partial | Login recovery panel | `POST /api/auth/forgot-password` | `src/app/(auth)/login/page.tsx`; `src/app/api/auth/forgot-password/route.ts` | Endpoint intentionally returns success without generating/sending a reset link. |
| AUTH-006 | Logout | Ends the authenticated session. | Implemented | Application header/menu | NextAuth sign-out | `src/modules/layout/components/AppLayout.tsx`; `src/providers/AuthProvider.tsx` | None evident. |
| AUTH-007 | Session refresh after onboarding | Refreshes JWT organization/store claims and guards dashboard entry. | Implemented | Automatic in dashboard layout | NextAuth update callback and DB re-read | `src/app/(dashboard)/layout.tsx`; `src/lib/auth.ts` | JWT-based; no server-side session revocation UI. |
| AUTH-008 | Business onboarding | Creates an organization, initial store, and owner association. | Implemented | `/onboarding`; responsive | `POST /api/onboarding/register-business` | `src/app/(auth)/onboarding/page.tsx`; `src/app/api/onboarding/register-business/route.ts` | One initial store per onboarding submission. |
| AUTH-009 | Team invitations | Owners/admins invite users with role and optional store scope. | Implemented | `/dashboard/settings/team` | Invitation list/create/revoke APIs | `src/app/(dashboard)/dashboard/settings/team/page.tsx`; `src/app/api/invitations/route.ts`; `prisma/schema.prisma` (`Invitation`) | Email delivery requires configuration. |
| AUTH-010 | Invitation acceptance | Validates invite tokens and lets an invitee establish access. | Implemented | `/invite/[token]`; responsive | Token lookup/accept APIs | `src/app/(auth)/invite/[token]/page.tsx`; `src/app/api/invitations/[token]/accept/route.ts` | Expired/revoked tokens are rejected. |
| AUTH-011 | Role-based navigation | Limits menus for owner, admin, manager, staff, and routes super-admin separately. | Implemented | Dashboard and admin navigation | Role data in session/RBAC helpers | `src/modules/layout/constants.ts`; `src/lib/rbac.ts`; `src/lib/auth.middleware.ts` | Menu hiding is supplemented by API checks, but not every route has a dedicated role matrix test. |
| AUTH-012 | Organization isolation | Scopes business records by organization and, where required, store. | Implemented | All tenant application pages | Org auth helpers and scoped Prisma queries | `src/lib/auth.middleware.ts`; `src/lib/rbac.ts`; `prisma/schema.prisma`; `src/modules/whatsapp/testing/assetTenantIsolation.test.ts` | Confidence is code/test based, not a formal security audit. |
| AUTH-013 | Organization profile editing | Lets an owner change business name and view its immutable slug. | Implemented | `/dashboard/settings/organization` | `GET/PATCH /api/org` and name API | `src/app/(dashboard)/dashboard/settings/organization/page.tsx`; `src/app/api/org/route.ts` | Editing is owner-only; slug cannot be changed. |
| AUTH-014 | Two-factor authentication | Shows account 2FA state. | Disabled | Settings profile security card | None | `src/app/(dashboard)/dashboard/settings/page.tsx` | Explicitly displayed as inactive; no enrollment or verification flow. |
| AUTH-015 | Store-scoped employee access | Assigns users to one store or all stores according to role. | Implemented | User/team forms and store selector | User/store fields and authorization helpers | `src/modules/settings/components/UserForm.tsx`; `src/providers/StoreProvider.tsx`; `prisma/schema.prisma` (`User.storeId`) | Correct enforcement across every endpoint requires continuing review as routes are added. |

### Product catalog

| Feature ID | Feature | Description | Status | User interface | Backend | Evidence | Limitations |
|---|---|---|---|---|---|---|---|
| PRD-001 | Product listing | Lists organization products with paging and stock-related details. | Implemented | `/dashboard/products`; desktop and mobile-specific view | `GET /api/products` | `src/modules/products/components/ProductTable.tsx`; `src/modules/mobile-dashboard/pages/ProductsPage.tsx`; `src/app/api/products/route.ts` | Mobile presentation is simpler than desktop. |
| PRD-002 | Product search | Searches by product name or SKU. | Implemented | Product table/mobile products | Products API query filters | `src/modules/products/components/ProductTable.tsx`; `src/modules/products/services/productService.ts` | No fuzzy-search engine. |
| PRD-003 | Product filters | Filters by category, brand, in-stock size, status and dynamic attributes. | Implemented | Desktop product table | Products API query filters | `src/modules/products/components/ProductTable.tsx`; `src/app/api/products/route.ts` | Dynamic filters depend on category schema. |
| PRD-004 | Product creation wizard | Creates product basics, commercial data, image, attributes, variants and thresholds. | Implemented | `/dashboard/products/new` | `POST /api/products` | `src/modules/products/components/ProductForm.tsx`; `src/app/api/products/route.ts` | Requires at least one stocked size for active completion. |
| PRD-005 | Product editing | Updates existing product and its variants. | Implemented | `/dashboard/products/[id]/edit` | `PUT /api/products/[id]` | `src/app/(dashboard)/dashboard/products/[id]/edit/page.tsx`; `src/app/api/products/[id]/route.ts` | Historical sales retain snapshots rather than changing. |
| PRD-006 | Product detail | Shows product identity, pricing, variants and stock. | Implemented | `/dashboard/products/[id]` | `GET /api/products/[id]` | `src/modules/products/components/ProductDetail.tsx`; `src/app/api/products/[id]/route.ts` | None evident. |
| PRD-007 | Product deletion | Deletes a product through a confirmed action. | Implemented | Product table | `DELETE /api/products/[id]` | `src/modules/products/components/ProductTable.tsx`; `src/app/api/products/[id]/route.ts` | Database relationships may prevent deletion of referenced products. |
| PRD-008 | Draft/inactive products | Saves products inactive and later permits status changes. | Implemented | Product wizard/table | Product `isActive` persistence | `src/modules/products/components/ProductForm.tsx`; `prisma/schema.prisma` (`Product.isActive`) | No separate draft revision history. |
| PRD-009 | SKU generation | Auto-generates/regenerates SKU from brand/category and supports variant SKU migration tools. | Implemented | Product form | Product service/API plus maintenance scripts | `src/modules/products/components/ProductForm.tsx`; `src/modules/products/services/productService.ts`; `scripts/migrate-variant-skus.ts` | Uniqueness depends on API/database validation. |
| PRD-010 | External barcode capture | Stores EAN/UPC and supports camera entry. | Implemented | Product form | Product barcode persistence | `src/modules/products/components/ProductForm.tsx`; `src/modules/barcode/components/CameraBarcodeScannerModal.tsx`; `prisma/schema.prisma` | Camera needs browser permission and HTTPS. |
| PRD-011 | Multi-price product data | Stores MRP, selling price and cost price for profitability and billing. | Implemented | Product form/detail | Product fields and pricing snapshots | `src/modules/products/components/ProductForm.tsx`; `prisma/schema.prisma`; `src/modules/billing/utils/pricingEngine.ts` | Currency is presented as INR in the UI. |
| PRD-012 | Product images | Uploads and displays a product image. | Unverified | Product form/list/detail | `POST /api/upload` using Vercel Blob | `src/modules/products/components/ProductForm.tsx`; `src/app/api/upload/route.ts` | Needs valid blob credentials/network; no repository integration test. |
| PRD-013 | Product variants/sizes | Creates size/attribute combinations with quantity and low-stock level. | Implemented | Product form/detail | `Size` and `StockEntry` models | `src/modules/products/components/ProductForm.tsx`; `prisma/schema.prisma` | Variant model is named `Size` even when attributes are generic. |
| PRD-014 | Category management | Creates, edits, lists and deletes product categories. | Implemented | `/dashboard/categories`, `/new`, `/[id]` | Category CRUD APIs | `src/modules/categories/components/CategoryTable.tsx`; `src/app/api/categories/route.ts`; `src/app/api/categories/[id]/route.ts` | Deletion can be constrained by referenced products. |
| PRD-015 | Category attribute schemas | Defines select, text, numeric and color-style attributes used by products. | Implemented | Category form | Category schema JSON persistence | `src/modules/categories/components/AttributeSchemaBuilder.tsx`; `prisma/schema.prisma` (`Category.attributeSchema`) | Schema migrations for existing products are manual. |
| PRD-016 | Brand management | Creates, edits, lists and deletes brands. | Implemented | `/dashboard/brands` | Brand CRUD APIs | `src/modules/brands/components/BrandTable.tsx`; `src/app/api/brands/route.ts`; `src/app/api/brands/[id]/route.ts` | Deletion can be constrained by products. |
| PRD-017 | Bulk category/brand/product import | Downloads templates, previews spreadsheet data, validates rows and submits bulk records. | Implemented | Category, brand and product bulk-upload drawers | `/api/*/template` and `/api/*/bulk` | `src/modules/products/components/BulkUploadDrawer.tsx`; `src/modules/categories/components/BulkUploadDrawer.tsx`; `src/app/api/products/bulk/route.ts`; `src/app/api/brands/bulk/route.ts` | Import is rejected while validation errors remain; large-file limits are not load-tested. |
| PRD-018 | Product duplication | Copies an existing product into a new editable product. | Partial | Product table duplicate action | Client duplicate utility then create/edit flow | `src/modules/products/components/ProductTable.tsx`; `src/modules/products/utils/duplicateProduct.ts` | Requires the user to review/save; associated stock/history is intentionally not cloned. |

### Inventory, alerts and barcodes

| Feature ID | Feature | Description | Status | User interface | Backend | Evidence | Limitations |
|---|---|---|---|---|---|---|---|
| INV-001 | Store stock listing | Lists product variants, quantity and stock condition for the selected store. | Implemented | `/dashboard/stock`; desktop/mobile | `GET /api/stock` | `src/modules/stock/components/StockTable.tsx`; `src/modules/mobile-dashboard/pages/StockPage.tsx`; `src/app/api/stock/route.ts` | Requires a selected/assigned store. |
| INV-002 | Stock search and status filters | Searches by product/SKU/barcode and filters stock condition. | Implemented | Stock page | Stock API filters | `src/modules/stock/components/StockTable.tsx`; `src/modules/stock/services/stockService.ts` | No saved filters. |
| INV-003 | Manual stock adjustment | Adds or removes stock with reason/reference and records a movement. | Implemented | Stock adjustment modal | `POST /api/stock` transaction | `src/modules/stock/components/StockAdjustmentModal.tsx`; `src/app/api/stock/route.ts`; `prisma/schema.prisma` (`StockMovement`) | Not a formal two-party approval workflow. |
| INV-004 | Stock movement history | Displays inbound, outbound, adjustment, sale and return history. | Implemented | Stock page/reports | `GET /api/stock/movements` | `src/modules/stock/components/MovementHistoryTable.tsx`; `src/app/api/stock/movements/route.ts` | Retention/export settings are absent. |
| INV-005 | Purchase receipt stock updates | Increases inventory when a purchase order is received. | Implemented | PO receive flow | Receive API transaction | `src/app/api/purchase-orders/[id]/receive/route.ts`; `src/modules/purchase-orders/components/POReceiveForm.tsx` | No partial receipt reversal UI. |
| INV-006 | Sale/return inventory updates | Decrements sold stock and restores eligible returned units transactionally. | Implemented | Billing and return flows | Billing service transactions | `src/modules/billing/services/billingService.ts`; `prisma/schema.prisma` | Exchange settlement complexity needs end-to-end verification. |
| INV-007 | Barcode lookup | Resolves an internal SKU or external barcode to product/variant stock. | Implemented | Scan and billing pages | `GET /api/barcode/lookup` | `src/app/(dashboard)/dashboard/scan/page.tsx`; `src/app/api/barcode/lookup/route.ts` | Store context is required for quantity. |
| INV-008 | Camera barcode scanning | Reads barcodes using the device camera. | Unverified | Product, stock, scan and billing interfaces | Browser ZXing/HTML5 scanner | `src/modules/barcode/hooks/useCameraScanner.ts`; `src/modules/barcode/components/CameraBarcodeScannerModal.tsx` | Hardware, permissions, HTTPS and device support require manual verification. |
| INV-009 | Barcode label selection | Selects products/variants and quantities for label output. | Implemented | Products table label drawer | Client label model | `src/modules/products/components/ProductTable.tsx`; `src/modules/barcode/components/LabelPrinter.tsx` | Labels are product/variant based, not serial-number based. |
| INV-010 | Barcode PDF/print output | Produces printable barcode sheets, previews them, or exports PDF. | Implemented | Product barcode-label modal | `POST /api/barcode/export-pdf` | `src/modules/barcode/services/barcodeExportService.ts`; `src/app/api/barcode/export-pdf/route.ts`; `src/modules/barcode/services/barcodeExportService.test.ts` | Server PDF renderer/browser binaries must be deployable. |
| INV-011 | Low-stock alert rules | Configures per-store/category/product thresholds, frequency and enablement. | Implemented | `/dashboard/alerts` | Alert CRUD APIs | `src/modules/alerts/components/AlertConfigForm.tsx`; `src/app/api/alerts/route.ts`; `prisma/schema.prisma` (`AlertConfig`) | Delivery channel behavior is not exposed in the form. |
| INV-012 | Low-stock alert view | Shows currently low-stock items for configured rules. | Implemented | Alerts page | `GET /api/alerts/low-stock` | `src/modules/alerts/components/LowStockAlertsList.tsx`; `src/app/api/alerts/low-stock/route.ts` | Alerts are calculated on request. |
| INV-013 | Scheduled reorder check | Protected cron endpoint evaluates low stock and sends communications. | Backend Only | None | `GET /api/cron/reorder-check` | `src/app/api/cron/reorder-check/route.ts`; `src/modules/communication/services/CommunicationService.ts` | Needs cron secret/scheduler; delivery provider behavior is limited. |
| INV-014 | Stock report data | Returns filterable current-stock report rows. | Implemented | `/dashboard/reports` | Reports service/API | `src/app/(dashboard)/dashboard/reports/page.tsx`; `src/modules/dashboard/services/reportsService.ts` | No file export button evident. |
| INV-015 | Inventory transfer | Move stock directly between stores. | Partial | None | No dedicated transfer model/API; movements can only be adjusted separately | `prisma/schema.prisma` (`StockMovementType`); `src/app/api/stock/route.ts` | No atomic source-to-destination transfer workflow. |
| INV-016 | Historical stock reconstruction | Rebuilds prior on-hand quantities from movements for analytics. | Backend Only | Consumed indirectly by inventory intelligence | Inventory intelligence calculations | `src/modules/inventory-intelligence/utils/metrics.ts`; `src/modules/inventory-intelligence/utils/metrics.test.ts` | Not available as a standalone ledger snapshot UI. |

### Suppliers and purchasing

| Feature ID | Feature | Description | Status | User interface | Backend | Evidence | Limitations |
|---|---|---|---|---|---|---|---|
| PUR-001 | Supplier directory | Lists and searches suppliers. | Implemented | `/dashboard/suppliers` | `GET /api/suppliers` | `src/modules/suppliers/components/SupplierTable.tsx`; `src/app/api/suppliers/route.ts` | Desktop-oriented. |
| PUR-002 | Supplier creation/editing | Stores supplier company, contact, email, phone and address. | Implemented | Supplier modal/detail | Supplier CRUD APIs | `src/modules/suppliers/components/SupplierForm.tsx`; `src/app/api/suppliers/[id]/route.ts` | No supplier portal. |
| PUR-003 | Supplier deletion | Removes a supplier when references permit it. | Implemented | Supplier table/detail | `DELETE /api/suppliers/[id]` | `src/modules/suppliers/components/SupplierTable.tsx`; `src/app/api/suppliers/[id]/route.ts` | Referenced suppliers may be protected by DB relations. |
| PUR-004 | Supplier detail/history | Shows supplier information and associated purchasing history. | Implemented | `/dashboard/suppliers/[id]` | Supplier detail query | `src/modules/suppliers/components/SupplierDetail.tsx`; `src/app/api/suppliers/[id]/route.ts` | No statement reconciliation. |
| PUR-005 | Purchase-order creation | Creates a supplier order with product, size, quantity, unit cost and notes. | Implemented | `/dashboard/purchase-orders/new` | `POST /api/purchase-orders` | `src/modules/purchase-orders/components/POForm.tsx`; `src/app/api/purchase-orders/route.ts` | Cannot create without catalog products. |
| PUR-006 | Purchase-order list/filter | Searches POs and filters by status and supplier. | Implemented | `/dashboard/purchase-orders` | `GET /api/purchase-orders` | `src/modules/purchase-orders/components/POTable.tsx`; `src/app/api/purchase-orders/route.ts` | No export. |
| PUR-007 | PO detail and totals | Shows order identity, creator, supplier, line items, costs and status. | Implemented | `/dashboard/purchase-orders/[id]` | `GET /api/purchase-orders/[id]` | `src/modules/purchase-orders/components/PODetail.tsx`; `src/app/api/purchase-orders/[id]/route.ts` | None evident. |
| PUR-008 | PO submit/status workflow | Submits drafts and records order lifecycle state. | Implemented | PO detail actions | `POST /api/purchase-orders/[id]/submit` | `src/app/api/purchase-orders/[id]/submit/route.ts`; `prisma/schema.prisma` (`PurchaseOrderStatus`) | Approval hierarchy is absent. |
| PUR-009 | Receive purchase order | Records received quantities/cost and updates inventory. | Partial | PO receive form | Receive API plus purchase records | `src/modules/purchase-orders/components/POReceiveForm.tsx`; `src/app/api/purchase-orders/[id]/receive/route.ts`; `prisma/schema.prisma` (`Purchase`) | No vendor invoice attachment, landed-cost allocation, or receipt reversal UI. |

### Billing, POS and promotions

| Feature ID | Feature | Description | Status | User interface | Backend | Evidence | Limitations |
|---|---|---|---|---|---|---|---|
| POS-001 | POS product search | Searches sellable stock by name or SKU with a 300 ms debounce and two-character minimum. | Implemented | `/dashboard/billing`; desktop/mobile | Products search API | `src/modules/billing/hooks/useBillingProductSearch.ts`; `src/modules/billing/components/BillingView.tsx` | Search minimum does not apply to barcode lookup. |
| POS-002 | POS barcode entry | Adds products by typed/scanned internal or external barcode. | Implemented | Billing search field/camera action | Barcode/product APIs | `src/modules/billing/components/BillingView.tsx`; `src/app/api/barcode/lookup/route.ts` | Camera hardware is separately unverified. |
| POS-003 | Cart management | Adds/removes variants and changes quantities with stock validation. | Implemented | Billing cart panel/drawer | Sale validation in billing service | `src/modules/billing/hooks/useBilling.ts`; `src/modules/billing/components/CartPanel.tsx`; `src/modules/billing/services/billingService.ts` | Cannot sell beyond available stock. |
| POS-004 | Responsive cart drawer | Uses a compact drawer on narrow displays. | Implemented | Billing mobile layout | Client UI | `src/modules/billing/components/CartDrawer.tsx`; `src/modules/mobile-dashboard/components/BillingCart.tsx` | Manual viewport QA still recommended. |
| POS-005 | Customer selection/quick creation | Searches, selects, or creates a customer during checkout. | Implemented | Billing customer panel | Customer get-or-create/search APIs | `src/modules/billing/components/BillingView.tsx`; `src/app/api/customer/get-or-create/route.ts`; `src/app/api/customers/search/route.ts` | Mobile number is the principal lookup key. |
| POS-006 | Item price override | Applies per-line fixed/percentage negotiated pricing. | Implemented | Item price editor | Pricing engine and sale snapshots | `src/modules/billing/components/ItemPriceEditor.tsx`; `src/modules/billing/utils/pricingEngine.ts`; `docs/negotiated-pricing.md` | Authorization threshold for overrides is not evident. |
| POS-007 | Sale-level discount | Applies a cart-level discount before payment. | Implemented | Billing totals | Billing service calculations | `src/modules/billing/components/BillingView.tsx`; `src/modules/billing/services/billingService.ts` | Discount policy/approval controls are absent. |
| POS-008 | Promo-code administration | Creates, edits, activates/deactivates and deletes promotions. | Implemented | Settings → Promos | Promo CRUD APIs | `src/modules/promo-codes/components/PromoCodesSettings.tsx`; `src/app/api/promo-codes/route.ts` | No campaign scheduler UI. |
| POS-009 | Promo-code validation/application | Applies code eligibility, value, limits and date rules at billing. | Implemented | Billing promo entry/offer selector | Promo service and billing service | `src/modules/billing/components/BillingView.tsx`; `src/modules/promo-codes/services/promoService.ts`; `src/app/api/promo-codes/[id]/usage/route.ts` | Some offer selection is store/date dependent. |
| POS-010 | Tax calculation | Applies configured inclusive/exclusive tax and stores the result. | Implemented | Billing totals/settings | Billing and invoice configuration snapshot | `src/modules/billing/services/billingService.ts`; `src/modules/invoice-management/services/invoiceConfigurationSnapshot.ts` | Primarily designed for GST-style percentage tax. |
| POS-011 | Payment-method selection | Records cash, card, UPI and other schema-supported methods. | Implemented | Payment section | Sale payment persistence | `src/modules/billing/components/CollectPaymentSection.tsx`; `prisma/schema.prisma` (`PaymentMethod`) | No direct payment-gateway capture integration. |
| POS-012 | Split payments | Allocates one checkout across multiple payment methods and validates the total. | Implemented | Desktop/mobile payment panels | Billing service payment allocation | `src/modules/mobile-dashboard/components/SplitPaymentPanel.tsx`; `src/modules/billing/services/billingService.ts`; `scripts/verify-payment-distribution.mjs` | Gateway settlement is outside the app. |
| POS-013 | Partial/deferred payment | Creates balances and records later payments against a sale. | Implemented | Billing and payment history | `POST /api/billing/[id]/payments` | `src/modules/billing/components/PaymentHistorySection.tsx`; `src/app/api/billing/[id]/payments/route.ts` | No automated collections workflow. |
| POS-014 | Backdated transaction date | Permits an authorized sale date different from creation time. | Implemented | Billing date control | `Sale.transactionDate` | `BACKDATED_BILLING_IMPLEMENTATION_COMPLETE.md`; `prisma/migrations/20260509000000_add_transaction_date_to_sales/migration.sql`; `src/modules/billing/services/billingService.ts` | Authorization behavior needs business-policy review. |
| POS-015 | Invoice numbering snapshot | Generates a store prefix/date/sequence number and snapshots invoice settings. | Implemented | Checkout/invoice settings | Invoice policy/version service | `src/modules/invoice-management/services/invoiceManagementService.ts`; `src/modules/invoice-management/services/invoiceConfigurationSnapshot.ts`; `prisma/schema.prisma` | Concurrent sequence behavior needs production load verification. |
| POS-016 | Invoice preview and print | Renders a printable invoice with business, customer, line, tax and payment details. | Implemented | Checkout and transaction/customer invoice preview | HTML invoice document | `src/modules/billing/components/InvoicePreview.tsx`; `src/modules/billing/invoiceDocument.ts`; `src/modules/billing/invoiceDocument.test.ts` | Browser print formatting should be manually checked. |
| POS-017 | Invoice PDF generation | Generates downloadable invoice PDFs server-side. | Unverified | Customer invoice/download flows | PDF renderer and invoice PDF service | `src/modules/billing/services/invoicePdfService.ts`; `src/modules/billing/invoicePdfDocument.ts`; `src/app/api/customers/[id]/invoices/[saleId]/pdf/route.ts` | Deployment browser/font/runtime must be validated. |
| POS-018 | Sales history | Lists, filters and pages transactions, with cards/table and detail access. | Implemented | Billing history tab | Billing history API | `src/modules/billing/components/SalesHistory.tsx`; `src/modules/billing/components/OrdersTable.tsx`; `src/app/api/billing/history/route.ts` | No general CSV export evident. |
| POS-019 | Sales KPI widgets | Shows transaction count, revenue and operational billing KPIs. | Implemented | Billing page | KPI/stats APIs | `src/modules/billing/components/SalesKPIWidget.tsx`; `src/app/api/billing/kpis/route.ts`; `src/app/api/billing/stats/route.ts` | KPI correctness depends on legacy compatibility normalization. |
| POS-020 | Keyboard/compact interaction aids | Supports scan-first input, quantity controls, tabbed/collapsible areas and responsive panels. | Partial | Billing desktop/mobile | Client UI | `src/modules/billing/components/BillingView.tsx`; `src/modules/billing/components/TabStrip.tsx`; `src/modules/billing/components/CartDrawer.tsx` | No comprehensive keyboard-shortcut map or accessibility E2E suite. |

### Returns, exchanges and refunds

| Feature ID | Feature | Description | Status | User interface | Backend | Evidence | Limitations |
|---|---|---|---|---|---|---|---|
| RET-001 | Original-sale lookup | Selects a completed sale and loads returnable quantities. | Implemented | Billing return/exchange view | Sale detail API/service | `src/modules/billing/components/ReturnExchangeView.tsx`; `src/app/api/billing/[id]/route.ts` | Limited to accessible organization/store sales. |
| RET-002 | Full or partial return | Selects individual lines and quantities for return. | Implemented | Return/exchange view | Return transaction service/API | `src/modules/billing/services/billingService.ts`; `src/app/api/billing/[id]/return/route.ts` | Cannot exceed unreturned quantity. |
| RET-003 | Product exchange | Adds replacement products filtered by name/SKU/barcode/category/brand/size. | Implemented | Return/exchange view | Return transaction service | `src/modules/billing/components/ReturnExchangeView.tsx`; `src/modules/billing/services/billingService.ts` | Exchange inventory must be available. |
| RET-004 | Return reason/condition/notes | Captures operational context for returned goods. | Implemented | Return details card | Return transaction fields | `src/modules/billing/components/ReturnExchangeView.tsx`; `prisma/schema.prisma` (`ReturnTransaction`) | Reason values are not a centrally administered catalog. |
| RET-005 | Settlement calculation | Calculates refund due or additional amount for an exchange. | Implemented | Review & settle drawer | Historical pricing and compatibility utilities | `src/modules/billing/utils/saleCompatibility.ts`; `src/modules/billing/services/billingService.ts` | Complex legacy sale scenarios need manual sampling. |
| RET-006 | Refund/supplement payment methods | Records cash/card/UPI/split settlement for return or exchange. | Implemented | Review & settle drawer | Sale/return payment persistence | `src/modules/billing/components/ReturnExchangeView.tsx`; `src/app/api/billing/[id]/refund/route.ts` | Does not reverse an external processor automatically. |
| RET-007 | Returned/exchanged stock updates | Restocks returned items and decrements exchanged items atomically. | Implemented | Automatic | Billing service transaction and movements | `src/modules/billing/services/billingService.ts`; `prisma/schema.prisma` (`ReturnTransactionItem`, `StockMovement`) | Damaged-item quarantine stock is not separately modeled. |
| RET-008 | Return/exchange document history | Persists reference records linked to the original sale. | Partial | Sale history/detail | Return models and service | `prisma/schema.prisma`; `src/modules/billing/services/billingService.ts` | Dedicated return-document PDF/standalone returns register UI is not evident. |

### Customers and follow-ups

| Feature ID | Feature | Description | Status | User interface | Backend | Evidence | Limitations |
|---|---|---|---|---|---|---|---|
| CUS-001 | Customer directory | Lists paged customers with stable URL state. | Implemented | `/dashboard/customers` | `GET /api/customers` | `src/app/(dashboard)/dashboard/customers/page.tsx`; `src/modules/customers/customerDirectoryState.test.ts` | None evident. |
| CUS-002 | Customer search | Searches by name/mobile and provides checkout lookup. | Implemented | Customer directory and POS | Customer list/search APIs | `src/app/api/customers/search/route.ts`; `src/modules/customers/services/customerService.ts` | Phone normalization is India-oriented. |
| CUS-003 | Customer filters/sorting/paging | Filters purchase recency/KPI groups and sorts/paginates without stale query reuse. | Implemented | Customer directory | Customer queries | `src/modules/customers/customerQueries.ts`; `src/modules/customers/customerPagination.test.ts`; `src/modules/customers/utils/customerDateWindow.test.ts` | Date presets use Asia/Kolkata business time. |
| CUS-004 | Customer registration | Creates customers directly or during billing/demand capture. | Implemented | Customer form, POS, visit form | Customer create/get-or-create APIs | `src/modules/customers/components/CustomerForm.tsx`; `src/app/api/customers/route.ts` | Duplicate policy centers on mobile. |
| CUS-005 | Customer profile editing | Updates customer identity/contact data. | Implemented | `/dashboard/customers/[customerId]` | `PATCH /api/customers/[id]` | `src/modules/customers/components/CustomerFullProfile.tsx`; `src/app/api/customers/[id]/route.ts` | No customer self-service portal. |
| CUS-006 | Profile navigation context | Preserves filters and supports previous/next customer navigation across pages. | Implemented | Customer detail | Client navigation helpers | `src/modules/customers/customerNavigation.ts`; `src/modules/customers/customerNavigation.test.ts` | Navigation follows current filtered order only. |
| CUS-007 | Purchase history and spend summary | Shows invoices, last purchase, item summaries, spend and activity. | Implemented | Customer full profile/quick view | Customer intelligence service | `src/modules/customers/components/CustomerPurchaseHistory.module.css`; `src/modules/customers/services/customerIntelligenceService.ts` | Legacy transaction normalization may affect older data. |
| CUS-008 | Customer invoice access | Previews/downloads only invoices belonging to the selected customer and store scope. | Implemented | Customer profile | Customer invoice APIs | `src/app/api/customers/[id]/invoices/[saleId]/route.ts`; `src/modules/customers/customerInvoiceAccess.test.ts` | PDF runtime separately unverified. |
| CUS-009 | Customer insights | Provides retention/value/recency-style directory insights. | Implemented | Customer directory/profile | `GET /api/customers/insights` | `src/app/api/customers/insights/route.ts`; `src/modules/customers/services/customerIntelligenceService.ts` | Not a predictive ML model. |
| CUS-010 | Visit history | Records and lists visits associated with a customer. | Implemented | Customer profile/demand page | Customer visit APIs | `src/app/api/customer-visits/route.ts`; `src/app/api/customers/[id]/visits/route.ts`; `prisma/schema.prisma` | Anonymous visits have no customer profile link. |
| CUS-011 | Follow-up creation/status | Creates scheduled customer follow-ups, links optional demand/restock context, and updates status. | Implemented | Customer follow-up modal/profile | Follow-up APIs/service | `src/modules/customers/components/CustomerFollowUpModal.tsx`; `src/app/api/customer-follow-ups/route.ts`; `src/modules/customers/customerFollowUpSchemas.test.ts` | No calendar synchronization. |
| CUS-012 | Follow-up queue/notifications | Surface due follow-ups proactively to staff. | Partial | Follow-ups are visible on individual customer/profile flows | Stored follow-up queries | `src/modules/customers/services/customerFollowUpService.ts`; `prisma/schema.prisma` (`CustomerFollowUp`) | No global due-today queue, push alert, email, or cron reminder was found. |
| CUS-013 | Loyalty program | Rewards points, tiers, redemption or wallet. | Partial | None | No loyalty model/service | `prisma/schema.prisma`; `src/modules/customers/types.ts` | Spend analytics exists, but no loyalty program is implemented. |

### Demand intelligence

| Feature ID | Feature | Description | Status | User interface | Backend | Evidence | Limitations |
|---|---|---|---|---|---|---|---|
| DEM-001 | Visit capture | Records dated store visits from walk-in, phone, WhatsApp or other sources. | Implemented | `/dashboard/demand` and customer profile action | Demand/customer visit service | `src/modules/demand-intelligence/components/DemandIntelligencePage.tsx`; `src/modules/demand-intelligence/services/demandIntelligenceService.ts` | Requires store selection. |
| DEM-002 | Anonymous/existing/new visitors | Supports anonymous visits, linking an existing customer, or registering one inline. | Implemented | Visit form | Customer/demand services | `src/modules/demand-intelligence/components/DemandIntelligencePage.tsx`; `src/app/api/demand-intelligence/route.ts` | Anonymous visits cannot later be automatically merged. |
| DEM-003 | Visit outcomes | Records converted, partial, unconverted and browsing-style outcomes. | Implemented | Visit form | Validated outcome enum | `src/modules/demand-intelligence/utils/demandValidation.ts`; `prisma/schema.prisma` (`VisitOutcome`) | Outcome relies on employee entry. |
| DEM-004 | Unmet demand requests | Captures category, product, brand, reason, status, desired/fulfilled quantity and notes. | Implemented | Visit form | `DemandRequest` persistence | `src/modules/demand-intelligence/components/DemandIntelligencePage.tsx`; `prisma/schema.prisma` | Manual capture quality affects analytics. |
| DEM-005 | Requested size/generic attributes | Captures size and category-defined requirements rather than assuming apparel fields. | Implemented | Visit request editor | Canonical attribute validation | `src/modules/demand-intelligence/utils/demandAnalytics.ts`; `src/modules/demand-intelligence/utils/demandValidation.test.ts` | Available fields depend on category schema. |
| DEM-006 | Visit update/detail | Reads and updates tenant/store-safe visit records. | Implemented | Demand/customer views | Demand service get/update | `src/modules/demand-intelligence/services/demandIntelligenceService.ts`; `src/modules/demand-intelligence/utils/demandSecurity.test.ts` | No bulk edit. |
| DEM-007 | Daily demand summary | Shows today’s visits, outcomes and missed requests. | Implemented | Demand page | Demand analytics API | `src/modules/demand-intelligence/components/DemandIntelligencePage.tsx`; `src/app/api/demand-intelligence/route.ts` | Store-scoped. |
| DEM-008 | Lost-sale reason analysis | Aggregates why sales were lost. | Implemented | “Why Sales Were Lost” card | Analytics aggregation | `src/modules/demand-intelligence/components/DemandIntelligencePage.tsx`; `src/modules/demand-intelligence/utils/demandAnalytics.test.ts` | Classification is rules-based. |
| DEM-009 | Demand vs availability/category analysis | Compares observed demand, fulfillment and availability by requested requirement/category. | Implemented | Demand tables | Demand analytics service | `src/modules/demand-intelligence/services/demandIntelligenceService.ts`; `src/modules/demand-intelligence/components/DemandIntelligencePage.tsx` | Evidence level warns on small samples. |
| DEM-010 | Demand-to-procurement automation | Automatically creates replenishment/PO recommendations from unmet demand. | Partial | None | No automated PO creation link | Demand analytics exists; `src/modules/purchase-orders/services/poService.ts` has no demand integration | Managers must act on insights manually. |

### Dashboards, analytics and reports

| Feature ID | Feature | Description | Status | User interface | Backend | Evidence | Limitations |
|---|---|---|---|---|---|---|---|
| ANA-001 | Store dashboard KPIs | Shows sales, orders, inventory and business summary for store/date scope. | Implemented | `/dashboard`; desktop/mobile | `GET /api/dashboard` | `src/modules/dashboard/components/KPICards.tsx`; `src/app/api/dashboard/route.ts` | Values depend on selected store/date. |
| ANA-002 | Revenue trend | Charts revenue over time. | Implemented | Dashboard | Dashboard service | `src/modules/dashboard/components/RevenueTrendChart.tsx`; `src/modules/dashboard/services/dashboardService.ts` | No forecast. |
| ANA-003 | Stock by category | Visualizes inventory distribution across categories. | Implemented | Dashboard | Dashboard service | `src/modules/dashboard/components/StockByCategoryChart.tsx`; `src/modules/dashboard/services/dashboardService.ts` | Current-state view. |
| ANA-004 | Top brands | Ranks brands from sales data. | Implemented | Dashboard | Dashboard service | `src/modules/dashboard/components/TopBrandsChart.tsx`; `src/modules/dashboard/services/dashboardService.ts` | Ranking basis follows selected period. |
| ANA-005 | Recent stock movements | Shows recent inventory changes. | Implemented | Dashboard | Dashboard service | `src/modules/dashboard/components/RecentMovementsWidget.tsx`; `src/modules/dashboard/services/dashboardService.ts` | Limited recent window. |
| ANA-006 | Sales/payment breakdown | Reports sales and payment-method distribution. | Implemented | Dashboard/reports | Sales breakdown and payment APIs | `src/app/api/reports/sales-breakdown-v2/route.ts`; `src/modules/dashboard/components/PaymentMethodDistributionChart.tsx` | Mixed/partial payments depend on allocation records. |
| ANA-007 | Profit and margin analysis | Calculates revenue, COGS, gross profit and margin with returns/exchanges handled. | Implemented | Dashboard/reports | Profit-margin API/service | `src/modules/dashboard/components/ProfitMarginSection.tsx`; `src/app/api/reports/profit-margin/route.ts`; `src/modules/dashboard/services/profitabilityService.test.ts` | Accuracy depends on historical cost snapshots. |
| ANA-008 | Inventory intelligence periods | Supports week, month, quarter, half-year, year and custom comparisons. | Implemented | Dashboard inventory intelligence panel | Inventory intelligence API | `src/modules/inventory-intelligence/components/InventoryIntelligencePanel.tsx`; `src/modules/inventory-intelligence/utils/analyticsPeriod.test.ts` | Store required. |
| ANA-009 | Inventory value/sell-through/cover | Calculates stock value, units sold, fulfillment, sell-through and stock-cover metrics. | Implemented | Inventory intelligence | Metrics service | `src/modules/inventory-intelligence/utils/metrics.ts`; `src/modules/inventory-intelligence/utils/metrics.test.ts` | Stock cover can be semantically unavailable with zero velocity. |
| ANA-010 | Inventory diagnostics | Classifies healthy, overstock, demand weakness and replenishment/constraint risks with insights. | Implemented | Inventory intelligence insight drawers/cards | Rules-based diagnostics | `src/modules/inventory-intelligence/components/InventoryIntelligencePanel.tsx`; `src/modules/inventory-intelligence/utils/metrics.test.ts` | Diagnostic, not predictive. |
| ANA-011 | Category/product drill-down | Filters intelligence by category, brand and product and opens detail tables/charts. | Implemented | Inventory intelligence drawers | Drill-down API | `src/app/api/dashboard/inventory-intelligence/drilldown/route.ts`; `src/modules/inventory-intelligence/components/InventoryIntelligencePanel.tsx` | Large-dataset performance not load-tested. |
| ANA-012 | Category-size heatmap | Visualizes category demand/stock behavior across sizes. | Implemented | Dashboard | Dashboard/inventory data | `src/modules/dashboard/components/CategorySizeHeatmap.tsx` | Relevant mainly where size-like variants exist. |
| ANA-013 | Raw movement report API | Supplies filterable stock-movement report data. | Backend Only | No separate export/UI beyond reports table use | Reports service | `src/modules/dashboard/services/reportsService.ts`; `src/app/api/reports/route.ts` | No dedicated downloadable artifact. |

### WhatsApp integration

| Feature ID | Feature | Description | Status | User interface | Backend | Evidence | Limitations |
|---|---|---|---|---|---|---|---|
| WA-001 | Integration overview | Shows connection state, assets, readiness, messaging activity and required actions. | Implemented | `/dashboard/whatsapp/overview` | Overview API/service | `src/modules/whatsapp/components/WhatsAppOverviewPage.tsx`; `src/app/api/whatsapp/overview/route.ts`; `src/modules/whatsapp/testing/overview.test.ts` | Admin-only navigation. |
| WA-002 | Meta embedded signup | Creates a secure signup session and exchanges completion data for tenant credentials/assets. | Unverified | `/dashboard/whatsapp` setup | Embedded-signup APIs/service | `src/modules/whatsapp/components/WhatsAppSetupPage.tsx`; `src/app/api/whatsapp/embedded-signup/session/route.ts`; `src/modules/whatsapp/testing/embeddedSignupAuthorization.test.ts` | Live Meta authorization/credentials require external testing. |
| WA-003 | Secure credential storage | Stores tenant access tokens by opaque reference and expiry. | Implemented | Indirect through setup | Prisma credential store | `src/modules/whatsapp/credentials/PrismaWhatsAppCredentialStore.ts`; `src/modules/whatsapp/testing/securityHardening.test.ts` | Repository code cannot establish production secret-management policy. |
| WA-004 | Business-account management | Lists, removes and synchronizes WhatsApp business accounts. | Implemented | `/dashboard/whatsapp/accounts` | Business-account APIs/asset service | `src/modules/whatsapp/components/WhatsAppBusinessAccountsPage.tsx`; `src/app/api/whatsapp/business-accounts/route.ts` | Live sync needs Meta. |
| WA-005 | Phone-number management | Lists, removes and synchronizes phone numbers and statuses. | Implemented | `/dashboard/whatsapp/phone-numbers` | Phone APIs/asset service | `src/modules/whatsapp/components/WhatsAppPhoneNumbersPage.tsx`; `src/app/api/whatsapp/phone-numbers/route.ts` | Live sync needs Meta. |
| WA-006 | Store-to-sender mapping | Maps each store/purpose to a WhatsApp number. | Implemented | `/dashboard/whatsapp/store-mapping` | Sender-mapping APIs/resolver | `src/modules/whatsapp/components/WhatsAppStoreMappingPage.tsx`; `src/app/api/whatsapp/sender-mappings/route.ts`; `src/modules/whatsapp/repositories/selectSenderMapping.ts` | Requires synced eligible number. |
| WA-007 | Store WhatsApp profiles | Configures store messaging identity/settings. | Implemented | `/dashboard/whatsapp/store-profiles` | Store-profile APIs | `src/modules/whatsapp/components/WhatsAppStoreProfilesPage.tsx`; `src/app/api/whatsapp/store-profiles/[storeId]/route.ts` | Profile fields must align with Meta assets. |
| WA-008 | Messaging readiness checks | Diagnoses credentials, sender mapping, templates and configuration before send. | Implemented | `/dashboard/whatsapp/readiness` | Readiness service/API | `src/modules/whatsapp/components/WhatsAppReadinessPage.tsx`; `src/modules/whatsapp/testing/readiness.test.ts` | Passing local readiness cannot guarantee Meta delivery. |
| WA-009 | Integration health diagnostics | Reports connection/token/asset/template health and actionable errors. | Implemented | `/dashboard/whatsapp/health` | Health service/API | `src/modules/whatsapp/components/WhatsAppIntegrationHealthPage.tsx`; `src/modules/whatsapp/testing/diagnostics.test.ts` | External provider outages remain outside control. |
| WA-010 | Template synchronization | Imports/reconciles Meta templates and their statuses. | Implemented | `/dashboard/whatsapp/templates` | Template APIs/reconciliation service | `src/modules/whatsapp/services/WhatsAppTemplateReconciliationService.ts`; `src/modules/whatsapp/testing/templateReconciliation.test.ts` | Live sync requires Meta. |
| WA-011 | Merchant template creation | Creates merchant templates from validated options/blueprints. | Implemented | Templates page | Template create/options APIs | `src/app/api/whatsapp/templates/create/route.ts`; `src/modules/whatsapp/testing/merchantTemplate.test.ts` | Meta approval remains external. |
| WA-012 | Invoice template variables | Resolves organization/store/customer/invoice variables for messages. | Implemented | Indirect in invoice send | Invoice template service | `src/modules/whatsapp/services/invoiceTemplateVariables.ts`; `src/modules/whatsapp/testing/invoiceTemplateVariables.test.ts` | Template must contain compatible variables. |
| WA-013 | Test messages | Sends a validated test message and presents errors. | Implemented | `/dashboard/whatsapp/test-message` | Test-message API/service | `src/modules/whatsapp/components/WhatsAppTestMessagePage.tsx`; `src/modules/whatsapp/testing/testMessage.test.ts` | Actual delivery needs valid Meta account/recipient. |
| WA-014 | Invoice messaging | Queues/sends invoice templates with delivery feedback. | Partial | Invoice selector and billing feedback | Invoice delivery service/APIs | `src/modules/whatsapp/components/WhatsAppInvoiceSelector.tsx`; `src/modules/whatsapp/services/WhatsAppInvoiceDeliveryService.ts`; `src/modules/whatsapp/testing/invoiceDelivery.test.ts` | Live delivery and Meta template approval unverified. |
| WA-015 | Immediate/cron invoice dispatch | Dispatches pending invoice jobs immediately or via protected worker endpoints. | Backend Only | No job-control console | Cron APIs and dispatch service | `src/app/api/cron/whatsapp-invoices/route.ts`; `src/modules/whatsapp/services/immediateInvoiceDispatch.ts`; `scripts/trigger-whatsapp-invoice-worker.test.mjs` | Needs scheduler secret and deployment cron. |
| WA-016 | Webhook ingestion/status updates | Verifies Meta webhooks, stores events, deduplicates, and updates message/conversation status. | Backend Only | Status becomes visible in activity/conversations | Webhook route/service | `src/app/api/whatsapp/webhook/route.ts`; `src/modules/whatsapp/webhooks/metaWebhook.ts`; `src/modules/whatsapp/testing/webhook.test.ts` | Requires a public callback and Meta subscription. |
| WA-017 | Message activity and detail | Lists outbound/inbound messages, statuses, errors and event detail. | Implemented | `/dashboard/whatsapp/messages` | Message APIs/activity service | `src/modules/whatsapp/components/WhatsAppMessageActivityPage.tsx`; `src/modules/whatsapp/testing/messageActivity.test.ts` | Depends on webhook/dispatch data. |
| WA-018 | Contacts and consent | Lists contacts and records purpose-specific opt-in/opt-out status. | Implemented | `/dashboard/whatsapp/contacts` | Contact/consent APIs | `src/modules/whatsapp/components/WhatsAppContactsPage.tsx`; `src/app/api/whatsapp/contacts/[id]/consent/route.ts`; `src/modules/whatsapp/testing/contactConsent.test.ts` | Legal compliance still requires correct business processes. |
| WA-019 | Conversation monitoring | Lists conversations and health/routing state with detail. | Partial | `/dashboard/whatsapp/conversations` | Conversation APIs/service | `src/modules/whatsapp/components/WhatsAppConversationsPage.tsx`; `src/modules/whatsapp/testing/conversationHealth.test.ts` | No agent reply/composer or inbox assignment workflow found. |
| WA-020 | Campaign management/execution | Creates, previews, schedules/executes campaigns, tracks recipients and metrics. | Implemented | `/dashboard/whatsapp/campaigns` | Campaign APIs, queue and cron worker | `src/modules/whatsapp/components/WhatsAppCampaignsPage.tsx`; `src/modules/whatsapp/services/WhatsAppCampaignExecutionService.ts`; `src/modules/whatsapp/testing/campaignExecution.test.ts` | Live scale/delivery requires Meta and scheduler. |
| WA-021 | Messaging automations | Configures trigger-based automated messages and records executions. | Partial | `/dashboard/whatsapp/automations` | Automation CRUD/service | `src/modules/whatsapp/components/WhatsAppAutomationsPage.tsx`; `src/modules/whatsapp/testing/automation.test.ts` | Only repository-defined triggers exist; end-to-end trigger coverage depends on callers. |
| WA-022 | Campaign job queue | Claims due work, handles retries/recipient statuses and prevents unsafe cross-tenant execution. | Backend Only | Reflected through campaign execution status | Prisma job queue | `src/modules/whatsapp/queue/PrismaCampaignJobQueue.ts`; `src/modules/whatsapp/testing/campaignExecution.test.ts` | No general queue administration UI. |

### Settings and administration

| Feature ID | Feature | Description | Status | User interface | Backend | Evidence | Limitations |
|---|---|---|---|---|---|---|---|
| SET-001 | Profile/access summary | Shows current name, email, role, organization and store access. | Implemented | Settings → Profile | Session/store APIs | `src/app/(dashboard)/dashboard/settings/page.tsx` | Self-edit is intentionally unavailable. |
| SET-002 | User management | Creates/edits users, assigns roles/store, activates/deactivates and searches. | Implemented | Settings → Users | User/team APIs | `src/modules/settings/components/UserTable.tsx`; `src/app/api/users/route.ts`; `src/app/api/users/[id]/route.ts` | Owner/admin controls only. |
| SET-003 | Administrator password reset | Lets an authorized administrator set a user’s new password. | Implemented | User table reset modal | `POST /api/users/[id]/reset-password` | `src/modules/settings/components/ResetPasswordModal.tsx`; `src/app/api/users/[id]/reset-password/route.ts` | Admin-set password, not emailed reset-token flow. |
| SET-004 | Store management | Creates/edits/deactivates stores with code, address and phone. | Implemented | Settings → Stores | Store CRUD APIs | `src/modules/settings/components/StoreTable.tsx`; `src/app/api/stores/route.ts`; `src/app/api/stores/[id]/route.ts` | Store code immutable after creation. |
| SET-005 | Billing configuration | Configures invoice prefix and core billing settings. | Implemented | Settings → Billing | Settings API/service | `src/modules/settings/components/BillingConfigForm.tsx`; `src/app/api/settings/route.ts` | `settingsService.ts` contains an obsolete TODO comment, but the active API uses persisted organization settings. |
| SET-006 | Invoice policy management | Configures seller identity, numbering/tax/payment/footer fields and versions policy. | Implemented | Settings → Invoices | Invoice-management API/service | `src/modules/invoice-management/components/InvoiceManagementSettings.tsx`; `src/app/api/invoice-management/route.ts`; `src/modules/invoice-management/invoiceManagementService.test.ts` | Some changes affect only future invoice snapshots. |
| SET-007 | Appearance/theme | Switches/persists application appearance. | Implemented | Settings → Appearance | Client theme provider/settings | `src/modules/settings/components/AppearanceSettings.tsx`; `src/providers/ThemeProvider.tsx` | User-vs-organization persistence scope should be manually confirmed. |
| SET-008 | Self-service profile/security editing | Lets a user change their own name, email and password. | Disabled | Profile says to contact administrator | None | `src/app/(dashboard)/dashboard/settings/page.tsx` | No self-service editor. |
| SET-009 | App settings persistence service | Generic settings hook/service intended to back configuration. | Broken | Consumed by billing settings | Service contains in-memory placeholder implementation | `src/modules/settings/services/settingsService.ts`; `src/modules/settings/hooks/useAppSettings.ts` | Service explicitly says to replace with Prisma; persistence can be lost or diverge from API-backed settings. |
| SET-010 | Color palette/naming system | Supplies named colors, shades and reusable color UI utilities. | Partial | Product/category color controls | Shared color utilities | `src/shared/theme/colorNaming.ts`; `src/shared/components/ColorBadge.tsx` | Image color extraction returns an empty placeholder result. |

### Expenses, accounting and payroll

| Feature ID | Feature | Description | Status | User interface | Backend | Evidence | Limitations |
|---|---|---|---|---|---|---|---|
| EXP-001 | Expense transactions | Creates, edits, lists and deletes store expenses. | Implemented | `/dashboard/expenses` | Expense CRUD APIs | `src/modules/expenses/components/ExpenseForm.tsx`; `src/app/api/expenses/route.ts`; `src/app/api/expenses/[id]/route.ts` | Manager/admin access. |
| EXP-002 | Expense categories | Creates and manages categorized expense options. | Implemented | Expense advanced/forms | Category APIs | `src/modules/expenses/services/expenseCategoryService.ts`; `src/app/api/expenses/categories/route.ts` | No category hierarchy. |
| EXP-003 | Expense filters | Filters transactions by store, dates, category and status. | Implemented | Expense transaction page | Expense service query | `src/app/(dashboard)/dashboard/expenses/page.tsx`; `src/modules/expenses/services/expenseService.ts` | No saved views. |
| EXP-004 | Recurring expense templates | Marks expenses recurring, lists templates and stops recurrence. | Partial | Expenses recurring drawer | Recurring fields persisted | `src/app/(dashboard)/dashboard/expenses/page.tsx`; `prisma/schema.prisma` (`StoreExpense.isRecurring`) | No scheduler that automatically posts each recurrence was found. |
| EXP-005 | Monthly category budgets | Sets category budgets by store/month/year. | Implemented | Expenses and analytics | Budget APIs/service | `src/app/api/expenses/budgets/route.ts`; `src/modules/expenses/services/expenseBudgetService.ts` | Alerts are visual; no push/email job found. |
| EXP-006 | Budget-vs-actual warnings | Shows utilization and 90%/100% warning states. | Implemented | Expense pages | Expense summaries/budgets | `src/app/(dashboard)/dashboard/expenses/analytics/page.tsx` | Does not prevent overspend. |
| EXP-007 | Expense analytics | Shows month/year totals, top category, category pie and monthly trend. | Implemented | `/dashboard/expenses/analytics` | Expense analytics API | `src/modules/expenses/components/ExpenseCategoryPieChart.tsx`; `src/modules/expenses/components/ExpenseMonthlyTrendChart.tsx`; `src/app/api/dashboard/expense-analytics/route.ts` | Descriptive analytics only. |
| EXP-008 | GST/ITC register | Summarizes GST paid, claimable ITC, registered vendors and line detail. | Implemented | `/dashboard/expenses/gst` | Expense tax fields | `src/app/(dashboard)/dashboard/expenses/gst/page.tsx`; `prisma/schema.prisma` (`StoreExpense`) | No tax filing/export integration. |
| EXP-009 | Advanced expense workspace | Provides advanced expense tabs/settings. | UI Only | `/dashboard/expenses/advanced` | No distinct advanced backend beyond existing expense services | `src/app/(dashboard)/dashboard/expenses/advanced/page.tsx`; `src/modules/expenses/components/ExpenseAdvancedTab.tsx` | Some advanced concepts are presentation over existing data, not separate workflows. |
| EXP-010 | Accounting ledger/reconciliation | General ledger, chart of accounts, bank reconciliation and journal entries. | Partial | None | No accounting models/services | `prisma/schema.prisma`; expense modules only | Expense/GST reporting is not full accounting. |
| EXP-011 | Payroll/salary processing | Computes salary, deductions, payslips and payroll disbursement. | Partial | None | No payroll model/service | `prisma/schema.prisma`; `src/modules/staff` | Attendance exists, but payroll does not. |
| EXP-012 | Expense summary API | Supplies aggregated expense totals for other screens. | Implemented | Used by expense pages | `GET /api/expenses/summary` | `src/app/api/expenses/summary/route.ts`; `src/modules/expenses/services/expenseService.ts` | Not independently user-facing. |

### Attendance and leave

| Feature ID | Feature | Description | Status | User interface | Backend | Evidence | Limitations |
|---|---|---|---|---|---|---|---|
| STF-001 | Staff check-in | Records an employee’s store attendance start. | Implemented | `/dashboard/attendance-leave` and `/dashboard/attendance` | `POST /api/attendance/check-in` | `src/modules/staff/components/AttendanceView.tsx`; `src/modules/staff/services/attendanceService.ts` | No biometric/geofence validation. |
| STF-002 | Staff check-out | Records end time and calculated duration. | Implemented | Attendance view | `POST /api/attendance/check-out` | `src/modules/staff/services/attendanceService.ts`; `src/app/api/attendance/check-out/route.ts` | No break tracking. |
| STF-003 | Attendance history/summary | Lists date-range history and counts present/leave/weekly-off states. | Implemented | Attendance & Leave page | Attendance history API | `src/modules/attendance-leave/components/AttendanceLeavePage.tsx`; `src/app/api/attendance/history/route.ts` | Timezone behavior should be manually verified around midnight. |
| STF-004 | Attendance override | Allows workforce managers to correct attendance. | Implemented | Admin configuration/attendance UI | `POST /api/attendance/override` | `src/modules/staff/services/attendanceService.ts`; `src/app/api/attendance/override/route.ts` | No dedicated immutable correction audit view. |
| STF-005 | Leave application | Employees request dated leave by type/reason. | Implemented | Attendance/leave view | `POST /api/leave/apply` | `src/modules/staff/components/LeaveManagementView.tsx`; `src/app/api/leave/apply/route.ts` | No attachment support. |
| STF-006 | Leave approval/rejection/cancel | Managers decide requests and employees can cancel eligible requests. | Implemented | Leave management | Approve/reject/cancel APIs | `src/app/api/leave/approve/route.ts`; `src/app/api/leave/reject/route.ts`; `src/app/api/leave/cancel/route.ts` | No multi-level approval. |
| STF-007 | Store leave policies/balances | Sets allowed leave by type and maintains balances. | Implemented | Attendance settings drawer | Leave-policy API/service | `src/modules/staff/services/leavePolicyService.ts`; `src/app/api/leave/policy/route.ts`; `prisma/schema.prisma` (`LeaveBalance`) | Accrual rules are simple annual limits. |
| STF-008 | Weekly-off configuration | Configures recurring weekly days off by user/store. | Backend Only | Used in attendance calculations; configuration exposure is limited | Weekly-off API/service | `src/app/api/weekly-off/set/route.ts`; `src/modules/staff/services/weeklyOffService.ts` | No rich shift/roster planner. |

### Platform administration

| Feature ID | Feature | Description | Status | User interface | Backend | Evidence | Limitations |
|---|---|---|---|---|---|---|---|
| ADM-001 | Super-admin bootstrap/login | Bootstraps and authenticates a platform super-admin. | Implemented | `/stockiva-admin/login`, `/signup` | Bootstrap/status and auth APIs | `src/app/(stockiva-admin)/stockiva-admin/login/page.tsx`; `src/app/api/admin/create-super-admin/route.ts` | Bootstrap must be secured operationally. |
| ADM-002 | Platform dashboard | Shows platform-wide organization/user/store/product/revenue-style stats. | Implemented | `/admin` | Admin stats API/service | `src/modules/platform-admin/components/dashboard/PlatformAdminDashboard.tsx`; `src/app/api/admin/stats/route.ts` | Metric definitions should be validated with production data. |
| ADM-003 | Organization directory/detail | Searches, filters and inspects tenant organizations. | Implemented | `/admin/organizations`, `/[id]` | Admin organizations APIs | `src/modules/platform-admin/components/organizations/PlatformAdminOrganizations.tsx`; `src/app/api/admin/organizations/route.ts` | Sensitive platform access is super-admin only. |
| ADM-004 | Organization suspension action | Suspends/unsuspends a tenant from its detail panel. | UI Only | Organization detail panel | No action wired | `src/modules/platform-admin/components/organizations/PlatformAdminOrgDetailPanel.tsx` | Handler is an explicit TODO. |
| ADM-005 | Platform user directory | Searches, pages and manages platform-wide users. | Implemented | `/admin/platform-users` | Admin users APIs | `src/modules/platform-admin/components/users/PlatformAdminUsers.tsx`; `src/app/api/admin/users/route.ts` | Destructive/account actions require manual verification. |
| ADM-006 | Pricing plan catalog | Displays Free/Pro/Enterprise plans, limits and feature matrix. | UI Only | `/admin/pricing-plans` | Static constants only | `src/modules/platform-admin/constants.tsx`; `src/app/(admin)/admin/pricing-plans/page.tsx` | Comment explicitly says backend will own plans later; edits are not persisted. |
| ADM-007 | Feature flags | Creates/updates/deletes platform flags with targeting/value state. | Implemented | `/admin/feature-flags` | Feature-flag APIs/service | `src/app/api/admin/feature-flags/route.ts`; `src/modules/admin/services/featureFlagsService.ts`; `prisma/schema.prisma` | Runtime consumption by product modules is limited/not centrally evident. |
| ADM-008 | Announcements | Creates, edits, deletes and schedules platform announcements. | Implemented | `/admin/announcements` | Announcement APIs/service | `src/app/api/admin/announcements/route.ts`; `src/modules/admin/services/announcementsService.ts`; `prisma/schema.prisma` | Tenant-facing rendering is not clearly exposed. |
| ADM-009 | Platform analytics | Shows organization/user/product/store growth and plan distribution. | Implemented | `/admin/analytics` | Analytics API/service | `src/app/api/admin/analytics/route.ts`; `src/modules/admin/services/analyticsService.ts` | No export/warehouse integration. |
| ADM-010 | Admin audit log | Stores and searches privileged actions by actor/action/target. | Backend Only | `/admin/audit-log` provides reader; write coverage varies by admin operation | Audit service/API/model | `src/modules/platform-admin/components/audit-log/PlatformAdminAuditLog.tsx`; `src/modules/admin/services/auditLogService.ts`; `prisma/schema.prisma` | Not every non-admin tenant action is audited. |

### Mobile and responsive functionality

| Feature ID | Feature | Description | Status | User interface | Backend | Evidence | Limitations |
|---|---|---|---|---|---|---|---|
| MOB-001 | Mobile viewport workspace | Switches to touch-oriented dashboard components on small screens. | Implemented | Dashboard shell | Client viewport/context | `src/modules/mobile-dashboard/hooks/useMobileViewport.ts`; `src/modules/mobile-dashboard/context/MobileWorkspaceContext.tsx`; `src/modules/layout/components/AppLayout.tsx` | Device-matrix QA is not automated. |
| MOB-002 | Mobile dashboard/navigation | Provides bottom navigation, cards, list items and floating actions. | Implemented | Mobile dashboard | Shared APIs | `src/modules/mobile-dashboard/components/BottomNavigation.tsx`; `src/modules/mobile-dashboard/pages/DashboardPage.tsx` | Not every desktop module has a dedicated mobile page. |
| MOB-003 | Mobile catalog/stock | Provides mobile products, categories, brands and stock pages with compact search/filter patterns. | Implemented | Mobile workspace | Existing catalog/stock APIs | `src/modules/mobile-dashboard/pages/ProductsPage.tsx`; `CategoriesPage.tsx`; `BrandsPage.tsx`; `StockPage.tsx` | Advanced product filters are primarily desktop. |
| MOB-004 | Mobile POS and split payment | Provides touch cart, filters and split payment controls. | Implemented | Mobile billing | Billing APIs | `src/modules/mobile-dashboard/pages/BillingPage.tsx`; `src/modules/mobile-dashboard/components/BillingCart.tsx`; `SplitPaymentPanel.tsx` | Hardware/payment delivery still external. |
| MOB-005 | Responsive coverage beyond core modules | Makes administration, reports, expenses, purchasing and WhatsApp fully feature-equivalent on mobile. | Partial | General responsive CSS/Ant layouts | Shared backends | Module CSS and Ant responsive props across `src/app/(dashboard)` and `src/modules` | Dedicated mobile implementations exist only for core dashboard/catalog/stock/billing; some dense tables remain desktop-oriented. |

### Other capabilities

| Feature ID | Feature | Description | Status | User interface | Backend | Evidence | Limitations |
|---|---|---|---|---|---|---|---|
| OTH-001 | Public marketing landing page | Presents product value, industries, calls to action and demo-request form. | Implemented | `/`; responsive | `POST /api/demo-requests` | `src/app/LandingPage.tsx`; `src/app/api/demo-requests/route.ts`; `src/modules/marketing/demoRequestSchema.test.ts` | Lead routing/notification destination requires environment review. |
| OTH-002 | Interactive product demo | Provides a self-contained guided UI demonstration. | Implemented | `/demo` | Client demonstration state | `src/app/demo/InteractiveDemo.tsx`; `src/app/demo/page.tsx` | Demo actions are illustrative and do not persist real business data. |
| OTH-003 | Email/communication delivery | Sends verification, invitation, alert or other communications through configured providers. | Unverified | Indirect | Email/communication services | `src/app/api/auth/register/route.ts`; `src/app/api/auth/resend-verification/route.ts`; `src/modules/communication/services/CommunicationService.ts`; `.env.example` | External provider configuration and delivery were not exercised. |

## Incomplete or broken features

| Feature ID | Status | What needs work or investigation | Evidence |
|---|---|---|---|
| AUTH-005 | Partial | Implement a secure reset token, expiry, reset form and actual recovery email. | `src/app/api/auth/forgot-password/route.ts` |
| AUTH-014 | Disabled | Add enrollment, recovery codes and sign-in challenge if 2FA is required. | `src/app/(dashboard)/dashboard/settings/page.tsx` |
| PRD-018 | Partial | Duplication is a prefilled-copy workflow, not an atomic clone of all related data. | `src/modules/products/utils/duplicateProduct.ts` |
| INV-015 | Partial | Add an atomic inter-store transfer document, approval/receipt states and paired movements. | No transfer route/model in `src/app/api/stock` or `prisma/schema.prisma`. |
| PUR-009 | Partial | Add vendor invoice attachment, landed costs, reversal and stronger partial-receipt controls. | `src/app/api/purchase-orders/[id]/receive/route.ts` |
| POS-020 | Partial | Add documented shortcuts and accessibility/E2E coverage for dense POS interactions. | `src/modules/billing/components/BillingView.tsx` |
| RET-008 | Partial | Add a dedicated return register and return/exchange document output. | `src/modules/billing/services/billingService.ts` |
| CUS-012 | Partial | Add an organization-wide due-follow-up queue and reminders. | `src/modules/customers/services/customerFollowUpService.ts` |
| CUS-013 | Partial | Loyalty points/tiers/redemption do not exist despite customer value analytics. | No corresponding models in `prisma/schema.prisma`. |
| DEM-010 | Partial | Connect demand insights to replenishment or draft purchase orders. | Demand and PO services are separate. |
| WA-014 | Partial | Validate live Meta approval, dispatch and delivery across deployment environments. | `src/modules/whatsapp/services/WhatsAppInvoiceDeliveryService.ts` |
| WA-019 | Partial | Add an agent reply/composer, ownership and inbox workflow for conversations. | `src/modules/whatsapp/components/WhatsAppConversationsPage.tsx` |
| WA-021 | Partial | Confirm every configured trigger is invoked from its source business event. | `src/modules/whatsapp/services/WhatsAppAutomationService.ts` |
| SET-008 | Disabled | Self-service profile/password editing is intentionally unavailable. | Settings profile text. |
| SET-009 | Broken | Replace placeholder/in-memory generic settings service with one authoritative persisted API. | `src/modules/settings/services/settingsService.ts` |
| SET-010 | Partial | Implement image color extraction or remove the advertised helper. | `src/shared/theme/colorNaming.ts` |
| EXP-004 | Partial | Add a scheduler/posting engine for recurring expenses. | `prisma/schema.prisma`; expense routes. |
| EXP-009 | UI Only | Clarify which advanced expense tabs are real workflows and add backend support where needed. | `src/modules/expenses/components/ExpenseAdvancedTab.tsx` |
| EXP-010 | Partial | Add proper ledger, journals and reconciliation if accounting is in scope. | No accounting schema/services. |
| EXP-011 | Partial | Add salary rules, payroll periods, payslips and disbursement if payroll is in scope. | No payroll schema/services. |
| ADM-004 | UI Only | Wire tenant suspend/unsuspend to an authorized audited API. | Explicit TODO in `PlatformAdminOrgDetailPanel.tsx`. |
| ADM-006 | UI Only | Persist plan definitions and plan changes; current cards are static constants. | `src/modules/platform-admin/constants.tsx` |
| MOB-005 | Partial | Complete mobile-specific coverage and QA for table-heavy modules. | Mobile module coverage versus dashboard routes. |

## Backend features without a dedicated UI

| Feature ID | Capability | Current exposure |
|---|---|---|
| INV-013 | Protected scheduled low-stock/reorder evaluation | Cron/API only. |
| INV-016 | Historical stock reconstruction | Used inside analytics, no standalone ledger snapshot screen. |
| ANA-013 | Raw stock movement report service | API/service data without a dedicated export product. |
| WA-015 | Invoice dispatch worker and per-job trigger | Cron/script only. |
| WA-016 | Meta webhook verification, deduplication and event processing | Background inbound endpoint; results appear indirectly. |
| WA-022 | Campaign job claiming/retry queue | Reflected in campaign status, no queue console. |
| STF-008 | Weekly-off persistence/calculation | API-backed, without a full roster planner. |
| ADM-010 | Audit-event recording capability | Reader UI exists, but event production is backend and coverage varies. |

## Existing technical capabilities

- **Multi-tenancy and store scoping:** Organization and store foreign keys span the operational schema; auth helpers and services scope access. WhatsApp has explicit tenant-isolation tests.
- **Authentication and authorization:** NextAuth v5 credentials plus optional Google OAuth, JWT claims, email verification, onboarding guards, roles, role-filtered navigation, store assignments and super-admin separation.
- **Transactional inventory:** Sales, returns, purchase receipts and adjustments create stock entries/movements through Prisma transactions.
- **Historical commercial snapshots:** Sales and invoices retain item price/cost/tax/configuration data so later catalog/settings edits do not rewrite history.
- **Auditability:** Stock movements, sale payments, return transactions, WhatsApp message events/webhooks/automation executions, attendance overrides and platform admin audit records provide domain audit trails.
- **Background processing:** Protected cron endpoints cover reorder checks, WhatsApp campaigns and WhatsApp invoice delivery; Prisma-backed claiming supports campaign work.
- **External integrations:** Google OAuth, Vercel Blob, Meta WhatsApp Cloud API, browser cameras/barcode decoding, React PDF/Puppeteer PDF rendering and configurable email transport.
- **Caching/data fetching:** TanStack Query providers/hooks cache server state with feature-specific query keys; customer tests cover stale-key risks.
- **Validation:** Zod schemas and route/service validation cover marketing leads, invoice settings, demand capture and WhatsApp commands; business services add authorization and transaction checks.
- **Data migration/repair tooling:** Prisma migrations and scripts cover variant SKUs, reference numbers, payment distribution verification and exchanged-sale repair.
- **Automated evidence:** During this audit, `test:inventory-intelligence` (16), `test:demand-intelligence` (11) and `test:customers` (28) all passed: 55 tests, zero failures. Additional unit/integration tests exist for invoices, barcodes, pricing, billing and WhatsApp but were not all executed in this audit.

## Features requiring manual verification

| Feature ID(s) | Why repository inspection is insufficient | Practical QA test |
|---|---|---|
| AUTH-002 | Needs live Google credentials/callback. | Sign in with a new and existing Google account; verify onboarding, claims and logout. |
| AUTH-003–004, AUTH-009–010, OTH-003 | Email transport/delivery is external. | Send verification and invitation emails in staging; verify links, expiry, replay protection and spam-safe formatting. |
| PRD-012 | Blob upload depends on credentials/network. | Upload valid/invalid images, refresh detail/list views and test deletion/replacement behavior. |
| INV-008 | Camera behavior varies by permission, HTTPS, browser and device. | Test EAN/UPC and internal barcodes on iOS Safari, Android Chrome and a desktop webcam. |
| INV-010, POS-016–017 | Browser/PDF engines, fonts and printers vary. | Preview/download/print long invoices and multi-page label sheets in the deployment image. |
| POS-011–013, RET-006 | App records tender but does not settle through a gateway. | Reconcile cash/card/UPI/split/partial/refund cases against the business’s real payment process. |
| POS-014–015 | Date authorization and number concurrency are business/deployment concerns. | Create simultaneous invoices and authorized backdated sales across stores; confirm unique sequence and reporting dates. |
| WA-002–022 | Meta auth, template approval, webhooks and delivery are external. | Complete embedded signup in staging, sync assets/templates, send test/invoice/campaign messages, and verify delivered/read/failed webhook transitions and consent enforcement. |
| STF-001–004 | Local time and concurrent check events need runtime testing. | Check in/out around Asia/Kolkata midnight, repeat requests, correct records, and verify totals/permissions. |
| ADM-001 | Initial super-admin bootstrap is security-sensitive. | Verify bootstrap closes after first admin, cannot be replayed, and non-super-admin sessions cannot reach admin APIs. |
| MOB-001–005 | Responsive intent does not prove device usability. | Run core flows at 320/375/768 px widths and on real touch devices; check overflow, keyboards, drawers and scan controls. |

## Audit notes and exclusions

- The audit treats active routed code as authoritative. README files and implementation reports were used only as navigation aids, never as sole proof.
- Static HTML files under `public/designs/` are design references, not implemented product features.
- Maintenance scripts are technical capabilities, not separately counted user features unless they support an active workflow.
- No production data was changed, no external message/email/payment was sent, and no live Meta/Google/blob service was contacted.
- No automated browser E2E suite was found in the repository. The three package-provided domain test commands run during the audit passed; remaining tests were inspected but not all executed because several require environment/database/provider setup.
- Payroll, full accounting, bank reconciliation, inter-store transfers, a customer loyalty engine and a customer-facing portal are not implemented as product modules.
