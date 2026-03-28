# Stockiva — Retail Inventory Management System

> **Comprehensive development plan for a modular, scalable inventory management application for a clothing retail store.**

---

## Table of Contents

- [1. Project Overview](#1-project-overview)
- [2. Tech Stack & Reasoning](#2-tech-stack--reasoning)
- [3. Architecture: Feature-Module Pattern](#3-architecture-feature-module-pattern)
- [4. Multi-Store Strategy](#4-multi-store-strategy-schema-now-ui-later)
- [5. Billing Module Strategy](#5-billing-module-strategy-interface-now-implementation-later)
- [6. Image Storage Strategy](#6-image-storage-strategy)
- [7. Data Model](#7-data-model)
- [8. Folder Structure](#8-folder-structure)
- [9. Implementation Phases](#9-implementation-phases)
- [10. Verification & Testing Plan](#10-verification--testing-plan)
- [11. Key Architectural Decisions](#11-key-architectural-decisions)

---

## 1. Project Overview

### What We're Building

A cloud-hosted inventory management application for a clothing retail brand with the following capabilities:

- **Inventory tracking** across categories: T-Shirts, Shirts, Jeans, Pants, Dry-Fit T-Shirts, Lowers, Shorts (extensible to new categories without code changes)
- **Stock monitoring** with reorder alerts (email + SMS)
- **Dashboard & analytics** with charts, KPIs, and reports
- **Barcode scanning** (browser-based camera) for quick stock operations
- **Supplier management** with purchase order lifecycle
- **Role-based access** for Admin, Manager, and Staff users
- **Multi-store ready** — schema supports multiple stores from day 1, UI built for single store initially
- **Billing ready** — data model and service interface defined now, full implementation later

### Target Users

- **Small team (2–5 users)** at a single store (initially)
- Roles: Admin (full control), Manager (inventory + reports), Staff (stock updates + view)

### Deployment

- **Vercel** — cloud hosting for the Next.js application (free Hobby tier)
- **Neon** — serverless PostgreSQL database (free tier: 0.5 GB)

---

## 2. Tech Stack & Reasoning

### Core Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router) | 14.x |
| Language | TypeScript | 5.x |
| UI Library | Ant Design | 5.x |
| Pro Components | @ant-design/pro-components | 2.x |
| Charts | @ant-design/charts | 2.x |
| Database | PostgreSQL (Neon) | 16.x |
| ORM | Prisma | 5.x |
| Authentication | NextAuth.js (Auth.js) | 5.x |
| Data Fetching | TanStack Query (React Query) | 5.x |
| Validation | Zod | 3.x |
| Image Storage | Vercel Blob | latest |
| Barcode Scan | html5-qrcode | 2.x |
| Barcode Generate | react-barcode | 1.x |
| Email | Resend | latest |
| SMS | Twilio | latest |
| Hosting | Vercel | — |

### Why Next.js 14 (App Router) over plain React

| Factor | React (Vite/CRA) | Next.js 14 |
|---|---|---|
| Backend | Requires separate Express/Fastify server | Built-in API Routes — one codebase |
| Rendering | Client-only SPA | Server Components for data-heavy dashboards |
| Auth Protection | Client-side route guards (flash of content) | Middleware at the edge — blocks before page loads |
| Routing | Manual config (react-router) | File-based — add folder = add page |
| Deployment | Separate hosting for frontend + backend | Single Vercel deploy, zero-config |
| Cron Jobs | Need separate service (AWS Lambda, etc.) | Vercel Cron Jobs — built-in, free |
| Image Optimization | Manual setup | `next/image` built-in |

**Verdict:** Next.js eliminates the need for a separate backend, simplifies deployment to a single platform, and gives server-side rendering for heavy dashboard pages. For a small team maintaining one codebase, this is the correct choice.

### Why Ant Design v5 + ProComponents over Emotion/Styled Components

Emotion and styled-components are **CSS-in-JS styling solutions** — they let you write CSS. They are NOT component libraries. You'd build every table, form, modal, date picker, and dropdown from scratch.

Ant Design is a **full component library** with 60+ battle-tested components. For an inventory management system, you need:

| Need | Ant Design Solution | Emotion/Styled Equivalent |
|---|---|---|
| Sortable/filterable data tables | `ProTable` — built-in search, filters, pagination, toolbar | Build from scratch (~2 weeks) |
| Multi-step forms | `StepsForm` — declarative step definitions with validation | Build from scratch (~1 week) |
| Admin layout with sidebar | `ProLayout` — collapsible sidebar, breadcrumbs, user menu | Build from scratch (~3 days) |
| Charts & analytics | `@ant-design/charts` — first-party integration | Install separate charting lib |
| Notifications, modals, drawers | `notification`, `Modal`, `Drawer` — ready to use | Build from scratch |
| Theming | Design tokens — change brand colors in one config | Write custom theme provider |

**Verdict:** Ant Design + ProComponents saves weeks of development. It's designed for exactly this type of data-heavy admin application. Used by Alibaba, Tencent, and Baidu at enterprise scale.

### Why PostgreSQL over MongoDB / MySQL

| Factor | MongoDB | MySQL | PostgreSQL |
|---|---|---|---|
| Data model fit | Document DB — poor for relational inventory data | Relational ✓ | Relational ✓ |
| Flexible attributes | Flexible schemas but data duplication | No native JSON | **JSONB columns** — best of both |
| Transactions | Multi-document transactions (complex) | ACID ✓ | ACID ✓ |
| Full-text search | Basic | Basic | **Built-in, powerful** |
| Array types | Native arrays | No | **Native arrays** |
| Serverless hosting | MongoDB Atlas (free tier) | PlanetScale (limited) | **Neon** (free, auto-suspend) |

**The killer feature: JSONB columns.** Each clothing category has different attributes:
- Jeans: waist size, length, fit type
- T-Shirts: sleeve type, neck type
- Dry-Fit: material blend, moisture-wicking level

Rather than creating a different table per category (doesn't scale), we store flexible attributes in a JSONB column. When you add "jackets" next year, you create a Category row with its `attributeSchema` — **no database migration required**.

### Why Vercel over Netlify

| Factor | Vercel (Free Hobby) | Netlify (Free Starter) |
|---|---|---|
| Price | Free | Free |
| Bandwidth | 100 GB/month | 100 GB/month |
| Build minutes | 6,000/month | 300/month |
| Next.js support | **First-party** (Vercel builds Next.js) | Third-party adapter (`@netlify/next`) |
| Server Components | Native, always works | Adapter-dependent, known edge cases |
| Middleware | Full support | Partial, historical gaps |
| Cron Jobs | **Built-in** (Vercel Cron) | Not available (need external service) |
| Blob Storage | **Built-in** (Vercel Blob, 500 MB free) | Not available (need S3/Cloudinary) |

**Verdict:** Both are free, but Vercel is built for Next.js. With Netlify, we'd need external services for image storage and cron jobs, adding complexity for zero cost benefit.

### Why Vercel Blob over Cloudinary (for now)

| Factor | Vercel Blob | Cloudinary |
|---|---|---|
| Free tier | 500 MB storage, 1 GB bandwidth/month | 25 credits/month (~25 GB combined) |
| Paid pricing | $0.15/GB storage | **$89/month** (Plus plan — steep cliff) |
| Setup | 3 lines of code, native to Vercel | Separate account, API keys, SDK config |
| Image transforms | None (use `next/image` for resizing) | On-the-fly resize, crop, format conversion |
| Migration path | Swap `ImageService` implementation → done | — |

For an internal inventory system with ~500-2000 product images, Vercel Blob is sufficient. We wrap it in an `ImageService` abstraction — if Cloudinary is ever needed, swap one file.

---

## 3. Architecture: Feature-Module Pattern

### Why Modular?

A flat structure (`components/`, `hooks/`, `utils/` at root) collapses when you have 50+ components. You can't tell which belong to products vs. suppliers vs. billing.

**Feature modules solve this:**
- Each domain is **self-contained** — own components, services, hooks, types
- **Adding a module = adding a folder** — no changes to existing code
- **Removing a module = deleting a folder** — clean decoupling
- A **service layer** abstracts DB access — API routes call services, not Prisma directly

### Module Communication Rules

```
┌─────────────────────────────────────────────────────┐
│                    app/ (pages)                       │
│         Thin wrappers — compose module components     │
│         Contain NO business logic                     │
└──────────────────────┬──────────────────────────────┘
                       │ imports
┌──────────────────────▼──────────────────────────────┐
│              src/modules/ (feature modules)           │
│                                                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │
│  │ products/ │  │ stock/   │  │ purchase-orders/ │   │
│  │          │  │          │  │                  │   │
│  │ components│  │ components│  │ components       │   │
│  │ services ─┼──┼→services ◄──┼─ services        │   │
│  │ hooks    │  │ hooks    │  │ hooks            │   │
│  │ types    │  │ types    │  │ types            │   │
│  └──────────┘  └──────────┘  └──────────────────┘   │
│                      ▲                                │
│                      │ (future)                       │
│               ┌──────┴───┐                            │
│               │ billing/ │  ← calls same stockService │
│               └──────────┘                            │
└──────────────────────┬──────────────────────────────┘
                       │ imports
┌──────────────────────▼──────────────────────────────┐
│                   src/shared/                         │
│         Cross-module utilities (NOT business logic)   │
│         components/, hooks/, utils/, types/, constants │
└─────────────────────────────────────────────────────┘
```

### Rules

1. **Modules CAN import** from `shared/` — never the reverse
2. **Modules CAN import** other modules' **services/** and **types.ts** — but NOT components or hooks (keeps UI decoupled)
3. **`app/` pages are thin wrappers** — they import and compose module components, contain no business logic
4. **API routes call services** — never Prisma directly. This makes services testable, reusable, and mockable.

### The Central stockService (Critical)

All stock mutations flow through one function:

```typescript
// src/modules/stock/services/stockService.ts

adjustStock({
  productId,
  sizeId,
  storeId,
  quantity,       // positive for IN, negative for OUT
  type,           // 'IN' | 'OUT' | 'ADJUSTMENT' | 'SALE' | 'RETURN'
  reason,
  referenceType,  // 'PO' | 'SALE' | 'MANUAL'
  referenceId,
  userId
})
```

**Today:** Called by manual stock adjustment UI and PO receive flow.
**Later:** Billing module calls the SAME function with `type: 'SALE'` and `referenceType: 'SALE'`.

No new stock logic needed when billing arrives — it's just another caller.

---

## 4. Multi-Store Strategy: Schema Now, UI Later

### Approach

Bake `storeId` into the schema from day 1. Build single-store UI initially. Add multi-store UI later with zero schema changes.

### What Exists from Day 1

**In the schema:**
- `Store` table → id, name, code, address, phone, isActive
- `StockEntry` → has `storeId` (FK) — stock is per product + size + **store**
- `StockMovement` → has `storeId` — audit log is store-scoped
- `PurchaseOrder` → has `storeId` — orders are per store
- `User` → has `storeId` (FK, nullable) — null = access to all stores (admin)
- `Sale` → has `storeId` — sales are per store (ready for billing)
- `AlertConfig` → has `storeId` (nullable) — alerts can be store-specific or global
- Seed script creates a default "Main Store"

**In the application:**
- `StoreProvider` wraps the app, provides current `storeId` via React context
- Hardcoded to the default store's ID — user never sees a store selector
- All queries silently include `WHERE storeId = <defaultStoreId>`

### When Multi-Store is Needed (Future)

1. Add Store management UI (CRUD page for stores)
2. Add `StoreSelector` dropdown to the ProLayout header
3. Make `StoreProvider` read from the selector instead of hardcoded value
4. Add store assignment to User management

**Result:**
- **Zero schema migrations** — all `storeId` columns already exist
- **Zero service layer changes** — services already accept `storeId` parameter
- **Only UI additions** — store selector + store management pages

---

## 5. Billing Module Strategy: Interface Now, Implementation Later

### Approach

Define the data model + service interface + types now. Build the full UI and implementation in Phase 8. Ensure zero breaking changes when we do.

### What Exists from Day 1

**Schema (tables created but empty):**
- `Sale` — id, storeId, invoiceNumber, customerName, customerPhone, subtotal, discountAmount, taxAmount, total, paymentMethod (CASH | CARD | UPI), status (COMPLETED | REFUNDED), createdBy, createdAt
- `SaleItem` — id, saleId, productId, sizeId, quantity, unitPrice, total

**Service interface (stub):**
```typescript
// src/modules/billing/services/billingService.ts

// TODO: Implement in Phase 8
export const billingService = {
  createSale: async (input: CreateSaleInput) => { throw new Error('Not implemented') },
  getSaleById: async (id: string) => { throw new Error('Not implemented') },
  getSales: async (filters: SaleFilters) => { throw new Error('Not implemented') },
  refundSale: async (saleId: string) => { throw new Error('Not implemented') },
  generateInvoice: async (saleId: string) => { throw new Error('Not implemented') },
}
```

**Types (fully defined):**
```typescript
// src/modules/billing/types.ts
type CreateSaleInput = { storeId, items[], paymentMethod, discount?, customerName?, userId }
type SaleFilters = { storeId, dateRange, status, search }
```

### When Billing is Implemented (Phase 8)

1. Fill in `billingService` implementation:
   - `createSale()` → creates Sale + SaleItems in a transaction → calls `stockService.adjustStock()` per item with `type: 'SALE'`
   - `refundSale()` → marks Sale as REFUNDED → calls `stockService.adjustStock()` per item with `type: 'RETURN'`
2. Build billing UI: scan/search → cart → discount → checkout → invoice
3. Wire up API route (already stubbed)

**Result:** Stock decrement works automatically via the shared `stockService`. No changes to stock module, schema, or any other module.

---

## 6. Image Storage Strategy

### Approach

Use **Vercel Blob** with an `ImageService` abstraction layer for easy migration.

```typescript
// src/shared/services/imageService.ts

export const imageService = {
  upload: async (file: File) => {
    // Today: Vercel Blob
    // Tomorrow: swap to Cloudinary — only this file changes
    const blob = await put(file.name, file, { access: 'public' });
    return blob.url;
  },
  delete: async (url: string) => {
    await del(url);
  },
}
```

Every module that handles images (products, brands) calls `imageService` — never Vercel Blob directly. Migration to Cloudinary means changing one file.

---

## 7. Data Model

### Entity Relationship Overview

```
Store ──┬── StockEntry ──┬── Product ──┬── Category
        │                │             │
        │                │             └── Brand
        │                │
        │                └── Size ────── Category
        │
        ├── StockMovement ── Product + Size
        │
        ├── PurchaseOrder ──┬── Supplier
        │                   │
        │                   └── PurchaseOrderItem ── Product + Size
        │
        ├── Sale ── SaleItem ── Product + Size
        │
        └── AlertConfig ── Product / Category

User ──── Store (nullable)
```

### Complete Schema

#### Store
| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| name | String | "Main Store" |
| code | String | Unique, e.g., "MAIN" |
| address | String? | Optional |
| phone | String? | Optional |
| isActive | Boolean | Default: true |
| createdAt | DateTime | Auto |
| updatedAt | DateTime | Auto |

#### User
| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| name | String | Full name |
| email | String | Unique, for login |
| passwordHash | String | bcrypt hashed |
| role | Enum | ADMIN, MANAGER, STAFF |
| storeId | UUID? | FK → Store. Null = all stores (admin) |
| isActive | Boolean | Default: true |
| createdAt | DateTime | Auto |
| updatedAt | DateTime | Auto |

#### Category
| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| name | String | "T-Shirts", "Jeans", etc. |
| slug | String | Unique, URL-friendly |
| description | String? | Optional |
| attributeSchema | Json | JSONB — defines category-specific product fields |
| createdAt | DateTime | Auto |
| updatedAt | DateTime | Auto |

**`attributeSchema` example for Jeans:**
```json
{
  "fields": [
    { "name": "fit", "type": "select", "options": ["Slim", "Regular", "Relaxed", "Skinny"], "required": true },
    { "name": "rise", "type": "select", "options": ["Low", "Mid", "High"], "required": false },
    { "name": "material", "type": "text", "required": false }
  ]
}
```

#### Brand
| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| name | String | "Nike", "Adidas", etc. |
| logoUrl | String? | Stored in Vercel Blob |
| isActive | Boolean | Default: true |
| createdAt | DateTime | Auto |
| updatedAt | DateTime | Auto |

#### Product
| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| name | String | "Blue Slim Fit Jeans" |
| sku | String | Unique, for barcode |
| categoryId | UUID | FK → Category |
| brandId | UUID | FK → Brand |
| basePrice | Decimal | Selling price |
| costPrice | Decimal | Purchase cost |
| attributes | Json | JSONB — follows category's attributeSchema |
| imageUrl | String? | Stored in Vercel Blob |
| isActive | Boolean | Default: true |
| createdAt | DateTime | Auto |
| updatedAt | DateTime | Auto |

#### Size
| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| label | String | "S", "M", "L", "28", "30", etc. |
| sortOrder | Int | For display ordering |
| categoryId | UUID | FK → Category (sizes are category-specific) |
| createdAt | DateTime | Auto |

#### StockEntry
| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| productId | UUID | FK → Product |
| sizeId | UUID | FK → Size |
| storeId | UUID | FK → Store |
| quantity | Int | Current stock count |
| reorderLevel | Int | Alert when below this |
| reorderQuantity | Int | Suggested reorder amount |
| lastRestockedAt | DateTime? | Last restock timestamp |
| createdAt | DateTime | Auto |
| updatedAt | DateTime | Auto |

**Unique constraint:** `(productId, sizeId, storeId)` — one stock record per product+size+store.

#### StockMovement
| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| productId | UUID | FK → Product |
| sizeId | UUID | FK → Size |
| storeId | UUID | FK → Store |
| type | Enum | IN, OUT, ADJUSTMENT, SALE, RETURN |
| quantity | Int | Amount changed (positive) |
| reason | String? | "Initial stock", "Damaged", etc. |
| referenceType | Enum? | PO, SALE, MANUAL |
| referenceId | UUID? | FK to PO or Sale |
| createdBy | UUID | FK → User |
| createdAt | DateTime | Auto (immutable, append-only) |

#### Supplier
| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| name | String | Company name |
| contactPerson | String? | Point of contact |
| email | String? | — |
| phone | String? | — |
| address | String? | — |
| isActive | Boolean | Default: true |
| createdAt | DateTime | Auto |
| updatedAt | DateTime | Auto |

#### PurchaseOrder
| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| storeId | UUID | FK → Store |
| supplierId | UUID | FK → Supplier |
| status | Enum | DRAFT, ORDERED, RECEIVED, CANCELLED |
| totalAmount | Decimal | Sum of line items |
| notes | String? | Optional notes |
| orderedAt | DateTime? | When marked as ORDERED |
| receivedAt | DateTime? | When marked as RECEIVED |
| createdBy | UUID | FK → User |
| createdAt | DateTime | Auto |
| updatedAt | DateTime | Auto |

#### PurchaseOrderItem
| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| purchaseOrderId | UUID | FK → PurchaseOrder |
| productId | UUID | FK → Product |
| sizeId | UUID | FK → Size |
| quantity | Int | Ordered quantity |
| unitCost | Decimal | Cost per unit |
| createdAt | DateTime | Auto |

#### Sale (billing-ready, empty until Phase 8)
| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| storeId | UUID | FK → Store |
| invoiceNumber | String | Unique, auto-generated |
| customerName | String? | Optional |
| customerPhone | String? | Optional |
| subtotal | Decimal | Before discount and tax |
| discountAmount | Decimal | Discount applied |
| taxAmount | Decimal | Tax applied |
| total | Decimal | Final amount |
| paymentMethod | Enum | CASH, CARD, UPI |
| status | Enum | COMPLETED, REFUNDED |
| createdBy | UUID | FK → User |
| createdAt | DateTime | Auto |
| updatedAt | DateTime | Auto |

#### SaleItem (billing-ready, empty until Phase 8)
| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| saleId | UUID | FK → Sale |
| productId | UUID | FK → Product |
| sizeId | UUID | FK → Size |
| quantity | Int | Quantity sold |
| unitPrice | Decimal | Price per unit at time of sale |
| total | Decimal | quantity × unitPrice |
| createdAt | DateTime | Auto |

#### AlertConfig
| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| storeId | UUID? | FK → Store. Null = applies to all stores |
| productId | UUID? | FK → Product. Null = category-level alert |
| categoryId | UUID? | FK → Category. Null = product-level alert |
| threshold | Int | Alert when stock ≤ this |
| notifyEmail | Boolean | Send email alert |
| notifySMS | Boolean | Send SMS alert |
| isActive | Boolean | Default: true |
| createdAt | DateTime | Auto |
| updatedAt | DateTime | Auto |

---

## 8. Folder Structure

```
stockiva/
├── prisma/
│   ├── schema.prisma                ← Full schema (Store, Sale, SaleItem included from day 1)
│   ├── migrations/
│   └── seed.ts                      ← Default store, sample users, categories, products, stock
│
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/
│   │   │       └── page.tsx         ← Login page
│   │   │
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx           ← ProLayout shell (sidebar, header, breadcrumbs)
│   │   │   ├── page.tsx             ← Dashboard home (KPIs, charts, alerts)
│   │   │   │
│   │   │   ├── products/
│   │   │   │   ├── page.tsx         ← Product list (ProTable)
│   │   │   │   ├── new/
│   │   │   │   │   └── page.tsx     ← Add product (StepsForm)
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx     ← Product detail
│   │   │   │       └── edit/
│   │   │   │           └── page.tsx ← Edit product
│   │   │   │
│   │   │   ├── categories/
│   │   │   │   ├── page.tsx         ← Category list
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx     ← Category detail (sizes, attribute schema)
│   │   │   │
│   │   │   ├── brands/
│   │   │   │   └── page.tsx         ← Brand list with inline add/edit
│   │   │   │
│   │   │   ├── stock/
│   │   │   │   ├── page.tsx         ← Stock levels table
│   │   │   │   └── movements/
│   │   │   │       └── page.tsx     ← Stock movement history
│   │   │   │
│   │   │   ├── suppliers/
│   │   │   │   ├── page.tsx         ← Supplier list
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx     ← Supplier detail (+ PO history)
│   │   │   │
│   │   │   ├── purchase-orders/
│   │   │   │   ├── page.tsx         ← PO list
│   │   │   │   ├── new/
│   │   │   │   │   └── page.tsx     ← Create PO
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx     ← PO detail (+ receive action)
│   │   │   │
│   │   │   ├── scan/
│   │   │   │   └── page.tsx         ← Barcode scan page
│   │   │   │
│   │   │   ├── reports/
│   │   │   │   └── page.tsx         ← Reports with filters + export
│   │   │   │
│   │   │   ├── settings/
│   │   │   │   └── page.tsx         ← Tabbed settings: profile, users, stores, billing config, appearance
│   │   │   │
│   │   │   └── billing/             ← Empty placeholder — Phase 8
│   │   │       └── page.tsx
│   │   │
│   │   └── api/
│   │       ├── auth/
│   │       │   └── [...nextauth]/
│   │       │       └── route.ts     ← NextAuth handler
│   │       │
│   │       ├── products/
│   │       │   ├── route.ts         ← GET (list), POST (create)
│   │       │   └── [id]/
│   │       │       └── route.ts     ← GET, PUT, DELETE
│   │       │
│   │       ├── categories/
│   │       │   ├── route.ts
│   │       │   └── [id]/
│   │       │       └── route.ts
│   │       │
│   │       ├── brands/
│   │       │   ├── route.ts
│   │       │   └── [id]/
│   │       │       └── route.ts
│   │       │
│   │       ├── stock/
│   │       │   ├── route.ts         ← GET (levels), POST (adjust)
│   │       │   └── movements/
│   │       │       └── route.ts     ← GET (movement history)
│   │       │
│   │       ├── suppliers/
│   │       │   ├── route.ts
│   │       │   └── [id]/
│   │       │       └── route.ts
│   │       │
│   │       ├── purchase-orders/
│   │       │   ├── route.ts
│   │       │   └── [id]/
│   │       │       ├── route.ts
│   │       │       └── receive/
│   │       │           └── route.ts ← POST (receive PO → update stock)
│   │       │
│   │       ├── billing/
│   │       │   └── route.ts         ← Stub — returns 501 until Phase 8
│   │       │
│   │       ├── users/                 ← ★ Phase 9 — User management (ADMIN)
│   │       │   ├── route.ts           ← GET (list), POST (create)
│   │       │   └── [id]/
│   │       │       ├── route.ts       ← GET, PUT, DELETE
│   │       │       └── reset-password/
│   │       │           └── route.ts   ← POST — admin resets user password
│   │       │
│   │       ├── stores/                ← ★ Phase 9 — Store management (ADMIN)
│   │       │   ├── route.ts           ← GET (list), POST (create)
│   │       │   └── [id]/
│   │       │       └── route.ts       ← GET, PUT, DELETE
│   │       │
│   │       ├── settings/              ← ★ Phase 9 — App settings (billing config)
│   │       │   └── route.ts           ← GET (all), PUT (ADMIN)
│   │       │
│   │       ├── barcode/
│   │       │   └── lookup/
│   │       │       └── route.ts     ← GET ?sku=XXX → product + stock
│   │       │
│   │       ├── upload/
│   │       │   └── route.ts         ← POST — image upload via imageService
│   │       │
│   │       └── cron/
│   │           └── reorder-check/
│   │               └── route.ts     ← Vercel Cron — daily stock check
│   │
│   ├── modules/                     ← ★ FEATURE MODULES ★
│   │   │
│   │   ├── auth/
│   │   │   ├── components/
│   │   │   │   └── LoginForm.tsx
│   │   │   ├── services/
│   │   │   │   └── authService.ts   ← Credential validation, password hashing
│   │   │   ├── hooks/
│   │   │   │   ├── useAuth.ts
│   │   │   │   └── useCurrentUser.ts
│   │   │   └── types.ts
│   │   │
│   │   ├── products/
│   │   │   ├── components/
│   │   │   │   ├── ProductTable.tsx
│   │   │   │   ├── ProductForm.tsx  ← StepsForm (basic → attributes → stock → image)
│   │   │   │   └── ProductDetail.tsx
│   │   │   ├── services/
│   │   │   │   └── productService.ts ← CRUD + category-aware validation
│   │   │   ├── hooks/
│   │   │   │   ├── useProducts.ts
│   │   │   │   ├── useProduct.ts
│   │   │   │   └── useCreateProduct.ts
│   │   │   ├── constants.ts
│   │   │   └── types.ts
│   │   │
│   │   ├── categories/
│   │   │   ├── components/
│   │   │   │   ├── CategoryTable.tsx
│   │   │   │   ├── CategoryForm.tsx
│   │   │   │   └── AttributeSchemaBuilder.tsx ← Visual builder for JSONB schema
│   │   │   ├── services/
│   │   │   │   └── categoryService.ts
│   │   │   ├── hooks/
│   │   │   │   └── useCategories.ts
│   │   │   └── types.ts
│   │   │
│   │   ├── brands/
│   │   │   ├── components/
│   │   │   │   ├── BrandTable.tsx
│   │   │   │   └── BrandForm.tsx
│   │   │   ├── services/
│   │   │   │   └── brandService.ts
│   │   │   ├── hooks/
│   │   │   │   └── useBrands.ts
│   │   │   └── types.ts
│   │   │
│   │   ├── stock/
│   │   │   ├── components/
│   │   │   │   ├── StockTable.tsx
│   │   │   │   ├── StockAdjustmentModal.tsx
│   │   │   │   └── BulkUploadDrawer.tsx
│   │   │   ├── services/
│   │   │   │   └── stockService.ts  ← ★ CENTRAL — all stock mutations flow through here
│   │   │   ├── hooks/
│   │   │   │   ├── useStockLevels.ts
│   │   │   │   └── useAdjustStock.ts
│   │   │   └── types.ts
│   │   │
│   │   ├── suppliers/
│   │   │   ├── components/
│   │   │   │   ├── SupplierTable.tsx
│   │   │   │   ├── SupplierForm.tsx
│   │   │   │   └── SupplierDetail.tsx
│   │   │   ├── services/
│   │   │   │   └── supplierService.ts
│   │   │   ├── hooks/
│   │   │   │   └── useSuppliers.ts
│   │   │   └── types.ts
│   │   │
│   │   ├── purchase-orders/
│   │   │   ├── components/
│   │   │   │   ├── POTable.tsx
│   │   │   │   ├── POForm.tsx
│   │   │   │   ├── PODetail.tsx
│   │   │   │   └── POReceiveForm.tsx
│   │   │   ├── services/
│   │   │   │   └── poService.ts     ← Uses stockService.adjustStock() on receive
│   │   │   ├── hooks/
│   │   │   │   ├── usePurchaseOrders.ts
│   │   │   │   └── useReceivePO.ts
│   │   │   └── types.ts
│   │   │
│   │   ├── billing/                 ← ★ INTERFACE ONLY — implementation in Phase 8
│   │   │   ├── services/
│   │   │   │   └── billingService.ts ← Stub with method signatures
│   │   │   ├── types.ts             ← Sale, SaleItem, CreateSaleInput fully typed
│   │   │   └── README.md            ← Implementation notes for Phase 8
│   │   │
│   │   ├── dashboard/
│   │   │   ├── components/
│   │   │   │   ├── KPICards.tsx
│   │   │   │   ├── StockByCategoryChart.tsx
│   │   │   │   ├── TopBrandsChart.tsx
│   │   │   │   ├── RecentMovementsTable.tsx
│   │   │   │   └── LowStockAlertsList.tsx
│   │   │   ├── services/
│   │   │   │   └── dashboardService.ts ← Aggregation queries
│   │   │   ├── hooks/
│   │   │   │   └── useDashboardData.ts
│   │   │   └── types.ts
│   │   │
│   │   ├── barcode/
│   │   │   ├── components/
│   │   │   │   ├── BarcodeScanner.tsx  ← Camera-based scanning
│   │   │   │   ├── BarcodeGenerator.tsx ← Generate Code128 per SKU
│   │   │   │   └── LabelPrinter.tsx    ← Printable barcode label sheets
│   │   │   ├── services/
│   │   │   │   └── barcodeService.ts
│   │   │   ├── hooks/
│   │   │   │   └── useBarcodeLookup.ts
│   │   │   └── types.ts
│   │   │
│   │   ├── alerts/
│   │   │   ├── components/
│   │   │   │   └── AlertConfigTable.tsx
│   │   │   ├── services/
│   │   │   │   └── alertService.ts  ← Check thresholds, send email/SMS
│   │   │   ├── hooks/
│   │   │   │   └── useAlertConfigs.ts
│   │   │   └── types.ts
│   │   │
│   │   ├── settings/                ← ★ Settings, user management, multi-store, billing config
│   │   │   ├── components/
│   │   │   │   ├── UserTable.tsx      ← User CRUD table (ADMIN only)
│   │   │   │   ├── UserForm.tsx       ← Create/edit user modal
│   │   │   │   ├── ResetPasswordModal.tsx ← Admin resets user password
│   │   │   │   ├── StoreTable.tsx     ← Store CRUD table (ADMIN only)
│   │   │   │   ├── StoreForm.tsx      ← Create/edit store modal
│   │   │   │   ├── StoreProfileCard.tsx ← Quick-edit active store profile
│   │   │   │   ├── BillingConfigForm.tsx ← Tax rate + invoice prefix
│   │   │   │   ├── AppearanceSettings.tsx ← Light/dark theme toggle
│   │   │   │   └── StoreSelector.tsx  ← Header dropdown for multi-store (ADMIN)
│   │   │   ├── services/
│   │   │   │   ├── userService.ts     ← User CRUD with password hashing
│   │   │   │   ├── storeService.ts    ← Store CRUD
│   │   │   │   └── settingsService.ts ← App settings (tax rate, invoice prefix)
│   │   │   ├── hooks/
│   │   │   │   ├── useUsers.ts
│   │   │   │   ├── useStores.ts
│   │   │   │   ├── useAppSettings.ts
│   │   │   │   └── useTheme.ts        ← Light/dark mode toggle + localStorage
│   │   │   └── types.ts
│   │   │
│   │   └── layout/
│   │       ├── components/
│   │       │   └── AppLayout.tsx     ← ProLayout wrapper + StoreSelector in header
│   │       ├── constants.ts         ← Menu items, route definitions
│   │       └── types.ts
│   │
│   ├── shared/                      ← Cross-module utilities (NOT business logic)
│   │   ├── components/
│   │   │   ├── PageContainer.tsx    ← Standard page wrapper with title + breadcrumb
│   │   │   ├── ConfirmModal.tsx
│   │   │   └── StatusTag.tsx        ← Colored tags for statuses
│   │   ├── hooks/
│   │   │   ├── useDebounce.ts
│   │   │   └── usePagination.ts
│   │   ├── services/
│   │   │   └── imageService.ts      ← ★ Vercel Blob abstraction (swap to Cloudinary later)
│   │   ├── utils/
│   │   │   ├── formatCurrency.ts
│   │   │   ├── formatDate.ts
│   │   │   └── cn.ts               ← Classname helper
│   │   ├── constants/
│   │   │   ├── roles.ts
│   │   │   └── statuses.ts
│   │   └── types/
│   │       ├── api.ts              ← API response envelope, pagination types
│   │       └── common.ts
│   │
│   ├── lib/
│   │   ├── db.ts                   ← Prisma client singleton
│   │   ├── auth.ts                 ← NextAuth configuration
│   │   ├── auth.middleware.ts      ← Role-based route protection
│   │   └── store-context.ts        ← Current store ID (defaults to main store)
│   │
│   └── providers/
│       ├── QueryProvider.tsx        ← TanStack Query setup
│       ├── AuthProvider.tsx         ← NextAuth SessionProvider
│       ├── ThemeProvider.tsx        ← Ant Design ConfigProvider + design tokens
│       └── StoreProvider.tsx        ← Store context (hardcoded → dynamic later)
│
├── public/
│   └── favicon.ico
│
├── .env.local                      ← DATABASE_URL, NEXTAUTH_SECRET, BLOB_READ_WRITE_TOKEN, etc.
├── .env.example                    ← Template for env variables
├── .eslintrc.json
├── .prettierrc
├── next.config.ts
├── tsconfig.json
├── vercel.json                     ← Cron job config
├── package.json
├── PLAN.md                         ← This file
└── README.md
```

---

## 9. Implementation Phases

### Phase 1: Foundation & Schema

**Goal:** Project scaffolding, full database schema, seed data, core infrastructure.

| # | Task | Details |
|---|---|---|
| 1.1 | Initialize Next.js 14 | App Router, TypeScript, `src/` directory, ESLint, Prettier |
| 1.2 | Install dependencies | antd, @ant-design/pro-components, @ant-design/charts, prisma, @prisma/client, next-auth, @tanstack/react-query, @vercel/blob, bcryptjs, zod, html5-qrcode, react-barcode, resend |
| 1.3 | Configure Prisma | Connect to Neon PostgreSQL, define **complete schema** (all tables including Store, Sale, SaleItem) |
| 1.4 | Run migrations | `npx prisma migrate dev --name init` — creates all tables |
| 1.5 | Create seed script | Default Store ("Main Store"), 3 users (admin/manager/staff), 7 categories with attributeSchemas, 5 brands, sizes per category, 20+ sample products, stock entries |
| 1.6 | Create folder structure | `src/modules/`, `src/shared/`, `src/lib/`, `src/providers/` with placeholder files |
| 1.7 | Set up `lib/db.ts` | Prisma client singleton (dev hot-reload safe) |
| 1.8 | Set up `lib/store-context.ts` | Helper that returns the default store ID |
| 1.9 | Set up providers | QueryProvider, AuthProvider, ThemeProvider, StoreProvider |
| 1.10 | Configure Ant Design theme | Custom design tokens (brand colors, border radius, fonts) |
| 1.11 | Create billing stub | `modules/billing/services/billingService.ts` (interface), `types.ts`, `README.md` |
| 1.12 | Create imageService | `shared/services/imageService.ts` wrapping Vercel Blob |

**Verification:**
- `npx prisma validate` passes
- `npx prisma migrate dev` creates all tables (including Store, Sale, SaleItem)
- `npx prisma db seed` loads sample data
- `npx prisma studio` shows all tables with data
- `npm run dev` starts without errors

---

### Phase 2: Authentication & Layout Shell

**Goal:** Working login, role-based access control, admin layout with navigation.

**Depends on:** Phase 1

| # | Task | Details |
|---|---|---|
| 2.1 | NextAuth config | `lib/auth.ts` — CredentialsProvider with bcrypt verification, JWT strategy, role included in session/token |
| 2.2 | Auth API route | `app/api/auth/[...nextauth]/route.ts` |
| 2.3 | LoginForm component | `modules/auth/components/LoginForm.tsx` — Ant Design Form with email/password, error handling |
| 2.4 | Login page | `app/(auth)/login/page.tsx` — centered card layout |
| 2.5 | Auth middleware | `middleware.ts` — protect `/dashboard/*` routes, redirect unauthenticated to `/login` |
| 2.6 | Role-based middleware | `lib/auth.middleware.ts` — helper to check role in API routes |
| 2.7 | AppLayout component | `modules/layout/components/AppLayout.tsx` — ProLayout with collapsible sidebar, header with user name + logout, breadcrumbs |
| 2.8 | Menu configuration | `modules/layout/constants.ts` — menu items with route paths, icons, role-based visibility |
| 2.9 | Dashboard layout | `app/(dashboard)/layout.tsx` — wraps children with AppLayout, gets session server-side |
| 2.10 | Auth hooks | `useAuth()`, `useCurrentUser()` for client components |

**Verification:**
- Navigate to `/dashboard` unauthenticated → redirected to `/login`
- Login as admin → see full menu (all items)
- Login as staff → see restricted menu (no settings/user management)
- Sidebar collapses/expands, breadcrumbs update on navigation
- Logout works, session cleared

---

### Phase 3: Core Inventory Modules

**Goal:** Full CRUD for categories, brands, products, and stock management with the central stockService.

**Depends on:** Phase 2

#### 3A: Categories Module (can start immediately)

| # | Task | Details |
|---|---|---|
| 3A.1 | categoryService | CRUD operations, attributeSchema validation with Zod |
| 3A.2 | Categories API | `app/api/categories/route.ts` + `[id]/route.ts` |
| 3A.3 | CategoryTable | ProTable with name, slug, product count, actions |
| 3A.4 | CategoryForm | ProForm for name, description, sizes (dynamic list), attribute schema builder |
| 3A.5 | AttributeSchemaBuilder | Visual UI for defining category-specific fields (name, type, options, required) |
| 3A.6 | Category pages | List + detail/edit pages |

#### 3B: Brands Module (can start in parallel with 3A)

| # | Task | Details |
|---|---|---|
| 3B.1 | brandService | CRUD operations, logo upload via imageService |
| 3B.2 | Brands API | `app/api/brands/route.ts` + `[id]/route.ts` |
| 3B.3 | BrandTable | ProTable with name, logo thumbnail, product count, status toggle |
| 3B.4 | BrandForm | ProForm with name, logo upload (Dragger), active toggle |
| 3B.5 | Brand page | List page with inline modal for add/edit |

#### 3C: Products Module (depends on 3A + 3B)

| # | Task | Details |
|---|---|---|
| 3C.1 | productService | CRUD with category-aware attribute validation using dynamic Zod schema generated from category's attributeSchema JSONB |
| 3C.2 | Products API | `app/api/products/route.ts` + `[id]/route.ts` |
| 3C.3 | ProductTable | ProTable with filters (category dropdown, brand dropdown, stock status, search text), sortable columns, bulk actions |
| 3C.4 | ProductForm | StepsForm: Step 1 (name, SKU, category, brand, prices) → Step 2 (dynamic attributes from selected category's schema) → Step 3 (select sizes, set initial stock per size) → Step 4 (image upload) |
| 3C.5 | ProductDetail | Product info card + stock per size table + movement history timeline |
| 3C.6 | Product pages | List, new, detail, edit |

#### 3D: Stock Module (depends on 3C)

| # | Task | Details |
|---|---|---|
| 3D.1 | **stockService** | `getStockLevels(filters)`, `adjustStock(input)` (atomic transaction: update StockEntry + insert StockMovement), `bulkAdjust(items[])`, `getMovementHistory(filters)` |
| 3D.2 | Stock API | `app/api/stock/route.ts` (GET levels, POST adjust) + `movements/route.ts` (GET history) |
| 3D.3 | StockTable | ProTable: product name, size, store, quantity, reorder level, status badge (OK / Low / Out of Stock), actions (adjust) |
| 3D.4 | StockAdjustmentModal | Select reason (dropdown: recount, damaged, received, other), enter quantity (+/-), confirm → calls stockService |
| 3D.5 | BulkUploadDrawer | Download CSV template → upload → preview changes table → confirm → bulkAdjust |
| 3D.6 | Stock pages | Levels page, movements history page (date range filter, product filter) |

**Verification:**
- Create category with custom attributeSchema → create product in that category → dynamic form shows correct fields
- Create product → stock entries auto-created for selected sizes (per store)
- Adjust stock → StockMovement record created with correct type, reason, userId, storeId
- Stock table shows correct levels, status badges update based on reorderLevel
- Bulk CSV upload processes correctly

---

### Phase 4: Suppliers & Purchase Orders

**Goal:** Supplier management and full PO lifecycle with automatic stock updates on receive.

**Depends on:** Phase 3 (stock module)

| # | Task | Details |
|---|---|---|
| 4.1 | supplierService | CRUD operations |
| 4.2 | Suppliers API | Standard CRUD routes |
| 4.3 | SupplierTable + Form | ProTable with search, ProForm for details |
| 4.4 | SupplierDetail | Info card + PO history table (all POs for this supplier) |
| 4.5 | poService | `createPO()`, `submitPO()`, `receivePO()` (calls stockService.adjustStock per item), `cancelPO()` |
| 4.6 | Purchase Orders API | CRUD routes + `[id]/receive/route.ts` |
| 4.7 | POTable | ProTable filtered by status, supplier, date range |
| 4.8 | POForm | Select supplier → dynamic line item table (product picker, size selector, quantity, unit cost) → auto-calculate total |
| 4.9 | PODetail | Line items table + status timeline (Draft → Ordered → Received) + action buttons |
| 4.10 | POReceiveForm | On receive: show ordered items, enter actual received quantities (may differ), confirm → stock updated |

**Verification:**
- Create PO (Draft) → Submit (Ordered) → Receive (Received)
- On receive: StockEntry quantities increment correctly
- StockMovement records created with type=IN, referenceType=PO, referenceId=poId
- PO with 0 received quantity for an item → that item's stock not updated
- Cancel PO → no stock changes

---

### Phase 5: Alerts & Reorder System

**Goal:** Automated low-stock detection and notifications.

**Depends on:** Phase 3 (stock module). Can run in parallel with Phase 4.

| # | Task | Details |
|---|---|---|
| 5.1 | alertService | `checkStockLevels(storeId?)` — query StockEntry WHERE quantity ≤ reorderLevel, `sendAlerts(items[])` — Resend email + Twilio SMS |
| 5.2 | AlertConfigTable | Manage alert thresholds — per product, per category, or global |
| 5.3 | Cron API route | `app/api/cron/reorder-check/route.ts` — called by Vercel Cron daily, runs alertService |
| 5.4 | vercel.json cron config | `{ "crons": [{ "path": "/api/cron/reorder-check", "schedule": "0 9 * * *" }] }` |
| 5.5 | Email template | React-based email (Resend) listing low-stock items with quantities and reorder suggestions |
| 5.6 | Dashboard widget | LowStockAlertsList component — clickable items that pre-fill a PO creation form |

**Verification:**
- Set a product's stock to 1 (below reorderLevel of 5) → trigger cron manually → email received with correct details
- AlertConfig: disable alert for a product → that product excluded from alerts
- Dashboard shows correct count of low-stock items

---

### Phase 6: Dashboard & Reports

**Goal:** Analytics dashboard and exportable reports.

**Depends on:** Phase 3 + Phase 4

| # | Task | Details |
|---|---|---|
| 6.1 | dashboardService | Aggregation queries: totals, sums, groupings, trends |
| 6.2 | KPICards | 4 stat cards: total products, total stock value (Σ quantity × costPrice), low-stock item count, pending POs count |
| 6.3 | StockByCategoryChart | Bar chart — @ant-design/charts — stock quantity grouped by category |
| 6.4 | TopBrandsChart | Pie/donut chart — stock value by brand |
| 6.5 | RecentMovementsTable | Mini ProTable — last 10 stock movements (product, type, quantity, user, time) |
| 6.6 | LowStockAlertsList | From alerts module — clickable to create PO |
| 6.7 | Dashboard page | Compose all widgets in a responsive Ant Design Row/Col grid |
| 6.8 | Reports page | Filterable (date range, category, brand) stock report + movement history + CSV/Excel export |

**Verification:**
- Dashboard loads with real data from seed
- Charts render correctly, are interactive (tooltips, click)
- Reports filter correctly, export downloads a valid CSV
- KPIs match actual database counts

---

### Phase 7: Barcode Module

**Goal:** Generate, scan, and print barcodes for products.

**Depends on:** Phase 3. Can run in parallel with Phase 5 and 6.

| # | Task | Details |
|---|---|---|
| 7.1 | BarcodeGenerator | Generate Code128 barcode for each product SKU using react-barcode |
| 7.2 | BarcodeScanner | Camera-based scan page using html5-qrcode, supports Code128/EAN-13/UPC-A |
| 7.3 | Barcode lookup API | `app/api/barcode/lookup/route.ts` — GET ?sku=XXX → product details + stock levels |
| 7.4 | Scan → action flow | Scan barcode → display product info + current stock → quick actions: adjust stock, view details, add to PO |
| 7.5 | LabelPrinter | Generate printable barcode label sheets (multiple labels per page) as PDF using @react-pdf/renderer |
| 7.6 | Product detail integration | Show barcode on product detail page, "Print Label" button |

**Verification:**
- Generate barcode for a product → visible Code128 image
- Scan barcode with phone camera → correct product loads with stock info
- Quick actions (adjust, view) work from scan result
- Print labels → generates valid PDF with correct barcodes

---

### Phase 8: Billing Module (Built Later)

**Goal:** Implement the billing stub — full sales/billing flow with automatic stock decrement.

**Depends on:** Phase 3 + Phase 7 (barcode scan for quick product lookup)

| # | Task | Details |
|---|---|---|
| 8.1 | Implement billingService | `createSale()` → transaction: create Sale + SaleItems + stockService.adjustStock() per item (type=SALE), `refundSale()` → REFUNDED status + stockService.adjustStock() per item (type=RETURN), `generateInvoice()` → PDF |
| 8.2 | Billing API | `app/api/billing/route.ts` — replace stub with real implementation |
| 8.3 | BillingPage | Scan/search products → add to cart → set quantity/size → apply discount → select payment method → confirm |
| 8.4 | CartDrawer | Sidebar cart with items, quantities, subtotal, discount, tax, total |
| 8.5 | InvoicePreview | Printable invoice (PDF) with store details, items, totals, payment method |
| 8.6 | SalesHistory | ProTable of past sales with filters (date, payment method, status), detail modal |
| 8.7 | Dashboard integration | Add sales KPIs (today's sales, revenue) to dashboard (new widget) |

**Verification:**
- Create sale → Sale + SaleItem records created → stock decremented correctly
- StockMovement records: type=SALE, referenceType=SALE, referenceId=saleId
- Refund → stock restored, sale status=REFUNDED
- Invoice PDF generates with correct details
- **No changes were needed in stock module, schema, or any other module**

---

### Phase 9: Settings & Multi-Store

**Goal:** Full Settings page with user management, store management (multi-store UI), billing configuration, appearance (light/dark theme), and a store selector in the header.

**Depends on:** Phase 2 (auth/roles), Phase 8 (billing module)

#### 9A: Types & Services (foundation)

| # | Task | Details |
|---|---|---|
| 9A.1 | Settings types | `modules/settings/types.ts` — `AppUser`, `CreateUserInput`, `UpdateUserInput`, `StoreRecord`, `CreateStoreInput`, `UpdateStoreInput`, `BillingConfig` (taxRate, invoicePrefix), `AppSettings` |
| 9A.2 | userService | Mock in-memory CRUD — seeded with 3 users (admin/manager/staff). `getUsers()`, `getUserById()`, `createUser()` (bcrypt password), `updateUser()`, `resetPassword()`, `deleteUser()` (soft delete) |
| 9A.3 | storeService | Mock in-memory CRUD — seeded with "Main Store". `getStores()`, `getStoreById()`, `createStore()`, `updateStore()`, `deleteStore()` (soft delete) |
| 9A.4 | settingsService | Mock in-memory settings. `getSettings()` → `{ taxRate: 18, invoicePrefix: "INV" }`, `updateSettings(partial)` → merge & return |

#### 9B: API Routes

| # | Task | Details |
|---|---|---|
| 9B.1 | Users API | `app/api/users/route.ts` — GET list + POST create (ADMIN only via `requireRole`) |
| 9B.2 | User detail API | `app/api/users/[id]/route.ts` — GET, PUT, DELETE (ADMIN only) |
| 9B.3 | Password reset API | `app/api/users/[id]/reset-password/route.ts` — POST (ADMIN only, accepts `{ newPassword }`) |
| 9B.4 | Stores API | `app/api/stores/route.ts` — GET list (all roles), POST create (ADMIN only) |
| 9B.5 | Store detail API | `app/api/stores/[id]/route.ts` — GET, PUT (ADMIN), DELETE (ADMIN) |
| 9B.6 | Settings API | `app/api/settings/route.ts` — GET (all roles), PUT (ADMIN only, updates billing config) |

#### 9C: Hooks

| # | Task | Details |
|---|---|---|
| 9C.1 | useUsers | `useUsers()` — fetch all + CRUD operations. `useUser(id)` — fetch single user |
| 9C.2 | useStores | `useStores()` — fetch all stores + CRUD (named to avoid conflict with StoreProvider's `useStore`) |
| 9C.3 | useAppSettings | `useAppSettings()` — fetch/update billing config (tax rate, invoice prefix) |
| 9C.4 | useTheme | `useThemeMode()` — read/write `"light" \| "dark"` from localStorage, returns `{ mode, toggle }` |

#### 9D: Components

| # | Task | Details |
|---|---|---|
| 9D.1 | UserTable | antd Table — name, email, role (color Tag), store assignment, status, actions (edit, reset password, deactivate). Search + "Add User" button |
| 9D.2 | UserForm | Modal form — name, email, password (create only), role Select, store Select, isActive Switch |
| 9D.3 | ResetPasswordModal | Modal — new password + confirm password. Admin resets another user's password |
| 9D.4 | StoreTable | antd Table — name, code, address, phone, status, actions (edit, deactivate). "Add Store" button |
| 9D.5 | StoreForm | Modal form — name, code (auto slug), address, phone, isActive |
| 9D.6 | StoreProfileCard | Editable card for active store — inline edit name/address/phone with Save/Cancel |
| 9D.7 | BillingConfigForm | antd Form — Tax Rate (InputNumber, suffix "%"), Invoice Prefix (Input). Save button |
| 9D.8 | AppearanceSettings | Theme toggle — antd Segmented control (Light / Dark). Reads/writes via `useThemeMode()` |

#### 9E: Theme Integration

| # | Task | Details |
|---|---|---|
| 9E.1 | Update ThemeProvider | Add `ThemeModeContext`, switch antd `algorithm` between `defaultAlgorithm` (light) and `darkAlgorithm` (dark), read initial mode from localStorage |
| 9E.2 | Update globals.css | Dark mode body/scrollbar styles via CSS variables or body class |

#### 9F: Settings Page & Multi-Store Header

| # | Task | Details |
|---|---|---|
| 9F.1 | Settings page | Rewrite `settings/page.tsx` — antd Tabs: **My Profile** (all roles, read-only), **User Management** (ADMIN), **Store Management** (ADMIN, StoreProfileCard + StoreTable), **Billing Config** (ADMIN), **Appearance** (all roles). Default tab: "My Profile" for STAFF/MANAGER, "User Management" for ADMIN |
| 9F.2 | StoreSelector | `modules/settings/components/StoreSelector.tsx` — antd Select dropdown fetching stores, on change calls `StoreProvider.setStore()`. ADMIN-only visibility |
| 9F.3 | AppLayout update | Add StoreSelector to layout header (next to user avatar). Only render for ADMIN role |

**Verification:**
- Login as STAFF → Settings shows only "My Profile" + "Appearance" tabs
- Login as ADMIN → all 5 tabs visible
- Create user → appears in UserTable. Edit role → tag color updates. Deactivate → status changes
- Admin resets user password → mock service updates
- Create store → appears in StoreTable. Edit/deactivate works
- ADMIN sees StoreSelector in header → switch store → StoreProvider context updates
- Change tax rate / invoice prefix → save → values persist in session
- Toggle dark mode → entire app switches theme → preference persists in localStorage on refresh
- `npx next build` passes with zero errors

---

### Phase 10: Polish & Deployment

**Goal:** Production-ready application.

**Depends on:** All previous phases

| # | Task | Details |
|---|---|---|
| 10.1 | Responsive design | Test on mobile/tablet viewports, fix Ant Design grid breakpoints |
| 10.2 | Loading states | Skeleton loaders on tables and forms, Spin on async actions |
| 10.3 | Empty states | Custom empty states per page (no products yet, no POs, etc.) |
| 10.4 | Error handling | Global error boundary, API error toasts (notification), form error display |
| 10.5 | Vercel setup | Connect GitHub repo, configure environment variables (DATABASE_URL, NEXTAUTH_SECRET, BLOB_READ_WRITE_TOKEN, RESEND_API_KEY, TWILIO_*) |
| 10.6 | Neon production DB | Create production database, run `prisma migrate deploy`, seed initial data |
| 10.7 | Vercel Cron | Verify cron job runs daily at 9 AM (reorder check) |
| 10.8 | UAT | Test with real inventory data — all flows end-to-end |

**Verification:**
- App works on mobile Safari/Chrome (responsive)
- All loading/empty/error states display correctly
- Production deployment accessible via Vercel URL
- Cron job fires on schedule
- All Phase 1-9 verifications pass in production

---

## 10. Verification & Testing Plan

### Manual Verification Checklist

| # | Test | Expected Result |
|---|---|---|
| 1 | `npx prisma validate` | Schema valid, no errors |
| 2 | `npx prisma migrate dev` | All tables created including Store, Sale, SaleItem |
| 3 | `npx prisma db seed` | Default store + sample data loaded |
| 4 | Navigate to `/dashboard` unauthenticated | Redirected to `/login` |
| 5 | Login as each role | Correct menu visibility per role |
| 6 | All stock queries include storeId | Verified via Prisma query logs |
| 7 | Create category → create product with dynamic attributes | Attributes form matches category schema |
| 8 | Adjust stock | StockMovement created, StockEntry updated atomically |
| 9 | PO lifecycle: Draft → Ordered → Received | Stock auto-increments on receive |
| 10 | Set stock below reorder level → trigger cron | Email alert sent with correct items |
| 11 | Barcode scan on phone browser | Correct product loads with stock info |
| 12 | Delete `modules/barcode/` folder | App still compiles (module isolation) |
| 13 | billingService interface exists | Types and method signatures complete |
| 14 | Dashboard KPIs | Match actual database counts |
| 15 | CSV export | Valid file downloads with correct data |

### Future: Automated Testing (when team grows)
- **Unit tests** (Vitest): Service functions (stockService, poService, billingService)
- **API tests** (Vitest + supertest): Each API route
- **E2E tests** (Playwright): Login flow, product CRUD, PO lifecycle, billing flow

---

## 11. Key Architectural Decisions

| # | Decision | Rationale |
|---|---|---|
| 1 | **Next.js 14 (App Router)** | Fullstack in one codebase. Server Components for heavy dashboard. API Routes eliminate separate backend. Vercel-native deployment. |
| 2 | **Ant Design + ProComponents** | Data tables, forms, admin layout out of the box. ProTable/ProForm save weeks vs. building from scratch with styled-components. |
| 3 | **PostgreSQL + JSONB** | Relational for inventory data + JSONB for flexible category attributes = new categories without migrations. |
| 4 | **Prisma ORM** | Type-safe queries, auto-generated types, declarative schema, visual studio. |
| 5 | **Feature-module architecture** | Each domain self-contained. Add/remove features by adding/removing folders. No spaghetti. |
| 6 | **Service layer abstraction** | API routes → services → Prisma. Services reusable across modules (stockService used by 3+ modules). |
| 7 | **Schema-first multi-store** | storeId FKs from day 1. UI single-store initially. Zero migrations when multi-store UI needed. |
| 8 | **Billing as interface stub** | Schema + types + service interface now. Full implementation later. stockService handles the hard part. Zero breaking changes. |
| 9 | **Central stockService** | Single source of truth for all inventory mutations. Manual adjustments, PO receives, and future billing all call the same function. |
| 10 | **StoreProvider context** | Provides current storeId app-wide. Hardcoded now → dynamic when store selector UI is built. |
| 11 | **Vercel Blob + ImageService** | Free, native to Vercel, sufficient for internal tool. Abstraction layer enables Cloudinary migration by swapping one file. |
| 12 | **Vercel over Netlify** | First-party Next.js support, built-in Cron and Blob storage. Netlify would require 2-3 external services for same functionality. |
| 13 | **TanStack Query (no Redux)** | App is server-state-driven. TanStack Query handles caching, refetching, and optimistic updates. No client-state library needed. |
| 14 | **Zod validation** | Runtime + compile-time type safety for API inputs and form data. Dynamic schema generation from category attributeSchema. |
| 15 | **Append-only StockMovement** | Every stock change logged immutably. Enables audit trail, reports, and accountability. |
| 16 | **Vercel Cron for alerts** | No separate cron server. One config line in vercel.json. Free on Hobby plan. |

---

## Appendix: Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:pass@host/stockiva?sslmode=require"

# Auth
NEXTAUTH_SECRET="<random-32-char-string>"
NEXTAUTH_URL="http://localhost:3000"

# Vercel Blob (image storage)
BLOB_READ_WRITE_TOKEN="<vercel-blob-token>"

# Email (Resend)
RESEND_API_KEY="<resend-api-key>"

# SMS (Twilio)
TWILIO_ACCOUNT_SID="<twilio-sid>"
TWILIO_AUTH_TOKEN="<twilio-auth-token>"
TWILIO_PHONE_NUMBER="+1234567890"

# Alert recipient
ALERT_EMAIL="owner@stockiva.com"
ALERT_PHONE="+91XXXXXXXXXX"
```

---

## Appendix: Dependency List

```json
{
  "dependencies": {
    "next": "^14.x",
    "react": "^18.x",
    "react-dom": "^18.x",
    "antd": "^5.x",
    "@ant-design/pro-components": "^2.x",
    "@ant-design/charts": "^2.x",
    "@ant-design/icons": "^5.x",
    "@prisma/client": "^5.x",
    "next-auth": "^5.x",
    "@tanstack/react-query": "^5.x",
    "@vercel/blob": "latest",
    "bcryptjs": "^2.x",
    "zod": "^3.x",
    "html5-qrcode": "^2.x",
    "react-barcode": "^1.x",
    "@react-pdf/renderer": "^3.x",
    "resend": "latest",
    "twilio": "latest",
    "dayjs": "^1.x"
  },
  "devDependencies": {
    "prisma": "^5.x",
    "typescript": "^5.x",
    "@types/react": "^18.x",
    "@types/node": "^20.x",
    "@types/bcryptjs": "^2.x",
    "eslint": "^8.x",
    "eslint-config-next": "^14.x",
    "prettier": "^3.x"
  }
}
```

---

*Last updated: 20 March 2026*
*Status: Plan finalized, ready for Phase 1 implementation*
