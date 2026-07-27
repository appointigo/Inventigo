# Inline Payment Collection Feature - Implementation Summary

## Overview
Implemented inline payment collection functionality in the Billing & Order History card for PARTIAL sales, along with fixing the "Created by" field to display staff member names.

---

## Changes Made

### 1. Backend: billingService.ts
**File:** `/src/modules/billing/services/billingService.ts`

#### Updated `getSales()` method:
- Added `user: { select: { name: true } }` to sales include to fetch creator name
- Added `user: { select: { name: true } }` to return transaction include
- Updated salesRows mapping to include `userName: s.user?.name ?? null`
- Updated rtRows mapping to include `userName: r.user?.name ?? null`
- Updated payments include to fetch `user` data: `payments: { include: { user: { select: { name: true } } } }`

#### Updated `recordSalePayment()` method:
- ✅ Added validation: sale.paymentStatus === "PAID" → throw error
- ✅ Added validation: amount > currentAmountDue → throw error
- ✅ Updated transaction to return full Sale with:
  - All payment records (ordered by paidAt desc) with user names
  - User information for createdBy
- ✅ Added Customer.totalSpent increment in transaction
- Now returns updated Sale via `toSaleDto()` instead of just payment record

### 2. API Endpoint: POST /api/billing/[id]/payments/route.ts
**File:** `/src/app/api/billing/[id]/payments/route.ts`

Already correct! The endpoint:
- Validates authorization ✅
- Validates amount > 0 ✅
- Validates payment method ✅
- Calls `billingService.recordSalePayment()` ✅
- Returns updated Sale with 201 status ✅

### 3. Frontend Component: CollectPaymentSection.tsx
**File:** `/src/modules/billing/components/CollectPaymentSection.tsx` (NEW)

Features:
- **Payment History Display**
  - Shows all previous SalePayment records
  - Format: "CASH • ₹{amount} • {date/time} • {staffName}"
  - Newest first (ordered by paidAt desc)
  - Shows "Initial payment" for first payment

- **Amount Due Display**
  - Bold, red text displaying remaining balance
  - Matches invoice total minus previous payments

- **Collect Now Form**
  - Amount input (pre-filled with full amountDue, editable)
  - Helper text showing max allowed amount
  - Payment method selector (Cash | Card | UPI) - defaults to original sale method
  - Optional note field (single line, max 100 chars)
  - "Collect ₹{amount}" button - primary blue, full width
  - Loading state during API call
  - Error display below button

- **Behavior on Success**
  - Card updates inline with new amountDue
  - Payment history updates with new SalePayment
  - Payment status reflected in parent component
  - Optional callback fires to notify parent of update

- **Behavior on Error**
  - Error message displayed inline
  - Toast notification shown
  - Form remains open for retry

### 4. Frontend Component: TransactionCard.tsx
**File:** `/src/modules/billing/components/TransactionCard.tsx`

#### Changes:
- ✅ Import CollectPaymentSection component
- ✅ Added local state to track record updates: `const [record, setRecord] = useState(initialRecord)`
- ✅ Changed "Created by" display from `record.createdBy` to `record.userName`
- ✅ Added CollectPaymentSection for PARTIAL sales:
  - Renders when `record.paymentStatus === "PARTIAL"`
  - Positioned in ORDER DETAILS column, above action buttons
  - Passes paymentHistory from `record.payments`
  - Passes defaultMethod from `record.paymentMethod`
  - onPaymentCollected callback updates local record and notifies parent
- ✅ For return transactions, added "Processed by: {staffName}" in Notes section

#### Props Added:
- `onSaleUpdated?: (updatedSale: any) => void` - callback when payment collected

---

## Data Flow

### 1. User Interface
```
TransactionCard (PARTIAL sale expanded)
├── LEFT: Items & Amounts
├── RIGHT: Order Details
│   ├── Invoice, Date, Created by (staffName)
│   ├── CollectPaymentSection (if PARTIAL)
│   │   ├── Payment History
│   │   ├── Amount due
│   │   ├── Collect form
│   │   └── [Collect button]
│   └── Action buttons (View Invoice, Return/Exchange)
```

### 2. API Request Flow
```
CollectPaymentSection
  ↓
POST /api/billing/{saleId}/payments
  ├─ Request body: { amount, method, note }
  ├─ Validation:
  │  ├─ Auth check ✅
  │  ├─ amount > 0 ✅
  │  ├─ method valid ✅
  │  └─ sale.paymentStatus !== "PAID" ✅
  ├─ Service: billingService.recordSalePayment()
  │  ├─ Create SalePayment record
  │  ├─ Update Sale (amountPaid, amountDue, paymentStatus)
  │  ├─ Update Customer.totalSpent
  │  └─ Return updated Sale
  └─ Response: 201 with updated Sale object
        ├─ All items
        ├─ All payments (with user names)
        ├─ User name (createdBy)
        └─ Updated amountPaid, amountDue, paymentStatus
```

### 3. Frontend Response Handling
```
Response received
  ↓
Success message shown
  ↓
Card state updated with new Sale data
  ↓
Payment history refreshed
  ├─ Amount due decremented
  └─ Payment status updated (stays PARTIAL or becomes PAID)
  ↓
Parent component notified (onSaleUpdated)
```

---

## User Experience Workflow

### Scenario: Collect ₹500 of ₹909 due

1. **Card is collapsed** → Shows:
   - Invoice #INV-20260510-D1D3B0-0008
   - Customer: minhaj • 5:52 PM
   - Amount: ₹999
   - Badge: PARTIAL (yellow)

2. **User clicks to expand** → Shows:
   - Items purchased
   - Payment: CASH, Amount paid: ₹90, Amount due: ₹909 (red)
   - Order details + **Collect Payment section**

3. **Collect Payment Section displays**:
   - Payment History: "CASH • ₹90 • 10 May 5:52 PM • minhaj"
   - Amount due: **₹909** (bold red)
   - Amount field: pre-filled 909 (editable)
   - Method: CASH (selected)
   - Note: (empty, optional)

4. **User enters ₹500**, selects CASH, clicks "Collect ₹500"

5. **Loading state** → Button shows spinner

6. **Success**:
   - Toast: "Payment of ₹500 collected successfully"
   - Payment History updates: now shows two entries
     - "CASH • ₹500 • 10 May 6:15 PM • {currentUser}"
     - "CASH • ₹90 • 10 May 5:52 PM • minhaj"
   - Amount due: now ₹409
   - Payment status: still PARTIAL
   - Amount field resets to 409
   - Parent component updates KPIs

7. **If user collects remaining ₹409**:
   - Same flow, but:
   - paymentStatus changes to PAID
   - Badge changes to green "PAID"
   - Collect Payment section disappears
   - Card shows final state

---

## Schema Relations Used

### SalePayment Model
```prisma
model SalePayment {
  id        String    @id @default(uuid())
  saleId    String
  amount    Decimal
  method    PaymentMethod
  paidAt    DateTime  @default(now())
  note      String?
  createdBy String    // userId
  sale      Sale      @relation(fields: [saleId])
  user      User      @relation(fields: [createdBy])  // ← Used for staff name
}
```

### Sale Model (updated queries)
```prisma
payments: {
  include: {
    user: { select: { name: true } }  // ← Staff name for payment
  },
  orderBy: { paidAt: "desc" }
}
user: { select: { name: true } }      // ← Staff name for sale creator
```

---

## Testing Checklist

- [ ] PARTIAL sale shows Collect Payment section when expanded
- [ ] Payment history displays correctly with staff names
- [ ] Amount due shows correct balance
- [ ] Can collect partial amount (<  amountDue)
- [ ] Can collect full amount (= amountDue)
- [ ] Payment method defaults to original sale method
- [ ] Optional note can be added
- [ ] On success, card updates inline
- [ ] On success, paymentStatus updates (PARTIAL or PAID)
- [ ] On success, parent component updates
- [ ] Error displays inline if amount > amountDue
- [ ] Error displays inline if amount ≤ 0
- [ ] Loading state shows during API call
- [ ] Already PAID sales don't show Collect section
- [ ] "Created by" field shows staff name instead of UUID
- [ ] Return transaction shows "Processed by" staff name
- [ ] Customer.totalSpent increments correctly

---

## Files Modified/Created

| File | Change | Status |
|------|--------|--------|
| billingService.ts | Added user data includes, enhanced recordSalePayment | ✅ Modified |
| POST /api/billing/[id]/payments | No changes needed (already correct) | ✅ Verified |
| CollectPaymentSection.tsx | NEW component for payment collection UI | ✅ Created |
| TransactionCard.tsx | Integrated payment component, show userName | ✅ Modified |

---

## Notes

- The CollectPaymentSection shows user names from `SalePayment.user.name`
- All payment records are ordered newest first
- The form validates on the frontend (UI disabled states) and backend (API errors)
- Upon successful collection, if the new amountDue = 0, sale becomes PAID
- The Customer.totalSpent is incremented in the same transaction
- All validation errors provide clear messaging to the user
