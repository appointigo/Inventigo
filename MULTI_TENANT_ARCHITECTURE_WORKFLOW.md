# Multi-Tenant Architecture Workflow

> **Inventigo** — Inventory management platform where each business (organisation) is completely isolated from all others. One database, many tenants — all separation enforced in code.

---

## Table of Contents

1. [System Architecture Overview](#1-system-architecture-overview)
2. [Role Model](#2-role-model)
3. [User Journey: Registering a New Business](#3-user-journey-registering-a-new-business)
4. [User Journey: Logging In & Dashboard Access](#4-user-journey-logging-in--dashboard-access)
5. [User Journey: Inviting Team Members](#5-user-journey-inviting-team-members)
6. [User Journey: Managing Inventory](#6-user-journey-managing-inventory)
7. [User Journey: Platform Admin (SUPER_ADMIN)](#7-user-journey-platform-admin-super_admin)
8. [Code Flow: Request Lifecycle](#8-code-flow-request-lifecycle)
9. [Tenant Isolation — How It Works](#9-tenant-isolation--how-it-works)
10. [Role-Based Access Matrix](#10-role-based-access-matrix)
11. [Verification Checklist](#11-verification-checklist)

---

## 1. System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      Single Next.js App                         │
│                                                                  │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐ │
│   │  Org A      │    │  Org B      │    │  SUPER_ADMIN        │ │
│   │ "Rare Thread│    │"Scent &Soul"│    │  /admin panel       │ │
│   │  /dashboard"│    │  /dashboard"│    │  (platform-wide)    │ │
│   └──────┬──────┘    └──────┬──────┘    └──────────┬──────────┘ │
│          │                  │                       │            │
│          └──────────────────┴───────────────────────┘           │
│                             │                                    │
│              ┌──────────────▼──────────────┐                    │
│              │     Auth Middleware          │                    │
│              │  (orgId injected per request)│                    │
│              └──────────────┬──────────────┘                    │
│                             │                                    │
│              ┌──────────────▼──────────────┐                    │
│              │      Shared Database         │                    │
│              │  (orgId column on every table│                    │
│              │   — data siloed by orgId)    │                    │
│              └─────────────────────────────┘                    │
└─────────────────────────────────────────────────────────────────┘
```

**Key design choices:**

| Concern | Approach |
|---|---|
| Tenant isolation | Every DB query/service receives `orgId` from session — never from client request |
| Single schema | One PostgreSQL database, `orgId` FK on every table |
| SUPER_ADMIN | Has `orgId = null` — accesses `/admin` route group, cannot access /dashboard |
| Session | NextAuth JWT stores `id`, `role`, `orgId`, `storeId` |
| Mock layer | `mock-org-store.ts` — in-memory per-org data; serves as DB substitute in dev |

---

## 2. Role Model

```
SUPER_ADMIN  (platform staff — Inventigo employees)
    │
    └── Can view ALL orgs, impersonate, manage billing plans
        Redirected to /admin on login, blocked from /dashboard

OWNER  (business creator — registered via /register)
    │
    ├── Full access to own org (products, stock, billing, settings)
    ├── Can invite ADMIN, MANAGER, STAFF to own org
    └── Can see "Org Settings", "Team Management", "Billing" in nav

ADMIN  (senior staff — invited by OWNER)
    │
    ├── Full inventory management (products, brands, categories, stock)
    └── Can manage users within own org, see settings tabs

MANAGER  (mid-level — invited by OWNER/ADMIN)
    │
    ├── Can manage products, stock, purchase orders
    └── Cannot manage users or org-level settings

STAFF  (floor staff — invited by any higher role)
    │
    ├── Read-only on products/stock, can scan barcodes
    └── Cannot see Settings / Billing / Team Management in nav
```

---

## 3. User Journey: Registering a New Business

### UI Path: `/register`

```
1. User navigates to /register
2. Fills in:
     - Full name
     - Email address
     - Password
     - Organisation name  (e.g. "Rare Thread")
     - Organisation slug  (auto-generated, e.g. "rare-thread")
3. Submits form → POST /api/auth/register
```

### What happens server-side (`POST /api/auth/register`):

```
Request body: { name, email, password, orgName, orgSlug }
                           │
                           ▼
          1. Hash password with bcrypt (10 rounds)
          2. Generate new orgId (UUID)
          3. Create Org record  { id: orgId, name, slug, plan: "STARTER" }
          4. Create Store record { orgId, name: "${orgName} Main Store" }
          5. Create User record  { orgId, role: "OWNER", password: hash }
          6. Return 201 { userId, orgId }
                           │
                           ▼
          Client: auto-signs in via NextAuth signIn("credentials")
          → Session JWT includes: { id, role: "OWNER", orgId, storeId }
          → Redirect to /dashboard/dashboard
```

### After registration — what the OWNER sees:

- Empty dashboard (no products yet)
- Navigation with all OWNER-level items including "Org Settings" and "Team Management"
- Prompted to add categories → brands → products to get started

---

## 4. User Journey: Logging In & Dashboard Access

### UI Path: `/login`

```
1. User enters email + password
2. POST to NextAuth /api/auth/signin (CredentialsProvider)
3. Server looks up user:
     a. First tries TEST_USERS (dev hardcoded users)
     b. Then queries Prisma DB (production)
4. bcrypt.compare(password, user.password)
5. If valid → JWT signed with { id, name, email, role, orgId, storeId }
6. Redirect based on role:
     - SUPER_ADMIN  → /admin
     - All others   → /dashboard/dashboard
```

### Session shape (JWT):

```ts
{
  user: {
    id: string,
    name: string,
    email: string,
    role: "SUPER_ADMIN" | "OWNER" | "ADMIN" | "MANAGER" | "STAFF",
    orgId: string | null,   // null for SUPER_ADMIN
    storeId: string | null,
  }
}
```

### AppLayout & navigation:

- `modules/layout/components/AppLayout.tsx` reads session on mount
- `StoreProvider` wraps the dashboard; reads `orgId` from session
- Navigation items in `modules/layout/constants.ts` are filtered by role:
  - OWNER → sees Org Settings, Team Management, Billing
  - STAFF → sees reduced nav (no admin items)
- SUPER_ADMIN is redirected to `/admin` before reaching AppLayout

---

## 5. User Journey: Inviting Team Members

### UI Path: Dashboard → Team Management (`/dashboard/settings/team`)

#### Step 1 — OWNER/ADMIN sends invite

```
1. Navigate to Team Management page
2. Click "Invite Member"
3. Enter: email address, select role (ADMIN/MANAGER/STAFF)
4. Submit → POST /api/invitations
```

#### What happens server-side (`POST /api/invitations`):

```
Request: { email, role }  (+ session: orgId extracted from JWT, never from body)
                │
                ▼
   1. requireOrgAuth() → confirms caller has orgId
   2. requireRole("OWNER", "ADMIN") → only OWNER/ADMIN can invite
   3. Generate signed token (UUID or JWT with expiry)
   4. Store InvitationRecord { orgId, email, role, token, expiresAt }
   5. Send email via Resend: "You're invited to {orgName} — accept here: /invite?token=..."
   6. Return 201 { invitationId }
```

#### Step 2 — Recipient accepts invite

```
1. Recipient clicks email link → /invite?token=<token>
2. Page shows: orgName, invited role
3. User fills in: name, password
4. Submit → POST /api/invitations/accept
     body: { token, name, password }
```

#### What happens server-side (`POST /api/invitations/accept`):

```
1. Look up invitation by token
2. Verify: token not expired, not already used
3. Create User { orgId: invitation.orgId, role: invitation.role, ... }
4. Mark invitation as accepted
5. Return 201 → client auto-signs in → redirect to /dashboard/dashboard
```

#### What the new user sees:

- They land in the dashboard of the organisation they were invited to
- Their `orgId` in the JWT matches the inviting org — they see only that org's data
- Nav items are filtered by their role

---

## 6. User Journey: Managing Inventory

### 6A. Adding Categories

```
Dashboard → Categories → "Add Category"
   │
   ▼
CategoryForm:
  - Name & description
  - Sizes (add/remove size labels, e.g. S/M/L or 28/30/32)
  - Attribute Schema Builder (define custom fields):
      field name → type (text/number/select) → options (if select) → required?

POST /api/categories  →  categoryService.create(orgId, values)
                                  │
                                  ▼
                        Stored with orgId — invisible to other orgs
```

### 6B. Adding Brands

```
Dashboard → Brands → "Add Brand"
   │
   ▼
BrandForm:
  - Name
  - Logo (Upload component → POST /api/upload → Vercel Blob CDN → logoUrl)
  - Active toggle

POST /api/brands  →  brandService.create(orgId, values)
```

### 6C. Adding Products (multi-step form)

```
Dashboard → Products → "Add Product"
   │
   ▼
ProductForm — 3 steps:

  Step 1: Basic Info
    ├── Product Name
    ├── Brand (Select — only shows org's brands)
    ├── Category (Select — only shows org's categories)
    ├── SKU (auto-generated from Brand + Category, or manual)
    ├── External Barcode (optional EAN-13/UPC-A)
    ├── Selling Price (₹) + Cost Price (₹)
    ├── Product Image (Upload → /api/upload → Vercel Blob → imageUrl stored in form)
    └── Active toggle

  Step 2: Dynamic Attributes
    └── Fields dynamically rendered from selected category's attributeSchema
        (e.g. for T-Shirts: Sleeve Type, Neck Type, Color)

  Step 3: Select Sizes
    └── Multi-select from selected category's sizes
        (e.g. S / M / L / XL for T-Shirts)

Submit → POST /api/products  →  productService.create(orgId, values)
```

### 6D. Image Upload Flow (detail)

```
User selects image file in Upload widget
         │
         ▼
@vercel/blob/client upload(filename, file, { handleUploadUrl: "/api/upload" })
         │
         ├── Step 1: POST /api/upload  { action: "generateClientTokenFromReadWriteToken" }
         │   └── Server: requireOrgAuth() → handleUpload() → returns signed token
         │
         ├── Step 2: Client uploads directly to Vercel Blob CDN using signed token
         │
         └── Step 3: Returns { url: "https://<hash>.public.blob.vercel-storage.com/..." }
                      │
                      └── form.setFieldValue("imageUrl", blob.url)
                          → Image preview renders below upload button
                          → submitted with form on Step 3 completion
```

### 6E. Updating a Product (image replacement)

```
Edit Product → change image → upload new image
         │
         ▼
PUT /api/products/:id  →  productService.update(orgId, id, values)
         │
         ├── If values.imageUrl differs from existing.imageUrl:
         │   └── imageService.delete(existing.imageUrl)
         │       → DELETE to Vercel Blob CDN (old image cleaned up)
         │
         └── existing.imageUrl = new blob URL
```

### 6F. Stock Management

```
Dashboard → Stock
  ├── View current stock levels per product per size per store
  ├── Adjust stock:
  │     StockAdjustmentModal → reason (recount/damaged/received/other) + quantity
  │     POST /api/stock  →  stockService.adjustStock()
  │     └── Atomic: updates StockEntry + creates StockMovement record
  └── View movement history → /stock/movements
```

---

## 7. User Journey: Platform Admin (SUPER_ADMIN)

### Login

```
superadmin@inventigo.com → /login → JWT: { role: "SUPER_ADMIN", orgId: null }
    │
    ▼
middleware.ts: detects SUPER_ADMIN → redirects to /admin
    │
    ▼
/app/(admin)/layout.tsx → Admin layout (separate from dashboard layout)
```

### Admin Pages

```
/admin                     → Platform overview: org count, user count, revenue summary
/admin/organisations       → All orgs: name, plan, user count, status, created date
/admin/organisations/:id   → Org detail: users, stores, settings
/admin/users               → All users across all orgs (searchable)
```

### What SUPER_ADMIN CANNOT do

- Access `/dashboard/*` — middleware blocks it
- See individual org's inventory (products, stock) — `platformService` only returns aggregate summaries
- The SUPER_ADMIN session has `orgId = null`, so any `requireOrgAuth()` call in the dashboard API routes returns `403`

---

## 8. Code Flow: Request Lifecycle

### Example: `GET /api/products` (fetching product list)

```
Browser (Org A session) → GET /api/products
                │
                ▼
  middleware.ts
    └── Checks NextAuth session via auth()
    └── No session? → redirect to /login
    └── SUPER_ADMIN + /dashboard path? → redirect to /admin
    └── Pass through to route handler
                │
                ▼
  app/api/products/route.ts  GET handler
    └── requireOrgAuth()
           └── getAuthUser()  →  session.user.orgId  =  "test-org-001"
           └── orgId is non-null → authorized
           └── Returns AuthUser { id, role, orgId: "test-org-001", ... }
                │
                ▼
  productService.list("test-org-001", filters)
    └── getOrgData("test-org-001")
           └── Returns mock store for this orgId only
           └── filters applied within orgId scope
    └── Returns Product[]  (ONLY Org A products)
                │
                ▼
  NextResponse.json({ data: products })
                │
                ▼
  Browser renders Org A product table ✅
```

### If Org B user manually calls `GET /api/products`:

```
Browser (Org B session "test-org-002") → GET /api/products
    │
    ▼
requireOrgAuth() → orgId = "test-org-002"  (from JWT, NOT from request)
    │
    ▼
productService.list("test-org-002", filters)
    └── getOrgData("test-org-002") → returns ONLY Org B products
    └── Org A products never loaded ✅
```

**The `orgId` always comes from the server-side JWT session — never from the request body or query string.**

---

## 9. Tenant Isolation — How It Works

### Database layer (Prisma / production)

Every table has `orgId`:

```sql
-- Example: products table
SELECT * FROM "Product"
WHERE "orgId" = $1   -- $1 is session.orgId, injected by service layer
```

### Mock layer (development)

`src/lib/mock-org-store.ts` maintains a `Map<orgId, OrgData>`:

```ts
const ORG_STORE = new Map<string, OrgData>();

export function getOrgData(orgId: string): OrgData {
  if (!ORG_STORE.has(orgId)) {
    ORG_STORE.set(orgId, deepClone(DEFAULT_SEED));  // each org starts with same seed
  }
  return ORG_STORE.get(orgId)!;
}
```

All service functions (`productService`, `brandService`, `categoryService`, etc.) receive `orgId` as the first argument and call `getOrgData(orgId)` — never accessing other orgs' data.

### What prevents ID guessing attacks?

- `orgId` is read from the **server-side JWT** in `requireOrgAuth()`
- Even if a client sends `{ orgId: "someone-elses-org" }` in the request body, it's **ignored**
- The session `orgId` is set at login time and signed — it cannot be tampered with client-side

---

## 10. Role-Based Access Matrix

| Feature | SUPER_ADMIN | OWNER | ADMIN | MANAGER | STAFF |
|---|:---:|:---:|:---:|:---:|:---:|
| Dashboard KPIs | ✅ (platform) | ✅ | ✅ | ✅ | ✅ |
| View products | ✅ (all orgs) | ✅ | ✅ | ✅ | ✅ |
| Create/edit products | ✗ | ✅ | ✅ | ✅ | ✗ |
| Delete products | ✗ | ✅ | ✅ | ✗ | ✗ |
| Upload product images | ✗ | ✅ | ✅ | ✅ | ✗ |
| Manage stock | ✗ | ✅ | ✅ | ✅ | ✗ |
| Scan barcode | ✗ | ✅ | ✅ | ✅ | ✅ |
| Manage brands | ✗ | ✅ | ✅ | ✗ | ✗ |
| Manage categories | ✗ | ✅ | ✅ | ✗ | ✗ |
| Invite team members | ✗ | ✅ | ✅ | ✗ | ✗ |
| Org Settings | ✗ | ✅ | ✗ | ✗ | ✗ |
| Team Management | ✗ | ✅ | ✗ | ✗ | ✗ |
| Billing | ✗ | ✅ | ✗ | ✗ | ✗ |
| Platform Admin (/admin) | ✅ | ✗ | ✗ | ✗ | ✗ |
| View all orgs | ✅ | ✗ | ✗ | ✗ | ✗ |

---

## 11. Verification Checklist

Full test scenarios are in `src/lib/mockData/`. Use these credentials:

### Org A — Rare Thread (clothing/apparel)

| Email | Password | Role |
|---|---|---|
| `owner@stockiva.com` | `owner123` | OWNER |
| `admin@stockiva.com` | `admin123` | ADMIN |
| `staff@stockiva.com` | `staff123` | STAFF |

> **Note:** Production will have `owner@rarethread.com` etc. See `src/lib/mockData/orgA-data.ts` for the full intended user set.

### Org B — Scent & Soul (fragrance) — to be seeded

| Email | Password | Role |
|---|---|---|
| `owner@scentandsoul.com` | `password` | OWNER |
| `staff@scentandsoul.com` | `password` | STAFF |

### Platform Admin

| Email | Password | Role |
|---|---|---|
| `superadmin@stockiva.com` | `superadmin123` | SUPER_ADMIN |

### Scenarios to test manually

1. **Login as Org A OWNER** → see clothing products, brands (Nike/Adidas/Puma), categories (T-Shirts/Jeans)
2. **Login as Org B** → see ONLY fragrance products — zero clothing items
3. **Login as STAFF (either org)** → Org Settings / Team / Billing NOT in nav
4. **Login as SUPER_ADMIN** → redirected to `/admin`, not `/dashboard/dashboard`
5. **Upload product image** → pick a file → Vercel Blob URL stored → thumbnail shown
6. **Update product with new image** → old Vercel Blob image is deleted automatically
7. **Send invite (OWNER)** → token generated → accept at `/invite?token=...` → new user joins org
8. **New user after invite** → lands in inviting org's dashboard with correct role restrictions
9. **Cross-tenant API call** → log in as Org A, then call `/api/brands` → returns ONLY Org A brands
10. **Org registration** → `/register` → creates new isolated org with its own empty dataset

---

## 12. File Reference

| File | Purpose |
|---|---|
| `src/lib/auth.ts` | NextAuth config — JWT, session, test credentials |
| `src/lib/auth.middleware.ts` | `requireOrgAuth()`, `requireSuperAdmin()`, `requireRole()` |
| `src/lib/mock-org-store.ts` | In-memory per-org data store (dev substitute for Prisma) |
| `src/lib/mockData/` | Multi-tenant test fixtures and verification checklists |
| `src/providers/StoreProvider.tsx` | React context — current org/store for client components |
| `src/modules/layout/components/AppLayout.tsx` | Sidebar nav with role-based item filtering |
| `src/modules/layout/constants.ts` | Nav items with `roles` arrays for filtering |
| `src/app/(dashboard)/layout.tsx` | Dashboard route group — wraps with AppLayout |
| `src/app/(admin)/layout.tsx` | Admin route group — separate layout for SUPER_ADMIN |
| `src/app/api/upload/route.ts` | Vercel Blob client upload handler — auth-gated |
| `src/shared/services/imageService.ts` | Vercel Blob abstraction (upload + delete) |
| `src/modules/products/services/productService.ts` | Product CRUD — orgId-scoped, deletes old images on update |
| `prisma/schema.prisma` | Full multi-tenant schema with `orgId` on every table |
| `prisma/seed.ts` | Seeds one org, one store, sample users, categories, products |
