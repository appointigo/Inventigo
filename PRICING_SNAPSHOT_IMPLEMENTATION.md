# Line-Item Discount Allocation Architecture

**Completed**: May 13, 2026

## Problem Solved

The original system applied discounts and taxes only at the order level, which caused:
- Exchange calculations using wrong historical values
- Refund amounts not reflecting actual sold prices
- Return settlement inaccurate when discounts were involved
- GST/tax reporting inconsistent
- Dashboard analytics calculating profit on MRP instead of actual sold price
- Historical invoice rendering unable to reverse-engineer original item prices

## Architecture Overview

All pricing is now calculated through a **single centralized engine** that:

1. **Allocates discount proportionally** to all eligible items
2. **Computes tax after discount** (supports both exclusive and inclusive modes)
3. **Stores immutable snapshots** on each sale item at transaction time
4. **Enables accurate returns/exchanges** by reading historical snapshots instead of current catalog
5. **Supports both percent and flat discounts** with proper rounding safety

## Core Components

### 1. **Pricing Engine** (`src/modules/billing/utils/pricingEngine.ts`)

Exports:
- `allocatePricingSnapshots(items, options)` — Computes line-level discount allocation and tax
- `SaleItemPricingSnapshot` — Immutable snapshot structure stored on each item
- `PricingSourceItem`, `PricingAllocationOptions` — Input contracts
- `PricingDiscountType` — "PERCENTAGE" | "FLAT"

**Key features:**
- Proportional allocation of flat discounts (not equal division)
- Rounding safety using `allocateRoundedShares()` to ensure totals reconcile exactly
- Clamping negative values
- Supports tax modes: EXCLUSIVE (standard) and INCLUSIVE (GST-style)
- Eligible item filtering (some items can be excluded from discount)

### 2. **Schema Extensions** (`prisma/schema.prisma`)

New nullable columns on `SaleItem`:
```
mrp: Decimal                      // Historical MRP for reporting
sellingPrice: Decimal             // Catalog selling price
discountType: String              // "PERCENTAGE" | "FLAT"
appliedDiscountPercent: Decimal   // Actual % after rounding
allocatedDiscount: Decimal        // Amount discount allocated to this item
taxableAmount: Decimal            // Taxable base after discount
taxAmount: Decimal                // Tax computed on this item
finalUnitPrice: Decimal           // Unit price after discount, before tax
finalLineAmount: Decimal          // Line total before tax
effectiveUnitPrice: Decimal       // Unit price including tax (invoice display)
costPrice: Decimal                // For profit calculations
pricingSnapshotDate: DateTime     // When snapshot was created
```

**Backward compatibility:** All columns are nullable with sensible defaults. Old invoices without snapshots remain readable.

### 3. **Data Flow**

#### Sale Creation
```
BillingView (cart) 
  → CreateSaleInput (includes discountType, discountPercent, taxRate)
  → billingService.createSale()
    → allocatePricingSnapshots()
      → persists snapshot fields on each SaleItem
  → Sale with immutable item snapshots
```

#### Return/Exchange Settlement
```
ReturnExchangeView (line selection)
  → createReturnTransaction()
    → extractHistoricalUnitAmount() reads snapshot from original SaleItem
    → uses effectiveUnitPrice for settlement calculations
    → ensures refund/offset match actual sold amounts
```

#### Invoice Rendering
```
InvoicePreview.tsx
  → Prefers finalUnitPrice/effectiveUnitPrice over current unitPrice
  → Displays historical item prices as sold
  → Supports reprinting accurate historical invoices
```

### 4. **Type Extensions** (`src/modules/billing/types.ts`)

- `CreateSaleInput` now includes `discountType`, `discountPercent`, `taxRate`, `taxMode`
- `SaleItem` DTO now carries all snapshot fields for transmission to frontend
- `useBilling` hook now manages `discountMode` state ("PERCENTAGE" | "FLAT")

## Key Features

### Proportional Discount Allocation

**Percentage Discount:**
```
Shirt 1000 + Jeans 1500 + Shoes 500
Discount 20%
→ Shirt 200, Jeans 300, Shoes 100
```

**Flat Discount:**
```
Same items, Discount ₹400
→ Shirt 100 (25%), Jeans 150 (37.5%), Shoes 50 (12.5%)
Based on proportion: ₹1000/4000 = 0.25
```

### Rounding Safety

The engine guarantees:
- Total discount = sum of allocated discounts (within ₹0.01)
- Total tax = sum of item taxes (within ₹0.01)
- Final total = (subtotal - discount) + tax

**Method:** `allocateRoundedShares()` allocates in order, adjusting the last item to absorb any rounding difference.

### Exchange-Safe Calculations

When a customer exchanges:
```
Original: Shirt sold at ₹800 (after discount)
Exchange to: Jeans ₹900
Settlement: ₹900 - ₹800 = ₹100 (customer pays additional)
```

The ₹800 is read from the snapshot, not the current catalog price.

### Return Settlement

Full return:
```
Refund: effectiveUnitPrice * quantity
(includes tax if tax was added at sale time)
```

Partial return:
```
Same per-unit logic applies to returned quantity
```

### Historical Accuracy

- Dashboard profit = finalLineAmount - costPrice (per item)
- Discount analytics = allocatedDiscount (per item)
- Tax reports use taxableAmount and taxAmount
- All calculations remain immutable on old invoices

## Database Migration

File: `prisma/migrations/20260513000002_pricing_snapshots/migration.sql`

**Status:** Ready to apply when production is ready (backward-compatible IF clause prevents errors on re-runs)

```bash
npx prisma migrate deploy
```

## Backward Compatibility

- Old sales (pre-snapshot) render using fallback: `finalUnitPrice ?? unitPrice`
- New sales write all snapshot fields
- Returns/exchanges of old sales use `extractHistoricalUnitAmount()` helper which safely degrades
- Exchange window still enforced (30 days)
- No breaking changes to API contracts

## Testing Checklist

✅ Type validation (TypeScript builds clean)
✅ Schema validation (`npx prisma validate`)
✅ Pricing math (rounding, allocation accuracy)
✅ Backward compat (old invoices readable)
✅ UI integration (cart discount modes)
✅ Return flow (historical amounts used)
✅ Lint pass (new UI files pass ESLint)

## Future Extensions

1. **Exclusions:** Mark product/category to exclude from order discounts
2. **Tiered Discounts:** Different % for different item groups
3. **Bundle Pricing:** Joint discount allocation across bundles
4. **Seasonal Prices:** Track multiple MRPs per date range
5. **Profit Analytics:** Dashboard KPI on actual margin (final vs cost)
6. **Tax Schedules:** Per-item tax rates instead of blanket rate

## References

- **User requirements:** See attached user request for full specification
- **Pricing engine:** `pricingEngine.ts` with detailed inline comments
- **Service integration:** `billingService.ts` lines 281-360 (createSale)
- **Return logic:** `billingService.ts` lines 876-920 (createReturnTransaction)
