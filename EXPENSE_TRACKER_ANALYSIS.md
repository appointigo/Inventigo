# Expense Tracker — Analysis & Roadmap

## What's Built (Current State)

### Data Model
- **`StoreExpense`** — per-store expense entries with `category`, `amount`, `date`, `note`, `createdBy`
- **`ExpenseCategoryOption`** — dynamic org-level categories (no hardcoded enum), each with a color tag
- Filtering: by `storeId`, `month`, `year`
- Summary API: `grandTotal`, `byCategory`, `byMonth[]` for full-year view

### Default Categories Seeded
| Category | Color |
|---|---|
| Rent | Blue |
| Electricity | Gold |
| Employee Salary | Green |
| Cleaning | Cyan |
| Stationery | Purple |
| Miscellaneous | Grey |

### UI Features
- Monthly date picker + Month Total / Year Total KPIs
- Table with date/category/amount/note, sortable columns, category filter chips, pagination (20/page)
- Add / Edit / Delete expense (modal form with inline category management)
- Donut pie chart — Expenses by Category
- Line chart — Monthly Expense Trend (annual view)
- RBAC: OWNER / ADMIN / MANAGER can manage categories; all above roles can add/edit/delete entries

---

## What's Missing — Opportunities by Priority

### High Priority (Core Gaps)

#### 1. Budget Tracking per Category
**What enterprises do:** Set a monthly or annual budget for each expense category per store. Display actual vs. budget with a progress bar and color-coded alerts (green → yellow → red).  
**Why it matters:** Without a budget ceiling, there's no way to know if ₹40,000 rent is expected or an overspend.  
**Implementation hint:**
- Add `budget` (optional Decimal) to `ExpenseCategoryOption` or a separate `ExpenseBudget` model with `storeId + category + month/year + amount`
- Show "₹46,100 / ₹50,000 budget" in the summary cards
- Alert if any category exceeds 90% or 100% of budget

#### 2. Payment Mode / Method Tracking
**What enterprises do (Zoho Books, QuickBooks, Tally):** Record how every expense was paid — Cash, Bank Transfer (NEFT/RTGS/IMPS), UPI, Credit Card, Cheque, Store Petty Cash.  
**Why it matters:** Required for daily cash reconciliation and petty cash management. Auditors always ask.  
**Implementation hint:**
- Add `paymentMode` enum field to `StoreExpense`: `CASH | UPI | BANK_TRANSFER | CHEQUE | CREDIT_CARD | PETTY_CASH`
- Filter expenses by payment mode; show a breakdown doughnut for modes alongside categories

#### 3. Receipt / Invoice Attachment
**What enterprises do:** Every expense entry links to a scanned receipt or invoice image (JPEG/PDF). Some use OCR to pre-fill amount and date.  
**Why it matters:** Required for tax audits, GST input credit claims, and vendor reconciliation. Standard in SAP, Oracle, Xero.  
**Implementation hint:**
- Add `receiptUrl String?` to `StoreExpense`
- Reuse the existing `/api/upload` endpoint (already in the project)
- Show a paperclip icon in the table; clicking opens the image/PDF in a modal

#### 4. Recurring Expense Automation
**What enterprises do:** Mark expenses like Rent, Electricity, and Subscription fees as "recurring" with a frequency (Monthly, Quarterly, Annually). The system auto-creates draft entries.  
**Why it matters:** Removes manual data entry friction for predictable fixed costs.  
**Implementation hint:**
- Add `isRecurring Boolean @default(false)`, `recurrenceFrequency String?` (`MONTHLY|QUARTERLY|ANNUALLY`) to `StoreExpense` or a separate `RecurringExpenseTemplate` model
- A cron job (`/api/cron/`) already exists in the project — add a task that materializes due recurring entries at the start of each month

---

### Medium Priority (Analytics & Operations)

#### 5. Multi-Store Expense Comparison
**What enterprises do:** Head office / org owners view a consolidated expense dashboard across all stores side by side — which store spent the most on Electricity, which is over budget on Salary, etc.  
**Why it matters:** Critical for chains with multiple outlets (the app already supports multi-store via `StoreProvider`).  
**Implementation hint:**
- New summary API endpoint: `GET /api/expenses/org-summary?year=&month=` — aggregates across all stores the user has access to
- New page: `/dashboard/expenses/org-overview` — table and bar chart comparing stores

#### 6. Tax / GST Tracking
**What enterprises do (India-specific):** Tag expenses as GST-applicable, record HSN/SAC code, GSTIN of vendor, GST rate (0/5/12/18/28%). Used to claim Input Tax Credit (ITC).  
**Why it matters:** B2B businesses in India must track ITC to reduce GST liability.  

**TODO — Full GST Implementation (both directions):**

**A. Vendor GST (on expenses)**
- When recording an expense (rent, electricity, professional fees, etc.), capture the vendor/service provider's GSTIN, GST rate, and GST amount
- Fields to add to `StoreExpense`: `vendorGstin String?`, `gstRate Decimal?`, `gstAmount Decimal?`, `isItcEligible Boolean @default(false)`, `hsnSacCode String?`
- GST amount can be auto-computed: `gstAmount = (baseAmount × gstRate) / 100`
- Show ITC Register in analytics: total ITC claimable per month, per category, per vendor
- Also add `gstin String?` to the existing `Supplier` model for stock purchase vendors

**B. Own Store / Organization GST (on invoices & receipts)**
- Add `gstin String?` to the `Organization` model (org-level registration number)
- Optionally add store-level `gstin String?` to `Store` if different outlets have separate registrations
- This GSTIN is printed on any expense receipts, reimbursement vouchers, and P&L reports generated by the system
- Required for GSTR-2A reconciliation — matching your ITC claims against vendor filings

**C. Invoice inclusion**
- When exporting expense PDFs or generating reimbursement vouchers, include: store's own GSTIN, vendor GSTIN, GST rate breakdown (CGST + SGST or IGST), and ITC eligibility flag
- Generate a **GST Register export** (CSV/PDF) per month — format compatible with CA/accountant filing workflow

#### 7. Vendor / Supplier Linking
**What enterprises do:** Instead of a plain-text note, link an expense to a known supplier from the Suppliers table (which already exists in this app).  
**Why it matters:** Enables vendor-wise spend analysis — "We spent ₹2.4L with Supplier X this year across all stores."  
**Implementation hint:**
- Add optional `supplierId String?` FK to `StoreExpense` → `Supplier`
- Supplier dropdown in the expense form (same pattern as existing supplier module)

#### 8. Export to CSV / PDF
**What enterprises do:** Every finance tool lets you export filtered expense data for the accountant or CA.  
**Why it matters:** Accountants don't log into SaaS tools — they need spreadsheets.  
**Implementation hint:**
- Add `GET /api/expenses/export?storeId=&month=&year=&format=csv|pdf`
- CSV: use a streaming response with `Content-Disposition: attachment`
- PDF: use `@react-pdf/renderer` or `pdfmake`

#### 9. Expense Approval Workflow
**What enterprises do (mid-size+):** Expenses above a threshold (e.g., >₹10,000) require OWNER/ADMIN approval before being recorded as "approved". Pending expenses show a badge.  
**Why it matters:** Prevents unauthorized large expenses by staff/managers.  
**Implementation hint:**
- Add `status` enum: `PENDING | APPROVED | REJECTED` to `StoreExpense`
- Add `approvedBy String?`, `approvedAt DateTime?`
- MANAGER creates expense → status=PENDING; ADMIN/OWNER approves → status=APPROVED
- Pending count badge on the Expenses nav item (similar to existing Alert badges)

---

### Lower Priority (Advanced / Phase 3+)

#### 10. Petty Cash Ledger
**What it is:** A small physical cash fund kept in-store for minor day-to-day expenses (tea, stationery, courier). Track opening balance, each spend, and top-up events.  
**How enterprises manage it:** Separate "Petty Cash" register with opening balance and running balance. Reconciled weekly.  
**Implementation hint:**
- New model: `PettyCashLedger` with `storeId`, `openingBalance`, `currentBalance`
- `PettyCashTransaction`: `type (DEBIT|TOPUP)`, `amount`, `description`, `date`
- Link petty cash expenses to the main `StoreExpense` with `paymentMode=PETTY_CASH`

#### 11. Utility Consumption Tracking
**What it is:** Track the actual units consumed alongside the bill amount — kWh for electricity, kiloliters for water, cubic meters for gas.  
**Why it matters:** Enables cost-per-unit analysis and variance detection (bill went up but consumption didn't → rate hike).  
**Implementation hint:**
- Add `unitsConsumed Decimal?`, `unit String?` (e.g., `kWh`, `kL`) to `StoreExpense`
- Show in the table and charts when category = Electricity / Water / Gas

#### 12. Staff Expense Reimbursement
**What it is:** Staff members submit expense claims (travel, meals, phone bill) that the store reimburses. Different from store operating expenses.  
**How enterprises manage it (Zoho Expense, Concur):** Separate "Claims" workflow — staff submits with receipt → manager approves → finance marks as reimbursed.  
**Implementation hint:**
- New model `ExpenseClaim` separate from `StoreExpense` — linked to `userId`
- Reuse approval workflow from #9

#### 13. Budget Forecasting & Anomaly Alerts
**What it is:** ML/rule-based detection of unusual expense spikes. e.g., "Electricity bill this month is 3× the 6-month average — review required."  
**How enterprises manage it:** SAP, Oracle have built-in anomaly detection. Simpler tools use Z-score or IQR rules.  
**Implementation hint:**
- Compute rolling 6-month average per category at query time
- If current month > 2× average → create an Alert (the Alerts module already exists in this app)
- Plug into `/api/cron/` for monthly checks

#### 14. P&L Integration
**What it is:** Combine expense data with revenue data (sales from the inventory/orders module) to show a simplified Profit & Loss view per store per month.  
**Why it matters:** The ultimate goal — understand if a store is profitable, not just how much it spends.  
**Implementation hint:**
- Requires a Revenue model or querying completed Orders/Sales
- New endpoint: `GET /api/reports/pnl?storeId=&month=&year=`

---

## How Enterprises Manage Expenses (Benchmark)

| Feature | Tally ERP | Zoho Books | QuickBooks | SAP B1 | **Inventigo (current)** |
|---|:---:|:---:|:---:|:---:|:---:|
| Manual expense entry | ✅ | ✅ | ✅ | ✅ | ✅ |
| Custom categories | ✅ | ✅ | ✅ | ✅ | ✅ |
| Monthly/annual summary | ✅ | ✅ | ✅ | ✅ | ✅ |
| Receipt attachment | ✅ | ✅ | ✅ | ✅ | ❌ |
| Budget vs actual | ✅ | ✅ | ✅ | ✅ | ❌ |
| Payment mode tracking | ✅ | ✅ | ✅ | ✅ | ❌ |
| GST / tax tracking | ✅ | ✅ | ❌ | ✅ | ❌ |
| Recurring expenses | ✅ | ✅ | ✅ | ✅ | ❌ |
| Approval workflow | ❌ | ✅ | ❌ | ✅ | ❌ |
| Export CSV/PDF | ✅ | ✅ | ✅ | ✅ | ❌ |
| Multi-location comparison | ❌ | ✅ | ✅ | ✅ | ❌ |
| Vendor linking | ✅ | ✅ | ✅ | ✅ | ❌ |
| Petty cash ledger | ✅ | ✅ | ❌ | ✅ | ❌ |
| P&L integration | ✅ | ✅ | ✅ | ✅ | ❌ |

---

## Suggested Category Expansions

Beyond the 6 default categories, add these to the seed for retail/F&B stores:

| Category | Applicable to |
|---|---|
| Water | All stores |
| Internet / Broadband | All stores |
| Security / CCTV Maintenance | Retail, Warehouse |
| Packaging Materials | Retail, E-commerce |
| Store Maintenance & Repairs | All stores |
| Delivery / Logistics | E-commerce, F&B |
| Marketing & Advertising | All stores |
| POS / Software Subscription | Retail |
| Staff Uniforms | Retail, F&B |
| Waste Disposal | F&B, Grocery |
| Insurance (Fire, Theft) | All stores |
| Bank Charges & Fees | All stores |
| Professional Fees (CA/Legal) | All stores |
| Fuel / Vehicle | Delivery, Warehouse |
| Tea / Pantry | All stores |

---

## Recommended Implementation Order

```
Phase 1 (Quick wins, low schema changes)
├── Receipt attachment (reuse /api/upload)
├── Payment mode field
└── Export CSV

Phase 2 (Budget & visibility)
├── Budget per category per store
├── Multi-store org-level summary
└── Recurring expense templates + cron job

Phase 3 (Compliance & ops)
├── GST / tax tagging
│   ├── Vendor GSTIN + rate + amount on StoreExpense
│   ├── Own GSTIN on Organization + Store models
│   ├── Supplier.gstin for stock purchase vendors
│   └── GST fields on invoice/receipt PDF exports
├── Vendor linking (Supplier FK)
├── Approval workflow
└── Anomaly alerts (plug into existing Alerts module)

Phase 4 (Advanced finance)
├── Petty cash ledger
├── Staff expense reimbursement
└── P&L integration
```
