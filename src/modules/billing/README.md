# Billing Module — Phase 8

## Status: Interface Defined, Implementation Pending

This module contains the service interface and types for the billing/sales system.
It will be fully implemented in Phase 8 of the project plan.

## What's Ready Now
- `types.ts` — Full TypeScript types for Sale, SaleItem, CreateSaleInput, SaleFilters
- `services/billingService.ts` — Method signatures defined, throws "not implemented" errors
- Database tables (`sales`, `sale_items`) — Created in Prisma schema, empty

## What Will Be Built in Phase 8
1. **billingService implementation** — createSale, refundSale, generateInvoice
2. **Billing UI** — Scan/search → cart → discount → checkout → invoice preview
3. **CartDrawer** — Sidebar cart with quantity management
4. **InvoicePreview** — Printable PDF invoice
5. **SalesHistory** — ProTable of past sales with filters
6. **Dashboard integration** — Sales KPIs (today's revenue, etc.)

## Key Integration Point
The billing service calls `stockService.adjustStock()` from `modules/stock/` to decrement
inventory on sale and restore it on refund. This is the SAME service used by manual
stock adjustments and purchase order receiving — ensuring a single source of truth
for all stock mutations.

## No Breaking Changes Required
When implementing this module:
- Schema is already set up (Sale, SaleItem tables exist)
- Stock service already supports `type: 'SALE'` and `type: 'RETURN'`
- API route stub exists at `app/api/billing/route.ts`
- Only this module's files need to change
