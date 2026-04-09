# Platform Admin — Redesign & Feature Roadmap

## Current State

Two tabs exist:
- **Dashboard** — 4 KPI cards (Total Orgs, Active Users, Total Stores, New Orgs This Month) + top 10 orgs table
- **Organizations** — searchable, sortable, filterable list with detail view per org (users + stores)

Missing: plan management, org actions (suspend/upgrade), platform-wide user control, analytics, audit log, feature flags, announcements.

---

## Tab 1: Dashboard (Enhance existing)

### Additional KPI Cards
| Card | Data Source |
|---|---|
| MRR / Plan Revenue | `plan × count × monthly price` |
| Churned Orgs | `isActive=false` orgs created before this month |
| Sales Volume (Today / Week) | `Sale` table aggregated across all orgs |
| Platform-wide Low Stock Alerts | `AlertConfig` + `StockEntry` threshold check |

### Existing KPIs to keep
- Total Organizations
- Active Users
- Total Stores
- New Orgs This Month

---

## Tab 2: Organizations (Enhance existing)

### List Page enhancements
- Filter by Status (Active / Inactive) — already have `isActive`
- Show Last Activity column (last sale date or last user login)
- Bulk actions: suspend multiple, change plan for multiple

### Detail Page enhancements
| Action | What happens |
|---|---|
| **Suspend / Activate** | Toggle `org.isActive` — already in schema, no API yet |
| **Upgrade / Downgrade Plan** | Change `org.plan` (FREE → PRO → ENTERPRISE) |
| **Sales snapshot** | Total revenue + transaction count for that org |
| **Last Active** | Timestamp of last `Sale` or `User` login for that org |

---

## Tab 3: 💰 Pricing Plans (New — highest priority)

### Plan Definitions Sub-section
Manage plan policies from the admin UI instead of hardcoding:

| Field | Type | Description |
|---|---|---|
| Name | string | FREE, PRO, ENTERPRISE (or custom) |
| Price / month | decimal | Monthly charge |
| Max Users | int | Enforced user limit per org |
| Max Stores | int | Enforced store limit per org |
| Max Products | int | Enforced product limit per org |
| Features | JSON | Flags: { promoCodesEnabled, purchaseOrdersEnabled, barcodeEnabled, reportsEnabled, apiAccessEnabled } |

### Plan Assignments Sub-section
- Table of all orgs with their current plan
- Bulk upgrade/downgrade action
- Filter: show all FREE orgs that have > X users (upgrade candidates)

### Schema addition needed
```prisma
model PlanDefinition {
  id          String   @id @default(cuid())
  name        String   @unique   // "FREE" | "PRO" | "ENTERPRISE"
  priceMonthly Decimal @default(0)
  maxUsers    Int      @default(5)
  maxStores   Int      @default(1)
  maxProducts Int      @default(100)
  features    Json     @default("{}")
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

---

## Tab 4: 👥 Platform Users (New)

Platform-wide user view across all organizations.

### Columns
- Name + Email
- Organization name (linked)
- Role (color-coded)
- Status (Active / Inactive)
- Created date

### Actions per user
- Deactivate / Reactivate account (abuse prevention)
- Force password reset (sends reset email)
- View their org detail

### API needed
- `GET /api/admin/users` — list all users with org info, paginated, searchable
- `PATCH /api/admin/users/[id]` — update `isActive`
- `POST /api/admin/users/[id]/reset-password` — trigger reset email

---

## Tab 5: 📊 Analytics (New)

Business intelligence for platform health.

### Charts / Metrics
| Metric | Visualization |
|---|---|
| Signups over time | Line chart (daily/weekly/monthly) |
| Plan distribution over time | Stacked area / bar chart |
| Most active orgs by revenue | Ranked bar chart |
| Org retention | % of orgs from 30/60/90 days ago still active |
| Top products sold platform-wide | Leaderboard table |
| Revenue by payment method | Pie chart (CASH / CARD / UPI) |

### API needed
- `GET /api/admin/analytics?period=30d` — aggregated time-series stats

---

## Tab 6: 📋 Audit Log (New)

Every significant platform-level action logged with context.

### Events to track
- Org created / suspended / plan changed
- Super admin login / logout
- Super admin viewed org detail
- User deactivated / reactivated by super admin
- Plan definition created / edited

### Schema addition needed
```prisma
model AdminAuditLog {
  id           String   @id @default(cuid())
  action       String   // "ORG_SUSPENDED" | "PLAN_CHANGED" | "USER_DEACTIVATED" | ...
  targetType   String   // "Organization" | "User" | "PlanDefinition"
  targetId     String
  performedBy  String   // super admin user id
  metadata     Json?    // e.g. { oldPlan: "FREE", newPlan: "PRO" }
  createdAt    DateTime @default(now())

  @@map("admin_audit_logs")
}
```

---

## Tab 7: 🚩 Feature Flags (New)

Per-org feature toggles without a code deploy.

### Use cases
- Enable beta features for a specific org
- Disable billing module for trial orgs
- Turn off promo codes or purchase orders for FREE plan orgs
- Grant early access to an org before wide release

### Schema addition needed
```prisma
model FeatureFlag {
  id        String   @id @default(cuid())
  orgId     String?  // null = global default (applies to all orgs)
  key       String   // e.g. "promoCodesEnabled", "purchaseOrdersEnabled"
  value     Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  org       Organization? @relation(fields: [orgId], references: [id])

  @@unique([orgId, key])
  @@map("feature_flags")
}
```

---

## Tab 8: 📣 Announcements (New)

Platform-wide notices displayed to logged-in users.

### Fields
| Field | Type | Description |
|---|---|---|
| Title | string | Short headline |
| Body | string | Full message (supports markdown) |
| Severity | enum | INFO / WARNING / CRITICAL |
| Target Plan | enum / null | null = all plans, or specific plan tier |
| Active From | DateTime | When to start showing |
| Active Until | DateTime | When to stop showing (null = permanent) |

### Schema addition needed
```prisma
model Announcement {
  id          String    @id @default(cuid())
  title       String
  body        String
  severity    String    @default("INFO")  // "INFO" | "WARNING" | "CRITICAL"
  targetPlan  String?   // null = all plans
  activeFrom  DateTime  @default(now())
  activeUntil DateTime?
  createdBy   String    // super admin user id
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@map("announcements")
}
```

---

## Build Priority

| Priority | Feature | Reason |
|---|---|---|
| 🔴 P1 | **Pricing Plans** tab | No monetization control without plan definitions |
| 🔴 P1 | **Org actions** — suspend + upgrade plan | Can't manage customers without basic controls |
| 🟡 P2 | **Platform Users** tab | Support & abuse prevention from day one |
| 🟡 P2 | **Analytics** tab | Need visibility to know if product is growing |
| 🟢 P3 | **Audit Log** | Compliance, debugging production issues |
| 🟢 P3 | **Feature Flags** | Needed once you have paying customers on different plans |
| 🟢 P4 | **Announcements** | Good UX, but not blocking anything |

---

## Summary of Schema Additions

| Model | Purpose |
|---|---|
| `PlanDefinition` | Store plan policies (price, limits, features) |
| `AdminAuditLog` | Track all super admin actions |
| `FeatureFlag` | Per-org or global feature toggles |
| `Announcement` | Platform-wide notices to users |
