# Stockiva — Multi-Tenant Architecture Plan

> **Blueprint for transforming Stockiva from a single-shop system to a full SaaS platform serving multiple independent shop owners with complete data isolation.**

---

## Table of Contents

- [1. Current System Assessment](#1-current-system-assessment)
- [2. Can It Handle Multiple Shop Owners?](#2-can-it-handle-multiple-shop-owners)
- [3. Scalability Assessment](#3-scalability-assessment)
- [4. Current System Workflow](#4-current-system-workflow)
- [5. Solution: Organization-Based Multi-Tenancy](#5-solution-organization-based-multi-tenancy)
- [6. Role Hierarchy](#6-role-hierarchy)
- [7. Platform Admin — Real-Time Monitoring](#7-platform-admin--real-time-monitoring)
- [8. Schema Changes](#8-schema-changes)
- [9. Code Changes — File-by-File](#9-code-changes--file-by-file)
- [10. Implementation Phases](#10-implementation-phases)
- [11. Verification Checklist](#11-verification-checklist)
- [12. Key Decisions](#12-key-decisions)
- [13. Future Business Scenarios (Todo Backlog)](#13-future-business-scenarios-todo-backlog)

---

## 1. Current System Assessment

### What Exists Today

| Layer | What's Built | Status |
|---|---|---|
| **Database Schema** | Full Prisma schema with 14 models (Store, User, Category, Brand, Product, Size, StockEntry, StockMovement, Supplier, PurchaseOrder, PurchaseOrderItem, Sale, SaleItem, AlertConfig) | Defined, not deployed to NeonDB yet |
| **Auth** | NextAuth with Credentials + Google OAuth, JWT sessions, role-based (ADMIN/MANAGER/STAFF) | Working with test credentials |
| **API Routes** | 11 route files covering brands, categories, products, stock, billing, cron | Built, connected to mock services |
| **Services** | Mock in-memory services for brands, categories, products, stock, billing. Real Prisma `stockService.ts` exists but isn't wired | Mock data only |
| **Frontend** | Full dashboard with sidebar, KPI cards, charts, tables for all modules. StoreSelector, StoreProvider context | Functional with mock data |
| **Modules** | brands, categories, products, stock, suppliers, purchase-orders, billing, alerts, barcode, dashboard, layout, auth, settings | All have types.ts, most have components + hooks |

### What Works Well (Solid Foundations)

- **Feature-module pattern** — each domain is self-contained with its own components, services, hooks, types
- **Central `stockService.adjustStock()`** — single entry point for all stock mutations (manual, PO, sale, return)
- **Service abstraction** — API routes call services, never Prisma directly
- **Store model** — `storeId` already exists on StockEntry, StockMovement, PurchaseOrder, Sale, AlertConfig
- **StoreProvider + StoreSelector** — context pattern for current store, admin can switch stores
- **JSONB attributes** — flexible product attributes per category without schema migrations
- **JWT session** — role stored in token, available server-side and client-side

---

## 2. Can It Handle Multiple Shop Owners?

### **No.** Here's exactly why:

The current system is designed for **one shop with multiple store locations**, where all data is implicitly shared. There is no concept of "ownership" or "tenant boundary".

| Entity | Current Scope | What Happens with 2 Shop Owners |
|---|---|---|
| **Category** | Global (`name` UNIQUE globally) | Rare Thread creates "T-Shirts" → Fragrance **cannot** create their own "T-Shirts" (unique constraint fails). If they could, both owners see each other's categories. |
| **Brand** | Global (`name` UNIQUE globally) | Rare Thread creates "Nike" → visible to Fragrance. Fragrance deletes it → Rare Thread loses their brand. |
| **Product** | Global (`sku` UNIQUE globally) | Rare Thread's `SKU: RT-001` is visible to Fragrance's staff. All inventory data leaks. |
| **Supplier** | Global (no owner) | Rare Thread's supplier "Fashion Wholesale" appears in Fragrance's supplier list. |
| **Store** | No owner link | All stores from all owners appear in StoreSelector. Any ADMIN sees all stores. |
| **User** | No owner link | An ADMIN has implicit access to everything — all owners' data, all stores, all products. |
| **Size** | Scoped to Category | Since Category is global, sizes bleed too. |
| **StockEntry** | Per Store | Stores have no owner, so cross-owner access is possible. |
| **Sale** | Per Store | Same — no isolation boundary. |

**Root Cause:** There is no `Organization` or `Tenant` entity that groups stores, users, products, categories, brands, and suppliers together under one shop owner.

---

## 3. Scalability Assessment

### What Scales

| Aspect | Why It Scales |
|---|---|
| Feature-module architecture | Adding a new module = adding a folder. No changes to existing code. |
| Service layer abstraction | Swap mock → Prisma without touching API routes or components |
| PostgreSQL + JSONB | Handles millions of rows. JSONB allows flexible attributes without migrations. |
| Vercel + Neon serverless | Auto-scales on demand, connection pooling built-in |
| JWT auth | Stateless, no session DB needed |

### What Doesn't Scale

| Aspect | Why |
|---|---|
| No tenant boundary | Adding more users/shops pollutes everyone's data |
| Mock services | In-memory arrays reset on every deployment, no persistence |
| Hardcoded store context | `getDefaultStoreId()` returns "MAIN" store, `test-store-001` hardcoded in auth |
| Global unique constraints | `Category.name`, `Brand.name`, `Product.sku` can only exist once across entire platform |
| No org-level auth | JWT has `role` and `storeId` but no `orgId` — can't scope API responses |

---

## 4. Current System Workflow

### Data Flow (Today — Mock)

```
Browser → React Hook (useBrands, etc.)
  → fetch('/api/brands')
  → API Route Handler (src/app/api/brands/route.ts)
  → brandService.list()
  → Returns in-memory mock array
  → JSON Response → React Query cache → UI renders
```

### Auth Flow (Today)

```
Login Page → POST /api/auth/[...nextauth]
  → NextAuth Credentials provider
  → Match test credentials (dev mode): admin@stockiva.com / admin123
  → OR query Prisma DB for user + bcrypt verify
  → Issue JWT: { id, name, email, role, storeId }
  → Cookie set → useSession() reads it client-side
  → auth() reads it server-side
```

### Store Context Flow (Today)

```
DashboardLayout
  → StoreProvider(defaultStoreId=null)
    → AppLayout
      → Header: StoreSelector (admin only)
        → Fetch /api/stores → show dropdown
        → On select: setStore(id, name) → context updates
      → Sidebar: Menu items filtered by role
    → Content: Page components use useStore() for storeId
```

---

## 5. Solution: Organization-Based Multi-Tenancy

### Architecture: Shared Database, `orgId` Row-Level Isolation

Every data entity gets an `orgId` foreign key. Every database query includes `WHERE orgId = ?`. One shared PostgreSQL database on Neon, one Next.js deployment on Vercel.

**Why not separate databases per tenant?**

| Factor | Separate DB | Shared DB + orgId |
|---|---|---|
| Neon free tier | 1 database only | ✅ Works |
| Cost at 100 tenants | 100 databases = $$ | ✅ Same 1 DB |
| Migrations | Run on each DB separately | ✅ One migration, all tenants |
| Complexity | Separate Prisma clients, connection routing | ✅ One client, filter by orgId |
| Industry standard | Rare (enterprise-only) | ✅ Shopify, Slack, Notion, Linear |

### Data Hierarchy After Migration

```
Platform (Stockiva SaaS)
│
├── Platform Admin (SUPER_ADMIN) — sees all orgs, platform-wide analytics
│
├── Organization: "Rare Thread" ← Tenant boundary
│   ├── Owner: Shop Owner 1 (OWNER role)
│   ├── Stores
│   │   ├── "Rare Thread - MG Road"
│   │   └── "Rare Thread - Koregaon Park"
│   ├── Users: 1 Owner + 1 Admin + 3 Staff
│   ├── Categories: T-Shirts, Jeans, Shirts (private to Rare Thread)
│   ├── Brands: Nike, Adidas, Puma (private to Rare Thread)
│   ├── Products: 50 items (private, own SKUs)
│   ├── Suppliers: 3 suppliers (private)
│   └── Stock/Sales/POs → per store, within this org
│
├── Organization: "Fragrance" ← Separate tenant
│   ├── Owner: Shop Owner 2 (OWNER role) 
│   ├── Stores
│   │   ├── "Fragrance - Camp"
│   │   ├── "Fragrance - Baner"
│   │   └── "Fragrance - Hinjewadi"
│   ├── Users: 1 Owner + 2 Admins + 5 Staff
│   ├── Categories: Perfumes, Deodorants, Body Mists (private)
│   ├── Brands: Versace, Dior, Armani (private)
│   ├── Products: 80 items (private)
│   ├── Suppliers: 5 suppliers (private)
│   └── Stock/Sales/POs → per store, within this org
│
└── ... more orgs
```

**Complete isolation:** Rare Thread's OWNER/ADMIN sees ONLY Rare Thread's data. Fragrance's OWNER/ADMIN sees ONLY Fragrance's data. Same database, same app, same deployment — `WHERE orgId = ?` on every query.

### Org Registration Flow (First-Time Sign Up)

```
1. New user visits /register
2. Fills: Business Name, Owner Name, Email, Password
3. System creates (in ONE transaction):
   a. Organization { name: "Rare Thread", slug: "rare-thread" }
   b. User { name: "Owner Name", role: OWNER, orgId: <new-org-id> }
   c. Store { name: "Rare Thread - Main", code: "MAIN", orgId: <new-org-id> }
4. Auto-login → redirect to /dashboard
5. Owner is now OWNER of their org with a default store
```

---

## 6. Role Hierarchy

### Five-Level Hierarchy

```
SUPER_ADMIN  →  Platform level (Stockiva team)
    │
    ▼
  OWNER      →  Org level (Shop owner who created the org)
    │
    ▼
  ADMIN      →  Org level (Full control, delegated by Owner)
    │
    ▼
  MANAGER    →  Store level (Inventory + reports for assigned store)
    │
    ▼
  STAFF      →  Store level (Stock updates + viewing for assigned store)
```

### Permission Matrix

| Capability | SUPER_ADMIN | OWNER | ADMIN | MANAGER | STAFF |
|---|---|---|---|---|---|
| **Platform admin panel** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **View all organizations** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Impersonate org (support)** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Create/edit organization** | — | ✅ (own) | ❌ | ❌ | ❌ |
| **Billing/subscription** | — | ✅ | ❌ | ❌ | ❌ |
| **Delete organization** | ✅ | ✅ (own) | ❌ | ❌ | ❌ |
| **Manage stores (CRUD)** | — | ✅ | ✅ | ❌ | ❌ |
| **Invite/remove users** | — | ✅ | ✅ | ❌ | ❌ |
| **Assign ADMIN role** | — | ✅ | ❌ | ❌ | ❌ |
| **Assign MANAGER/STAFF roles** | — | ✅ | ✅ | ❌ | ❌ |
| **Manage categories/brands** | — | ✅ | ✅ | ❌ | ❌ |
| **Manage products** | — | ✅ | ✅ | ✅ | ❌ |
| **Manage suppliers** | — | ✅ | ✅ | ✅ | ❌ |
| **Manage purchase orders** | — | ✅ | ✅ | ✅ | ❌ |
| **View reports** | — | ✅ | ✅ | ✅ | ❌ |
| **Stock adjustments** | — | ✅ | ✅ | ✅ | ✅ |
| **View stock/products** | — | ✅ | ✅ | ✅ | ✅ |
| **Billing/POS** | — | ✅ | ✅ | ✅ | ✅ |
| **Barcode scan** | — | ✅ | ✅ | ✅ | ✅ |
| **Switch stores** | — | ✅ (all) | ✅ (all) | ❌ (assigned) | ❌ (assigned) |

### OWNER vs. ADMIN — Key Differences

| | OWNER | ADMIN |
|---|---|---|
| **Created by** | Self-registration (org creation) | Invited by OWNER |
| **Can be removed** | No (only by deleting org) | Yes, by OWNER |
| **Can promote to ADMIN** | ✅ | ❌ |
| **Org settings (name/logo/plan)** | ✅ | ❌ |
| **View subscription/billing** | ✅ | ❌ |
| **Delete organization** | ✅ | ❌ |
| **Uniqueness** | Exactly 1 per org | Multiple per org |

---

## 7. Platform Admin — Real-Time Monitoring

### How Platform Admin Works

The **SUPER_ADMIN** is a special role that exists **outside** the organization context. These are Stockiva platform operators (you and your team).

### Implementation Approach

```
Route Group: /admin/*  (completely separate from /dashboard/*)
  ├── /admin/login         → Platform admin login (separate from org login)
  ├── /admin/dashboard     → Platform KPIs, real-time metrics
  ├── /admin/organizations → List all orgs, search, filter
  ├── /admin/organizations/[id] → Org detail, usage, health
  └── /admin/users         → All platform users across orgs
```

### How It Works Technically

**Option A: Same DB, separate role check (Recommended for now)**
- SUPER_ADMIN users have `orgId = null` (platform-scoped, not org-scoped)
- Platform admin routes check `role === SUPER_ADMIN` — if not, redirect to regular dashboard
- Platform admin queries run WITHOUT `WHERE orgId = ?` — they see all data
- Simple, no extra infrastructure

**Option B: Separate admin app (Future, if needed)**
- A second Next.js app on a subdomain: `admin.stockiva.com`
- Connects to the same DB, has its own auth
- Better separation of concerns, but more deployment complexity

**Recommendation:** Start with Option A. It's one codebase, one deployment. Platform admin is just another route group with a role check. Move to Option B only if the admin panel grows significantly.

### Platform Admin Dashboard — What It Shows

```
┌─────────────────────────────────────────────────────────┐
│  Stockiva Platform Admin                                │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  KPI Cards:                                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │ Total    │ │ Active   │ │ Total    │ │ New Orgs │  │
│  │ Orgs: 47 │ │ Users:   │ │ Stores:  │ │ This     │  │
│  │          │ │ 234      │ │ 89       │ │ Month: 12│  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
│                                                         │
│  Organization List:                                     │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Name          │ Plan │ Stores │ Users │ Status  │   │
│  │───────────────│──────│────────│───────│─────────│   │
│  │ Rare Thread   │ PRO  │ 2      │ 5     │ Active  │   │
│  │ Fragrance     │ FREE │ 3      │ 6     │ Active  │   │
│  │ Urban Style   │ PRO  │ 4      │ 12    │ Active  │   │
│  │ Denim House   │ FREE │ 1      │ 2     │ Inactive│   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Charts:                                                │
│  - Org signups over time (line chart, weekly/monthly)   │
│  - Plan distribution (pie: FREE vs PRO vs ENTERPRISE)   │
│  - Active users per day (line chart)                    │
│  - Top orgs by product count, store count, sale volume  │
│                                                         │
│  Recent Activity Feed:                                  │
│  - "Rare Thread" added 2 new products (5 min ago)       │
│  - "Fragrance" created store "Hinjewadi" (1 hr ago)     │
│  - New org registered: "StyleHub" (2 hrs ago)           │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Real-Time Aspect

For the "real-time" feel without WebSockets (keeping complexity low):

1. **Polling with React Query** — `refetchInterval: 30_000` (every 30 seconds) on the admin dashboard. Good enough for an admin panel — you don't need millisecond updates.
2. **Server-Sent Events (SSE)** — Lightweight, one-direction real-time. Admin page opens a connection, server pushes events (new org, new sale, etc.). More responsive than polling, simpler than WebSockets.
3. **WebSockets** (Overkill for now) — Full duplex, real-time. Needed if you want a live activity feed that updates instantly. Adds complexity (need a WebSocket server or use a service like Pusher/Ably).

**Recommendation:** Start with **React Query polling** (refetch every 30s). It's zero-infrastructure, works with existing setup. If the admin panel needs live updates later, upgrade to SSE.

### Platform Admin Data Access

The platform admin queries are straightforward — just remove the `orgId` filter:

```
Regular API for "Rare Thread" admin:
  SELECT * FROM products WHERE org_id = 'rare-thread-id'

Platform Admin API:
  SELECT o.name, COUNT(p.id) as products, COUNT(u.id) as users
  FROM organizations o
  LEFT JOIN products p ON p.org_id = o.id
  LEFT JOIN users u ON u.org_id = o.id
  GROUP BY o.id
```

### Impersonation (Support Mode)

For customer support, the SUPER_ADMIN can "impersonate" an org:

1. Admin clicks "View as..." on an org
2. Session gets a temporary `impersonatingOrgId` 
3. All subsequent queries use `impersonatingOrgId` instead of `null`
4. Admin sees exactly what the org's OWNER sees
5. A banner shows "You are viewing as Rare Thread" with an "Exit" button
6. All actions are logged with `impersonatedBy: superAdminId`

This is a **future feature** — document it here, build it after core multi-tenancy works.

---

## 8. Schema Changes

### New Enums

```prisma
enum OrgPlan {
  FREE
  PRO
  ENTERPRISE
}

enum InvitationStatus {
  PENDING
  ACCEPTED
  EXPIRED
}
```

### Updated Enum: Role

```prisma
enum Role {
  SUPER_ADMIN    // ← NEW: Platform-level, Stockiva team
  OWNER          // ← NEW: Org-level, the shop owner
  ADMIN
  MANAGER
  STAFF
}
```

### New Model: Organization

```prisma
model Organization {
  id        String   @id @default(uuid())
  name      String                         // "Rare Thread"
  slug      String   @unique               // "rare-thread"
  logoUrl   String?
  plan      OrgPlan  @default(FREE)
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  users       User[]
  stores      Store[]
  categories  Category[]
  brands      Brand[]
  products    Product[]
  suppliers   Supplier[]
  invitations Invitation[]

  @@map("organizations")
}
```

### New Model: Invitation

```prisma
model Invitation {
  id        String           @id @default(uuid())
  orgId     String
  email     String
  role      Role             @default(STAFF)
  invitedBy String
  status    InvitationStatus @default(PENDING)
  token     String           @unique        // Secure random token for link
  expiresAt DateTime
  createdAt DateTime         @default(now())

  org     Organization @relation(fields: [orgId], references: [id])
  inviter User         @relation(fields: [invitedBy], references: [id])

  @@index([token])
  @@index([orgId])
  @@map("invitations")
}
```

### Modified Model: Store

```diff
model Store {
  id        String   @id @default(uuid())
+ orgId     String
  name      String
  code      String   @unique
  address   String?
  phone     String?
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

+ org            Organization    @relation(fields: [orgId], references: [id])
  users          User[]
  stockEntries   StockEntry[]
  stockMovements StockMovement[]
  purchaseOrders PurchaseOrder[]
  sales          Sale[]
  alertConfigs   AlertConfig[]

+ @@unique([code, orgId])       // Store code unique within org
+ @@index([orgId])
  @@map("stores")
}
```

> **Note:** `code` changes from `@unique` (globally) to `@@unique([code, orgId])` (unique per org). Two orgs can both have a store with code "MAIN".

### Modified Model: User

```diff
model User {
  id           String   @id @default(uuid())
+ orgId        String?                        // Null for SUPER_ADMIN
  name         String
  email        String   @unique
  passwordHash String
- role         Role     @default(STAFF)
+ role         Role     @default(STAFF)
  storeId      String?
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

+ org            Organization?   @relation(fields: [orgId], references: [id])
  store          Store?          @relation(fields: [storeId], references: [id])
  stockMovements StockMovement[]
  purchaseOrders PurchaseOrder[]
  sales          Sale[]
+ invitations    Invitation[]

+ @@index([orgId])
  @@map("users")
}
```

> **Note:** `orgId` is nullable because SUPER_ADMIN users belong to the platform, not an org.

### Modified Model: Category

```diff
model Category {
  id              String   @id @default(uuid())
+ orgId           String
- name            String   @unique
+ name            String
- slug            String   @unique
+ slug            String
  description     String?
  attributeSchema Json     @default("{}")
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

+ org          Organization @relation(fields: [orgId], references: [id])
  products     Product[]
  sizes        Size[]
  alertConfigs AlertConfig[]

+ @@unique([name, orgId])       // Category name unique within org
+ @@unique([slug, orgId])       // Slug unique within org
+ @@index([orgId])
  @@map("categories")
}
```

### Modified Model: Brand

```diff
model Brand {
  id        String   @id @default(uuid())
+ orgId     String
- name      String   @unique
+ name      String
  logoUrl   String?
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

+ org      Organization @relation(fields: [orgId], references: [id])
  products Product[]

+ @@unique([name, orgId])       // Brand name unique within org
+ @@index([orgId])
  @@map("brands")
}
```

### Modified Model: Product

```diff
model Product {
  id         String   @id @default(uuid())
+ orgId      String
  name       String
- sku        String   @unique
+ sku        String
  categoryId String
  brandId    String
  basePrice  Decimal  @db.Decimal(10, 2)
  costPrice  Decimal  @db.Decimal(10, 2)
  attributes Json     @default("{}")
  imageUrl   String?
  isActive   Boolean  @default(true)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

+ org                Organization         @relation(fields: [orgId], references: [id])
  category           Category             @relation(fields: [categoryId], references: [id])
  brand              Brand                @relation(fields: [brandId], references: [id])
  stockEntries       StockEntry[]
  stockMovements     StockMovement[]
  purchaseOrderItems PurchaseOrderItem[]
  saleItems          SaleItem[]

+ @@unique([sku, orgId])        // SKU unique within org
+ @@index([orgId])
  @@index([categoryId])
  @@index([brandId])
  @@index([sku])
  @@map("products")
}
```

### Modified Model: Supplier

```diff
model Supplier {
  id            String   @id @default(uuid())
+ orgId         String
  name          String
  contactPerson String?
  email         String?
  phone         String?
  address       String?
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

+ org            Organization    @relation(fields: [orgId], references: [id])
  purchaseOrders PurchaseOrder[]

+ @@index([orgId])
  @@map("suppliers")
}
```

### Unchanged Models (inherit org scope through Store or Category)

- **Size** — scoped through `Category.orgId`
- **StockEntry** — scoped through `Store.orgId`
- **StockMovement** — scoped through `Store.orgId`
- **PurchaseOrder** — scoped through `Store.orgId`
- **PurchaseOrderItem** — scoped through `PurchaseOrder`
- **Sale** — scoped through `Store.orgId`
- **SaleItem** — scoped through `Sale`
- **AlertConfig** — scoped through `Store.orgId`

---

## 9. Code Changes — File-by-File

### A. Schema & DB Layer

| File | Action | Details |
|---|---|---|
| `prisma/schema.prisma` | **MODIFY** | Add Organization, Invitation models. Add OrgPlan, InvitationStatus enums. Add SUPER_ADMIN, OWNER to Role enum. Add `orgId` to Store, User, Category, Brand, Product, Supplier. Update unique constraints. |
| `prisma/seed.ts` | **MODIFY** | Create default Organization first. Assign all stores, users, categories, brands, products, suppliers to that org. Create a SUPER_ADMIN user for platform admin. |
| `src/lib/db.ts` | No change | Prisma client singleton — works as-is |

### B. Auth & Session Layer

| File | Action | Details |
|---|---|---|
| `src/lib/auth.ts` | **MODIFY** | Add `orgId` to JWT callback (from user record). Update test credentials with `orgId`. Handle SUPER_ADMIN (orgId = null). For Google OAuth new users: trigger org creation flow. |
| `src/lib/auth.middleware.ts` | **MODIFY** | Add `orgId` to `AuthUser` type. Create `requireAuth()` — returns `{ user }` or throws 401. Create `requireOrgAuth()` — returns `{ user, orgId }` or throws 401 (rejects SUPER_ADMIN context). Create `requireSuperAdmin()` — returns `{ user }` or throws 403. |
| `src/types/next-auth.d.ts` | **MODIFY** | Add `orgId: string \| null` to Session.user and JWT type |
| `src/lib/store-context.ts` | **MODIFY** | Make `getDefaultStoreId()` org-aware — accept `orgId` param, return first store in that org |

### C. Type Definitions

| File | Action | Details |
|---|---|---|
| `src/shared/constants/roles.ts` | **MODIFY** | Add SUPER_ADMIN, OWNER to any role constants/helpers |
| `src/modules/brands/types.ts` | **MODIFY** | Add `orgId` to Brand type |
| `src/modules/categories/types.ts` | **MODIFY** | Add `orgId` to Category type |
| `src/modules/products/types.ts` | **MODIFY** | Add `orgId` to Product type |
| `src/modules/suppliers/types.ts` | **MODIFY** | Add `orgId` to Supplier type |
| `src/modules/stock/types.ts` | Minor/No change | StockLevelFilters already has `storeId` which implies org |
| `src/modules/alerts/types.ts` | Minor/No change | AlertConfig already has `storeId` |
| New: `src/modules/settings/types.ts` | **CREATE** | Organization, OrgFormValues, Invitation types |
| New: `src/modules/admin/types.ts` | **CREATE** | PlatformStats, OrgSummary types for platform admin |

### D. Service Layer (Replace Mock → Real Prisma)

| File | Action | Details |
|---|---|---|
| `src/modules/brands/services/brandService.ts` | **REWRITE** | Replace mock arrays with Prisma queries. All methods accept `orgId`, include `WHERE orgId = ?`. |
| `src/modules/categories/services/categoryService.ts` | **REWRITE** | Same — real Prisma, org-scoped |
| `src/modules/products/services/productService.ts` | **REWRITE** | Same — real Prisma, org-scoped |
| `src/modules/stock/services/stockService.ts` | **MODIFY** | Already has Prisma code. Ensure org boundary checks — verify store belongs to org before allowing mutations. |
| `src/modules/stock/services/mockStockService.ts` | **DELETE** | No longer needed |
| `src/modules/billing/services/billingService.ts` | **REWRITE** | Replace mock with real Prisma, org-scoped |
| New: `src/modules/settings/services/orgService.ts` | **CREATE** | CRUD for organizations, plan management |
| New: `src/modules/settings/services/invitationService.ts` | **CREATE** | Create/accept/revoke invitations |
| New: `src/modules/settings/services/storeService.ts` | **CREATE** | CRUD for stores within an org |
| New: `src/modules/admin/services/platformService.ts` | **CREATE** | Platform-wide stats, org list, user counts |

### E. API Routes

| File | Action | Details |
|---|---|---|
| `src/app/api/brands/route.ts` | **MODIFY** | Extract orgId from session, pass to brandService |
| `src/app/api/brands/[id]/route.ts` | **MODIFY** | Same + verify brand belongs to org before update/delete |
| `src/app/api/categories/route.ts` | **MODIFY** | Extract orgId, pass to categoryService |
| `src/app/api/categories/[id]/route.ts` | **MODIFY** | Same + org boundary check |
| `src/app/api/products/route.ts` | **MODIFY** | Extract orgId, pass to productService |
| `src/app/api/products/[id]/route.ts` | **MODIFY** | Same + org boundary check |
| `src/app/api/stock/route.ts` | **MODIFY** | Verify storeId belongs to user's org |
| `src/app/api/stock/movements/route.ts` | **MODIFY** | Same |
| `src/app/api/billing/route.ts` | **MODIFY** | Extract orgId, scope sales to org stores |
| `src/app/api/cron/reorder-check/route.ts` | **MODIFY** | Iterate per org (check all orgs' stock levels) |
| New: `src/app/api/auth/register/route.ts` | **CREATE** | Registration endpoint: create Org + Owner + default Store |
| New: `src/app/api/stores/route.ts` | **CREATE** | List/create stores for current org |
| New: `src/app/api/stores/[id]/route.ts` | **CREATE** | Get/update/delete store within org |
| New: `src/app/api/invitations/route.ts` | **CREATE** | Create/list invitations |
| New: `src/app/api/invitations/[token]/route.ts` | **CREATE** | Accept invitation |
| New: `src/app/api/admin/stats/route.ts` | **CREATE** | Platform KPIs (SUPER_ADMIN only) |
| New: `src/app/api/admin/organizations/route.ts` | **CREATE** | List all orgs (SUPER_ADMIN only) |
| New: `src/app/api/admin/organizations/[id]/route.ts` | **CREATE** | Org detail (SUPER_ADMIN only) |

### F. Frontend

| File | Action | Details |
|---|---|---|
| `src/providers/StoreProvider.tsx` | **MODIFY** | Add org context (orgId, orgName) or create separate OrgProvider |
| `src/modules/auth/hooks/useAuth.ts` | **MODIFY** | Expose `orgId` from session |
| `src/modules/layout/constants.ts` | **MODIFY** | Add OWNER, SUPER_ADMIN to role-based menu filtering. Add platform admin menu items. |
| `src/modules/layout/components/AppLayout.tsx` | **MODIFY** | Show org name in sidebar. Handle SUPER_ADMIN (redirect to /admin). |
| `src/modules/settings/components/StoreSelector.tsx` | **MODIFY** | Fetches only stores for current org (API handles this) |
| New: `src/app/(auth)/register/page.tsx` | **CREATE** | Registration page: org name, owner details |
| New: `src/app/(auth)/invite/[token]/page.tsx` | **CREATE** | Accept invitation page |
| New: `src/app/(dashboard)/dashboard/settings/team/page.tsx` | **CREATE** | Team management page |
| New: `src/app/(dashboard)/dashboard/settings/organization/page.tsx` | **CREATE** | Org settings page |
| New: `src/app/(admin)/layout.tsx` | **CREATE** | Platform admin layout |
| New: `src/app/(admin)/admin/page.tsx` | **CREATE** | Platform admin dashboard |
| New: `src/app/(admin)/admin/organizations/page.tsx` | **CREATE** | Org list for platform admin |
| New: `src/modules/admin/components/` | **CREATE** | Platform admin UI components |
| New: `src/modules/settings/components/TeamManagement.tsx` | **CREATE** | User list, invite, edit roles |
| New: `src/modules/settings/components/OrgSettings.tsx` | **CREATE** | Org name, logo, plan display |

---

## 10. Implementation Phases

### Phase 1: Schema & Seed (Foundation)

**Blocks everything else. Must be done first.**

- [ ] Add `OrgPlan`, `InvitationStatus` enums to schema
- [ ] Add `SUPER_ADMIN`, `OWNER` to `Role` enum
- [ ] Add `Organization` model
- [ ] Add `Invitation` model
- [ ] Add `orgId` to Store, User, Category, Brand, Product, Supplier
- [ ] Update unique constraints (scope to orgId)
- [ ] Add composite indexes
- [ ] Update `seed.ts` — create default Org, SUPER_ADMIN user, assign all data
- [ ] Run `prisma validate` → zero errors
- [ ] Run `prisma generate` → client generated

### Phase 2: Auth & Session (Security Backbone)

**Depends on Phase 1.**

- [ ] Update `next-auth.d.ts` — add `orgId` to types
- [ ] Update `auth.ts` — include `orgId` in JWT callback
- [ ] Update `auth.middleware.ts` — add `requireAuth()`, `requireOrgAuth()`, `requireSuperAdmin()`
- [ ] Update `store-context.ts` — org-aware default store
- [ ] Update `useAuth.ts` — expose `orgId`
- [ ] Update test credentials with `orgId`
- [ ] Update `roles.ts` — add SUPER_ADMIN, OWNER

### Phase 3: Service Layer — Replace Mock with Prisma

**Depends on Phase 1. Can parallel with Phase 2.**

- [ ] Rewrite `brandService.ts` — real Prisma, org-scoped
- [ ] Rewrite `categoryService.ts` — real Prisma, org-scoped
- [ ] Rewrite `productService.ts` — real Prisma, org-scoped
- [ ] Rewrite `billingService.ts` — real Prisma, org-scoped
- [ ] Update `stockService.ts` — add org boundary checks
- [ ] Delete `mockStockService.ts`
- [ ] Create `orgService.ts`
- [ ] Create `invitationService.ts`
- [ ] Create `storeService.ts`

### Phase 4: API Route Security

**Depends on Phases 2 & 3.**

- [ ] Update all existing API routes — extract orgId, pass to services
- [ ] Add org boundary checks (entity belongs to org before update/delete)
- [ ] Create registration endpoint (`/api/auth/register`)
- [ ] Create store CRUD endpoints
- [ ] Create invitation endpoints
- [ ] Cross-org access returns 404 (not 403)

### Phase 5: Frontend — Org Awareness

**Depends on Phase 2. Parallel with Phases 3-4.**

- [ ] Update StoreProvider — add org context
- [ ] Update AppLayout — show org name
- [ ] Update menu items — OWNER, SUPER_ADMIN roles
- [ ] Create registration page
- [ ] Create invitation accept page
- [ ] Create org settings page
- [ ] Create team management page

### Phase 6: Platform Admin Panel

**Depends on Phases 1-4.**

- [ ] Create platform admin layout and route group
- [ ] Create platform admin dashboard
- [ ] Create org list page
- [ ] Create org detail page
- [ ] Create `platformService.ts` for platform-wide queries
- [ ] Create platform admin API routes (SUPER_ADMIN only)

### Phase 7: Onboarding & Invitation Flow

**Depends on Phases 4-5.**

- [ ] Complete registration flow (create Org + Owner + Store in transaction)
- [ ] Email integration for invitations (Resend)
- [ ] Invitation accept flow (set password → join org)
- [ ] First-time setup wizard (optional: add first products/categories)

---

## 11. Verification Checklist

### Schema Verification
- [ ] `npx prisma validate` — zero errors
- [ ] `npx prisma generate` — client generated successfully
- [ ] `npx prisma db push` (or migrate) — tables created in NeonDB
- [ ] `npx prisma db seed` — seed data created with proper org links

### Tenant Isolation Verification
- [ ] Create 2 test orgs via seed (Org A and Org B)
- [ ] Login as Org A OWNER → see ONLY Org A's categories, brands, products, suppliers, stores
- [ ] Login as Org B OWNER → see ONLY Org B's data
- [ ] Attempt to GET `/api/brands/<org-b-brand-id>` while logged in as Org A → 404
- [ ] Attempt to PUT `/api/products/<org-b-product-id>` while logged in as Org A → 404
- [ ] Attempt to DELETE `/api/categories/<org-b-cat-id>` while logged in as Org A → 404

### Role Verification
- [ ] SUPER_ADMIN can access `/admin/*` routes → ✅
- [ ] Regular OWNER/ADMIN cannot access `/admin/*` → redirect to `/dashboard`
- [ ] OWNER can invite ADMIN → ✅
- [ ] ADMIN cannot invite OWNER → ❌ blocked
- [ ] STAFF cannot manage categories/brands → ❌ blocked
- [ ] MANAGER can manage products → ✅

### Auth Verification
- [ ] New user register → org, owner, store created in one transaction
- [ ] Login → JWT contains `orgId`
- [ ] All API routes reject requests without valid session → 401
- [ ] Google OAuth → connects to existing user or triggers org creation

### Build Verification
- [ ] `npm run build` — zero TypeScript errors
- [ ] `npm run lint` — zero lint errors
- [ ] All pages render without hydration errors

---

## 12. Key Decisions

| # | Decision | Rationale |
|---|---|---|
| 1 | **Shared DB + `orgId` row isolation** | Cost-effective, industry standard, Neon free tier = 1 DB |
| 2 | **Organization = tenant boundary** | Maps to real-world "shop owner / business" concept |
| 3 | **Private catalog per org** | Each org has completely independent categories, brands, products, suppliers — no sharing |
| 4 | **OWNER role distinct from ADMIN** | Owner created the org and owns the subscription. Admin is delegated full control. Only Owner can promote to Admin or delete org. |
| 5 | **SUPER_ADMIN for platform ops** | Exists outside org context (orgId = null), can view all orgs, platform-wide analytics |
| 6 | **Platform admin as route group, not separate app** | One codebase, one deployment. Simple role check for `/admin/*` routes. |
| 7 | **Invitation-based team onboarding** | Owner/Admin invites staff by email. No open registration to existing org. Prevents unauthorized access. |
| 8 | **First user self-registers → becomes OWNER** | Org creation + owner + default store in one transaction. Simplest onboarding UX. |
| 9 | **Replace mock services during this migration** | Building real DB layer anyway — no point maintaining mock and real in parallel |
| 10 | **React Query polling for platform admin** | 30s refetch interval. Zero infrastructure, works today. SSE/WebSocket only if needed later. |
| 11 | **Cross-org access returns 404, not 403** | Prevents enumeration — attacker can't tell if resource exists in another org |

---

## 13. Future Business Scenarios (Todo Backlog)

_To be implemented after core multi-tenancy is complete and stable._

| # | Scenario | Business Value | Priority |
|---|---|---|---|
| 1 | **Subscription Plans & Limits** | Monetization: Free (1 store, 100 products), Pro (5 stores, unlimited), Enterprise (custom) | High |
| 2 | **Inter-Store Transfers** | Move stock from Store A → Store B within same org. New movement type: TRANSFER | High |
| 3 | **Org-Level Dashboard** | Aggregate KPIs across all stores in an org (total revenue, total stock value) | High |
| 4 | **Data Export (CSV/Excel)** | Export products, stock, sales per org. Essential for accountants | High |
| 5 | **Activity/Audit Log** | Track who did what across the org (login, stock changes, PO approvals) | Medium |
| 6 | **Customer Database (CRM-lite)** | Track repeat customers per org, purchase history, loyalty | Medium |
| 7 | **Tax Configuration per Org** | GST/VAT rates based on org's region | Medium |
| 8 | **Custom Branding per Org** | Logo, color theme, invoice header customization | Medium |
| 9 | **Accountant Role (Read-Only)** | View reports + billing, cannot modify inventory | Medium |
| 10 | **Discount/Coupon Engine** | Org-level promotions, seasonal sales | Medium |
| 11 | **Notifications Center** | In-app notifications for low stock, PO status, sale refunds | Medium |
| 12 | **Expiry/Batch Tracking** | For perishable goods (fragrance has shelf life) | Medium |
| 13 | **Staff Shift Management** | Track who's on duty at which store, when | Low |
| 14 | **Analytics & Advanced Reports** | Sell-through rate, dead stock, profit margins, YoY comparison | Low |
| 15 | **API Keys for Integrations** | Connect Tally, Shopify, WooCommerce | Low |
| 16 | **Multi-Currency Support** | For orgs in different countries | Low |
| 17 | **White-Label / Custom Domain** | rare-thread.stockiva.com | Low |
| 18 | **Mobile App / PWA** | Staff scan barcodes from mobile | Low |
| 19 | **Supplier Portal** | Read-only supplier login to check PO status | Low |
| 20 | **Platform Admin — Impersonation** | SUPER_ADMIN can "View as..." any org for support | Low |

---

> **Next Step:** Once this plan is approved, we begin with **Phase 1: Schema & Seed** — updating `prisma/schema.prisma` and `prisma/seed.ts`.
