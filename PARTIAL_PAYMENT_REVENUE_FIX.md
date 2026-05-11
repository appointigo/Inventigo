# Partial Payment Revenue Reporting + Payment Timeline Visibility - Implementation Complete

## Summary

Implemented comprehensive fixes for partial payment revenue reporting and payment timeline visibility across the billing system. This ensures accurate revenue tracking (cash actually collected vs. invoice totals) and provides staff complete visibility into payment history for all sales.

---

## Problem 1: Total Sales Stat Tile Not Counting Partial Payments Correctly ✅

### What Was Wrong
- Revenue was calculated using `SUM(Sale.total)` which counted full invoice values even if not fully paid
- Alternatively used `SUM(Sale.amountPaid)` which only captured initial payments, missing subsequent collections
- A ₹999 sale with ₹500 paid initially and ₹499 collected later would show only ₹500 in revenue

### The Fix
Revenue now correctly equals actual cash collected using `SUM(SalePayment.amount)` grouped by `paidAt` date, not `createdAt`.

**Example Flow:**
- Sale created May 10 for ₹999
- Payment 1: ₹500 on May 10 (via SalePayment) → May revenue +₹500
- Payment 2: ₹499 on May 14 (via SalePayment) → May revenue +₹499
- Final state: Sale still shows PARTIAL, but both ₹500 AND ₹499 were counted as revenue in their respective payment months

---

## Problem 2: No Visibility Into Partial Payment History ✅

### What Was Wrong
- Staff couldn't see when initial vs. subsequent payments were made
- No way to track payment timeline
- Payment notes weren't displayed
- Staff had no way to identify when a customer went silent on payments

### The Fix
Implemented comprehensive payment history timeline visible for **all sales** (not just PARTIAL ones) when card is expanded.

---

## Files Modified

### 1. Backend: Billing Stats & Revenue Calculations

**File:** [`src/modules/billing/services/billingService.ts`](src/modules/billing/services/billingService.ts)

#### `getSalesKPIs()` - COMPLETELY REWRITTEN
**Old Response Shape:**
```javascript
{
  todaySales: number,
  todayRevenue: number,
  totalSales: number,
  totalRevenue: number,
  openReceivables: number
}
```

**New Response Shape:**
```javascript
{
  // Monthly revenue tracking (actual cash collected)
  totalCollected: number,           // SUM(SalePayment.amount) this month
  totalCollectedLastMonth: number,  // SUM(SalePayment.amount) last month
  growthPercent: number,            // Growth % with proper math

  // Exchange tracking
  exchangeCount: number,
  exchangesFlaggedForReview: number,

  // Refund tracking
  refundCount: number,
  refundGrowthPercent: number,

  // Receivables (money customers still owe)
  amountReceivable: number,         // SUM(Sale.amountDue) WHERE paymentStatus = 'PARTIAL'
  receivableCustomerCount: number,  // Unique customers with outstanding balances

  // Refunds store owes (money store has committed to return)
  pendingRefundAmount: number,      // SUM(ReturnTransaction.refundAmount) WHERE status != 'REFUNDED'
  pendingRefundCount: number
}
```

**Key Changes:**
- Uses `SalePayment.amount` with `paidAt` date filter (not `Sale.total` with `createdAt`)
- Calculates month-over-month growth correctly
- Separates AMOUNT RECEIVABLE (customer owes store) from PENDING REFUNDS (store owes customer)
- Includes customer/transaction counts for context

---

### 2. Revenue Report Endpoints

**Files:**
- [`src/app/api/reports/sales-breakdown-v2/route.ts`](src/app/api/reports/sales-breakdown-v2/route.ts)
- [`src/app/api/reports/profit-margin/route.ts`](src/app/api/reports/profit-margin/route.ts)

**Changes:**
- Both endpoints now use `SalePayment` records instead of `Sale` records
- Group by `paidAt` date instead of `createdAt` for accurate period revenue
- Return transaction `netAmount` still included as revenue contribution
- Discount/cost calculations preserved for profit margin calculations

**Before (WRONG):**
```sql
SUM(s.total) FROM sales s WHERE s.createdAt >= monthStart
```

**After (CORRECT):**
```sql
SUM(sp.amount) FROM sale_payments sp WHERE sp.paidAt >= monthStart
```

---

### 3. Frontend: Dashboard Stats Strip

**File:** [`src/modules/billing/components/StatsStrip.tsx`](src/modules/billing/components/StatsStrip.tsx)

**Changes:**
- TOTAL SALES tile now shows `kpis.totalCollected` with actual growth % calculation
- Added AMOUNT RECEIVABLE tile (orange):
  - Shows money customers still owe
  - Displays count of customers with outstanding balances
  - DollarOutlined icon
- Split "PENDING REFUND" into "PENDING REFUNDS" tile (red):
  - Shows money store owes customers
  - Displays count of transactions
  - HourglassOutlined icon
- EXCHANGES and REFUNDS tiles now use actual counts from KPIs
- Layout: 4 tiles in row 1, 1 tile in row 2

**Visual Hierarchy:**
```
Row 1: [TOTAL SALES] [EXCHANGES] [REFUNDS] [AMOUNT RECEIVABLE]
Row 2: [PENDING REFUNDS]
```

---

### 4. Frontend: Payment History Section (NEW)

**File:** [`src/modules/billing/components/PaymentHistorySection.tsx`](src/modules/billing/components/PaymentHistorySection.tsx) (NEW)

**Displays for ALL sales when expanded:**
- Complete chronological timeline of all SalePayment records
- Each payment shows:
  - Payment method (Cash, Card, UPI)
  - Amount collected
  - Date/time paid (format: "10 May 2026, 5:52 PM")
  - Staff member who collected payment
  - Payment tag (Initial payment, Top-up, Balance cleared ✓, Full payment)
  - Note if present (e.g., "Paid at counter")

**Payment Tags:**
- 🟦 **Initial payment** (gray tag, first payment)
- 🟩 **Top-up** (blue tag, subsequent payments)
- 🟩 **Balance cleared ✓** (green tag, final payment that cleared balance)
- 🟩 **Full payment** (green tag, single payment that paid invoice in full)

**Summary Line:**
"Total collected: ₹500 of ₹999 · ₹499 still due"

---

### 5. Frontend: Payment Collection Form (REFACTORED)

**File:** [`src/modules/billing/components/CollectPaymentSection.tsx`](src/modules/billing/components/CollectPaymentSection.tsx) (REFACTORED)

**Changes:**
- Now focuses on COLLECT NOW form only
- Payment history moved to PaymentHistorySection (shown for all sales)
- Title changed to "COLLECT PAYMENT"
- Displays outstanding balance prominently in red
- Form includes:
  - Amount input (pre-filled with full amountDue, editable, validates ≤ max)
  - Payment method selector (Cash | Card | UPI) - defaults to original sale method
  - Optional note field (e.g., "Paid via transfer, ref #XYZ")
  - Loading state during submission
  - Error display inline

**Only shown when:** `record.paymentStatus === "PARTIAL"`

---

### 6. Frontend: Transaction Card Integration

**File:** [`src/modules/billing/components/TransactionCard.tsx`](src/modules/billing/components/TransactionCard.tsx) (UPDATED)

**Changes:**
- Now imports both `PaymentHistorySection` and `CollectPaymentSection`
- For SALES (not return transactions):
  - Always shows `PaymentHistorySection` (visible for all payment statuses)
  - Only shows `CollectPaymentSection` when `paymentStatus === "PARTIAL"`
  - Payment history positioned above collect form
- Staff name correctly displayed in "Created by" field (from `record.userName`)

**Order Details Column now shows:**
```
Invoice: INV-20260510-D1D3B0-0008
Date: 10 May 2026, 5:52 PM
Created by: minhaj

[PAYMENT HISTORY SECTION] ← Always shown
├─ Payment History header
├─ Timeline of all SalePayment records with tags
└─ Total collected summary

[COLLECT PAYMENT SECTION] ← Only if PARTIAL
├─ Outstanding balance amount
├─ Amount input (editable)
├─ Payment method selector
├─ Note field
└─ Collect button
```

---

### 7. Updated Stats Service Response

**File:** [`src/modules/billing/services/billingService.ts`](src/modules/billing/services/billingService.ts) - `getSalesPaged()` method

**Updated stats object in response:**
```javascript
stats: {
  totalCollected: kpis.totalCollected,
  amountReceivable: kpis.amountReceivable,
  exchangeCount: kpis.exchangeCount,
  refundCount: kpis.refundCount,
  pendingRefundAmount: kpis.pendingRefundAmount,
}
```

---

## Data Model Notes

### Schema Relations Used

**SalePayment Model** (unchanged):
```prisma
model SalePayment {
  id        String    @id @default(uuid())
  saleId    String
  amount    Decimal
  method    PaymentMethod
  paidAt    DateTime  @default(now())
  note      String?               // ← Populated by Collect payment form
  createdBy String    // userId
  sale      Sale      @relation(fields: [saleId])
  user      User      @relation(fields: [createdBy])  // ← For staff name display
}
```

**Queries Updated to Include User Data:**
- All queries fetching `Sale` records now include: `user: { select: { name: true } }`
- All queries fetching `SalePayment` records now include: `user: { select: { name: true } }`
- Mapped to `record.userName` in responses

---

## User Experience Flows

### Scenario 1: View Full Payment History for Completed Sale (PAID)
1. Staff opens Billing & Order History
2. Clicks on paid sale card to expand
3. Views PAYMENT HISTORY section showing:
   - ₹100 Cash · 10 May 2026, 5:00 PM · Urooj [Initial payment]
   - ₹899 Card · 10 May 2026, 6:30 PM · Urooj [Balance cleared ✓]
4. Summary shows: "Total collected: ₹999 of ₹999"
5. No COLLECT PAYMENT section shown (not PARTIAL)

### Scenario 2: Collect Remaining Balance on PARTIAL Sale
1. Staff opens Billing & Order History
2. Clicks on ₹999 sale with ₹500 paid (PARTIAL status)
3. Expanded card shows:
   - PAYMENT HISTORY:
     - ₹500 Cash · 10 May 2026, 5:52 PM · Urooj [Initial payment]
     - Summary: "Total collected: ₹500 of ₹999 · ₹499 still due"
   - COLLECT PAYMENT:
     - Outstanding balance: ₹499 (in red)
     - Amount input: pre-filled with 499
     - Method: Cash (selected)
     - Note: (empty)
4. Staff enters optional note: "Paid at counter"
5. Staff clicks "Collect ₹499"
6. API call succeeds, toast shows: "Payment of ₹499 collected successfully"
7. Card updates:
   - PAYMENT HISTORY now shows both payments with tags
   - Payment status changes to PAID
   - COLLECT PAYMENT section disappears
   - Parent component KPIs update

### Scenario 3: View Pending Dues Report
Staff views Billing page with sales filtered to `paymentStatus = "PARTIAL"`:
- Can see full payment history for each sale
- Can identify which customers haven't paid since yesterday (red/amber date highlight)
- Can collect payments inline without leaving page
- Can see payment notes from previous collections

---

## API Changes Summary

### GET `/api/billing/stats`
**New Response Fields:**
- `totalCollected` - actual cash received this month
- `totalCollectedLastMonth` - for growth calculation
- `growthPercent` - percentage growth month-over-month
- `amountReceivable` - money customers owe (PARTIAL sales)
- `receivableCustomerCount` - how many customers have outstanding balances
- `pendingRefundAmount` - money store owes (refunds)
- `pendingRefundCount` - how many refund transactions pending

**Removed Fields:**
- `todaySales` → replaced with `totalCollected`
- `todayRevenue` → replaced with `totalCollected`
- `totalSales` → replaced with `totalCollected`
- `totalRevenue` → replaced with `totalCollected`
- `openReceivables` → replaced with `amountReceivable`

### GET `/api/reports/sales-breakdown-v2?group=[day|week|month]`
**Change:**
- Now groups by `SalePayment.paidAt` instead of `Sale.createdAt`
- Accurately reflects when cash was actually collected
- Return transaction net amounts still included

### GET `/api/reports/profit-margin?group=[day|week|month]`
**Change:**
- Now uses `SalePayment` records instead of `Sale` records
- Groups by `paidAt` instead of `createdAt`
- Preserves cost and discount calculations from original sales

### POST `/api/billing/{id}/payments`
**Behavior:** Already correct, no changes needed
- Accepts: `{ amount, method, note }`
- Returns: Updated Sale with full payment history and user relationships
- Note field now properly saved and returned

---

## Key Mental Model Shift

### BEFORE (Wrong):
```
Revenue = SUM(Sale.total) WHERE Sale.createdAt in period
         ↑ Counts invoices issued, not money received
```

### AFTER (Correct):
```
Revenue = SUM(SalePayment.amount) WHERE SalePayment.paidAt in period
        ↑ Counts actual cash received on specific dates
```

This means:
- A ₹1000 invoice created on May 1 but not paid until June 15 → counts toward June revenue, not May
- A ₹500 payment collected on May 10 → counts as May revenue
- A ₹1000 invoice with ₹600 paid May 10 and ₹400 paid May 20 → June reports show ₹600 (May 10) and ₹400 (May 20) separately

---

## Testing Checklist

- [x] getSalesKPIs returns new KPI structure
- [x] totalCollected calculation uses SUM(SalePayment.amount) with paidAt filter
- [x] Month-over-month growth calculated correctly
- [x] amountReceivable shows correct balance for PARTIAL sales
- [x] receivableCustomerCount accurate
- [x] pendingRefundAmount and pendingRefundCount correct
- [x] sales-breakdown-v2 groups by paidAt instead of createdAt
- [x] profit-margin uses SalePayment records
- [x] StatsStrip displays new KPI fields correctly
- [x] TOTAL SALES tile shows totalCollected with growthPercent
- [x] AMOUNT RECEIVABLE tile displays correctly with customer count
- [x] PENDING REFUNDS tile displays correctly with transaction count
- [x] PaymentHistorySection shows for all sales when expanded
- [x] Payment tags display correctly (Initial, Top-up, Balance cleared, Full payment)
- [x] Payment notes display inline when present
- [x] CollectPaymentSection only shows for PARTIAL sales
- [x] Collect form includes note field
- [x] Payment collection updates card state inline
- [x] Payment status updates (PARTIAL → PAID) reflected in UI
- [x] Staff names display correctly throughout
- [x] No TypeScript errors

---

## Deployment Notes

1. **No Database Migrations Required** - All data already exists
2. **API Contracts Changed** - Update frontend consumers of `/api/billing/stats`
3. **KPI Fields Renamed** - Update any dashboards using `totalRevenue` → `totalCollected`
4. **Report Endpoints Behavior Changed** - Grouping logic now by `paidAt` instead of `createdAt`
5. **New UI Components** - Ensure `PaymentHistorySection.tsx` is properly deployed

---

## Benefits Achieved

✅ Revenue reporting now reflects actual cash flow (not invoice totals)
✅ Partial payments properly attributed to correct months
✅ Complete payment audit trail visible to staff
✅ Payment notes stored and displayed for context
✅ Clear separation between AMOUNT RECEIVABLE vs PENDING REFUNDS
✅ Staff can collect payments inline without navigation
✅ Customer payment progress visible (money still due)
✅ KPIs now accurately represent financial health
