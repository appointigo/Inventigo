# Promo Code Implementation Plan

## Finalized Decisions

| Question | Decision |
|---|---|
| Discount type | **% only** (percentage discount, no fixed ₹ amount for v1) |
| Scope | **Org-scoped** — promos belong to `Organization`, consistent with brands/categories pattern |
| Usage tracking | **Count shown on each card** + **click to view detail** (Modal listing all Sales that used this promo) |

---

## Schema Changes (`prisma/schema.prisma`)

### New model — `PromoCode`

```prisma
model PromoCode {
  id          String    @id @default(uuid())
  orgId       String
  code        String                        // e.g. "SAVE10"
  label       String                        // e.g. "10% OFF"
  desc        String    @default("")        // short description shown in dropdown
  discountPct Decimal   @db.Decimal(5, 2)  // e.g. 10.00
  isActive    Boolean   @default(true)
  maxUses     Int?                          // null = unlimited
  usageCount  Int       @default(0)
  expiresAt   DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  org   Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
  sales Sale[]

  @@unique([code, orgId])
  @@index([orgId])
  @@map("promo_codes")
}
```

### Extend `Sale` model

```prisma
// Add to existing Sale model:
promoCodeId  String?
promoCode    PromoCode? @relation(fields: [promoCodeId], references: [id], onDelete: SetNull)
```

### Extend `Organization` model

```prisma
// Add to existing Organization model:
promoCodes PromoCode[]
```

### Migration command

```bash
npx prisma db push
npx prisma generate
```

---

## New Module: `src/modules/promo-codes/`

```
src/modules/promo-codes/
  types.ts                        # PromoCode DTO, CreatePromoInput, UpdatePromoInput
  services/
    promoService.ts               # CRUD + usage history fetch
  hooks/
    usePromoCodes.ts              # TanStack Query: list, create, update, delete, toggle
  components/
    PromoCodesSettings.tsx        # Card Grid UI (main settings tab component)
    PromoUsageModal.tsx           # Modal showing all Sales that used a given promo
```

---

## Types (`src/modules/promo-codes/types.ts`)

```typescript
export interface PromoCode {
  id: string;
  code: string;
  label: string;
  desc: string;
  discountPct: number;        // e.g. 10 (means 10%)
  isActive: boolean;
  maxUses: number | null;
  usageCount: number;
  expiresAt: string | null;   // ISO date string
  createdAt: string;
}

export interface CreatePromoInput {
  code: string;
  label: string;
  desc?: string;
  discountPct: number;
  maxUses?: number | null;
  expiresAt?: string | null;
}

export interface UpdatePromoInput extends Partial<CreatePromoInput> {
  isActive?: boolean;
}

export interface PromoUsageSale {
  id: string;
  createdAt: string;
  total: number;
  discountAmount: number;
  customerName: string | null;
  customerPhone: string | null;
}
```

---

## Backend

### promoService (`src/modules/promo-codes/services/promoService.ts`)

| Function | Description |
|---|---|
| `listPromos(orgId)` | Returns all promos for org, ordered by createdAt desc |
| `createPromo(orgId, input)` | Creates new promo, enforces `@@unique([code, orgId])` |
| `updatePromo(orgId, id, input)` | Updates fields, verifies promo belongs to org |
| `togglePromo(orgId, id)` | Flips `isActive` |
| `deletePromo(orgId, id)` | Hard delete (usageCount check optional) |
| `getPromoUsage(orgId, id)` | Returns all Sales with this promoCodeId (for usage modal) |

### API Routes

#### `src/app/api/promo-codes/route.ts`

| Method | Action |
|---|---|
| `GET` | List all promos for current org |
| `POST` | Create new promo |

#### `src/app/api/promo-codes/[id]/route.ts`

| Method | Action |
|---|---|
| `PATCH` | Update promo (fields or toggle isActive) |
| `DELETE` | Delete promo |

#### `src/app/api/promo-codes/[id]/usage/route.ts`

| Method | Action |
|---|---|
| `GET` | Fetch all Sales that used this promo (for usage modal) |

### Update billingService (`src/modules/billing/services/billingService.ts`)

When `promoCodeId` is provided in `CreateSaleInput`:

1. **Validate** — fetch promo from DB, confirm it belongs to same org, is active, not expired, and under maxUses
2. **Calculate discount server-side** — do NOT trust `discountAmount` from client; recompute from `promo.discountPct`
3. **Atomic update** — in the same Prisma transaction: create Sale + `promoCode.usageCount++`
4. **Link** — set `promoCodeId` on the created Sale

---

## Frontend Changes

### `src/modules/billing/types.ts`

Add to `CreateSaleInput`:
```typescript
promoCodeId?: string;
```

Add to `Sale` DTO:
```typescript
promoCodeId: string | null;
promoCode: { code: string; label: string; discountPct: number } | null;
```

### `src/modules/billing/hooks/useBilling.ts` — `useCart()`

Add state:
```typescript
const [promoCodeId, setPromoCodeId] = useState<string | null>(null);
```

Include in `toCreateInput()`:
```typescript
promoCodeId: promoCodeId ?? undefined,
```

Clear in `clearCart()`:
```typescript
setPromoCodeId(null);
```

### `src/modules/billing/components/BillingView.tsx`

- Replace hardcoded `AVAILABLE_OFFERS` lookup with `usePromoCodes()` data
- When user selects a promo from the dropdown:
  - Call `cart.setDiscountPct(promo.discountPct)`
  - Call `cart.setPromoCodeId(promo.id)`
- When promo is cleared: reset both to null/0

### `src/modules/billing/constants.ts`

Remove `AVAILABLE_OFFERS` array entirely (and `PromoOffer` type if it lives there).

---

## Settings UI

### `src/modules/promo-codes/components/PromoCodesSettings.tsx`

Based on `public/designs/promo-ui-1-card-grid.html` (Card Grid design).

**Layout:**
- Stats row (3 stat cards: Total Promos · Active · Times Used)
- Top bar: "Promo Codes & Offers" heading + search input + "＋ New Promo" button
- Responsive card grid (`repeat(auto-fill, minmax(300px, 1fr))`)

**Each promo card:**
- Gradient header (blue-indigo for active, grey for inactive)
- Large `discountPct%` number + code badge
- Description text
- Pills: Active/Inactive · `usageCount uses` (clickable → usage modal) · Expiry date
- Action buttons: Edit · Copy code · Pause/Activate
- Inactive card: reduced opacity

**Usage count pill behavior:**
- Shows `🔁 N uses` as a clickable pill
- On click → opens `PromoUsageModal` for that promo

**Create / Edit modal:**
- Fields: Code · Discount % · Display Label · Description · Expiry Date · Usage Limit
- Live preview badge that updates as user types
- Validation: code uniqueness feedback, % must be 1–100

### `src/modules/promo-codes/components/PromoUsageModal.tsx`

**Recommended: Modal** (not popover — usage history can be many rows)

Contents:
- Modal title: `"Usage History — {CODE}"` + total count badge
- Ant Design `Table` with columns:
  - Date (formatted, sortable)
  - Customer (name + phone, "—" if guest)
  - Sale Total (₹)
  - Discount Applied (₹ amount derived from pct)
- Pagination (if >10 rows)
- Empty state if never used

### `src/app/(dashboard)/dashboard/settings/page.tsx`

Add new tab item:
```tsx
{
  key: 'promo-codes',
  label: (
    <span>
      <TagOutlined />
      Promo Codes
    </span>
  ),
  children: <PromoCodesSettings />,
}
```

---

## Implementation Phases

### Phase 1 — Schema
1. Edit `prisma/schema.prisma`: add `PromoCode` model, extend `Sale` + `Organization`
2. `npx prisma db push`
3. `npx prisma generate`

### Phase 2 — Backend
1. `src/modules/promo-codes/types.ts`
2. `src/modules/promo-codes/services/promoService.ts`
3. `src/app/api/promo-codes/route.ts` (GET + POST)
4. `src/app/api/promo-codes/[id]/route.ts` (PATCH + DELETE)
5. `src/app/api/promo-codes/[id]/usage/route.ts` (GET)
6. Update `billingService.ts` — server-side promo validation + atomic usageCount

### Phase 3 — Billing stack update
1. `src/modules/billing/types.ts` — add `promoCodeId` to `CreateSaleInput`
2. `src/modules/billing/hooks/useBilling.ts` — add `promoCodeId` state to `useCart()`
3. `src/modules/billing/components/BillingView.tsx` — swap hardcoded lookup for `usePromoCodes()`
4. `src/modules/billing/constants.ts` — remove `AVAILABLE_OFFERS`
5. `src/app/api/billing/route.ts` — pass `promoCodeId` through to billingService

### Phase 4 — Settings UI
1. `src/modules/promo-codes/hooks/usePromoCodes.ts`
2. `src/modules/promo-codes/components/PromoUsageModal.tsx`
3. `src/modules/promo-codes/components/PromoCodesSettings.tsx`
4. `src/app/(dashboard)/dashboard/settings/page.tsx` — add Promo Codes tab

---

## Files Changed Summary

| File | Change |
|---|---|
| `prisma/schema.prisma` | Add `PromoCode` model + `Sale.promoCodeId` FK + `Organization.promoCodes` relation |
| `src/modules/billing/types.ts` | Add `promoCodeId?: string` to `CreateSaleInput` |
| `src/modules/billing/hooks/useBilling.ts` | Add `promoCodeId` state + setter + clear |
| `src/modules/billing/services/billingService.ts` | Server-side promo validation + atomic usageCount |
| `src/modules/billing/components/BillingView.tsx` | Use `usePromoCodes()`, send `promoCodeId` |
| `src/modules/billing/constants.ts` | Remove `AVAILABLE_OFFERS` |
| `src/app/api/billing/route.ts` | Pass `promoCodeId` through |
| `src/app/(dashboard)/dashboard/settings/page.tsx` | Add Promo Codes tab |

| New File | Purpose |
|---|---|
| `src/modules/promo-codes/types.ts` | PromoCode + input types |
| `src/modules/promo-codes/services/promoService.ts` | CRUD + usage query |
| `src/modules/promo-codes/hooks/usePromoCodes.ts` | TanStack Query hooks |
| `src/modules/promo-codes/components/PromoCodesSettings.tsx` | Card grid settings UI |
| `src/modules/promo-codes/components/PromoUsageModal.tsx` | Usage history modal |
| `src/app/api/promo-codes/route.ts` | GET list + POST create |
| `src/app/api/promo-codes/[id]/route.ts` | PATCH update + DELETE |
| `src/app/api/promo-codes/[id]/usage/route.ts` | GET usage history |

---

## Security Notes

- **Never trust client-provided `discountAmount`** for promo sales — always recompute server-side from `promo.discountPct`
- **Validate org ownership** on every promo operation — a user from org A must never be able to apply or modify promos from org B
- **Race condition guard** — use Prisma `$transaction` when creating Sale + incrementing `usageCount` to avoid over-use beyond `maxUses`
- **Code case-insensitive match** — store codes uppercase, normalize on input
