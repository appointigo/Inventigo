# Stockiva — User Onboarding & Authentication Workflow

> **Author:** Technical Architect Analysis  
> **Date:** 2 April 2026  
> **Last Updated:** 2 April 2026 — decisions finalised  
> **Status:** APPROVED — ready for implementation

---

## 1. Current Flow (What Exists Today)

```
User visits app URL
        │
        ▼
  src/app/page.tsx
  redirect("/login")
        │
        ▼
  /login page (Sign In / Sign Up tabs)
        │
        ├── Sign In: email + password → /dashboard
        │
        └── Sign Up: name + email + password + confirmPassword
                │
                ▼
          POST /api/auth/register
          (creates Org + Owner + Store in ONE step)
                │
                ▼
          Auto sign-in → /dashboard
```

### Problems with the Current Flow

| # | Issue | Impact |
|---|-------|--------|
| 1 | No landing/home page — user lands directly on `/login` | No marketing presence, no product information, no conversion funnel |
| 2 | Sign Up = Register Business (combined) | User creates an account AND an organization simultaneously — no separation of concerns |
| 3 | `/register` route doesn't exist | Landing page links to `/register` which 404s |
| 4 | No plan selection during registration | Everyone gets FREE plan, no upsell opportunity at the most engaged moment |
| 5 | No onboarding wizard after registration | New user lands on an empty dashboard with no guidance |
| 6 | Invited users have no separate join flow | Invitation token exists but there's no page to accept and set password |
| 7 | Google OAuth users have no org creation flow | They get `orgId: null` and a broken experience |
| 8 | A user can only belong to one org | If a person runs two businesses, they need two accounts |
| 9 | No email verification | Anyone can register with a fake/others' email, create spam businesses |

---

## 2. Recommended Flow (What We Should Build)

### 2.1 Design Philosophy

**Separate identity from organization.** A user account (identity) and a business (organization) are two different things. The approach:

1. **Sign up** = create a personal account (identity only)
2. **Register business** = create an org and become its OWNER (requires existing account)
3. **Accept invite** = join an existing org (requires existing account)

This is the pattern used by Shopify, Slack, Notion, Vercel, and most modern SaaS platforms.

> **Why not combine Sign Up + Register Business into one form?**  
> - A single 7-field form (name, email, password, confirm password, business name, business type, plan) has high abandonment.  
> - Separating them gives a faster first signup (4 fields), then a focused business setup (3-4 fields).  
> - Invited team members (STAFF, MANAGER) don't create a business — they just need an account.  
> - Google OAuth users can create an org later without re-entering anything.

### 2.2 Complete User Journey Map

```
                              ┌─────────────────────────────┐
                              │   stockiva.vercel.app       │
                              │     (Landing)               │
                              │                             │
                              │  "Register Your Business"   │
                              │  "Login (existing users)"   │
                              └──────┬───────────┬──────────┘
                                     │           │
                              ┌──────▼──┐    ┌────▼────┐
                              │  /login │    │ /login  │
                              │ Sign Up │    │ Sign In │
                              │   tab   │    │   tab   │
                              └────┬────┘    └────┬────┘
                                   │              │
                        Create Account +      Has Account
                        Email sent             │
                                   │           │
                              ┌────▼────┐      │
                              │/verify- │      │
                              │email    │      │
                              │(OTP)    │      │
                              └────┬────┘      │
                                   │           │
                              Email Verified   │
                                   │           │
                              ┌────▼──────────────▼────┐
                              │   Authenticated User   │
                              │   (session active)     │
                              └────────────┬───────────┘
                                           │
                              ┌─────────── │ ───────────┐
                              │            │            │
                         Has orgId?   orgId is null   Invited?
                           (yes)       (no org)       (token)
                              │            │            │
                              ▼            ▼            ▼
                         /dashboard   /onboarding   /invite/[token]
                                      (register     (accept &
                                       business)     join org)
```

> **Note on Google OAuth:** Google accounts are already email-verified by Google. Skip the `/verify-email` step for OAuth users.

---

## 3. Route Architecture

### 3.1 Public Routes (no auth required)

| Route | Purpose | Component |
|-------|---------|-----------|
| `/` | Landing page (marketing, pricing, features) | `src/app/page.tsx` |
| `/login` | Sign In + Sign Up (two tabs, as it is today) | `src/app/(auth)/login/page.tsx` |
| `/verify-email` | Enter OTP sent to email after sign up | `src/app/(auth)/verify-email/page.tsx` |
| `/invite/[token]` | Accept invitation — shows org name, sign up / sign in to accept | `src/app/(auth)/invite/[token]/page.tsx` |

### 3.2 Auth-Required, No-Org Routes (user exists, but no business yet)

| Route | Purpose | Component |
|-------|---------|-----------|
| `/onboarding` | Multi-step business registration wizard | `src/app/(auth)/onboarding/page.tsx` |

### 3.3 Auth-Required + Org-Required Routes (existing behavior)

| Route | Purpose |
|-------|---------|
| `/dashboard` | Main dashboard |
| `/dashboard/categories` | Category management |
| `/dashboard/products` | Product management |
| `...` | All other dashboard routes |

---

## 4. Detailed Flow for Every Scenario

### 4.1 New User — Registers from Landing Page

```
Step 1: Landing Page (/)
  ├── Click "Register Your Business Free"
  └── Redirected to /login?tab=signup

Step 2: Sign Up (/login — Sign Up tab)
  ├── Fields: Full Name, Email, Password, Confirm Password
  ├── Alternatively: "Sign up with Google" (skip to Step 4 — Google already verified)
  ├── POST /api/auth/register → creates User (emailVerified: false, orgId: null)
  ├── Server sends 6-digit OTP to email (valid 15 minutes)
  └── Redirect to /verify-email

Step 3: Email Verification (/verify-email)
  ├── Shows: "We sent a code to {email}"
  ├── Input: 6-digit OTP field
  ├── "Verify Email" button → POST /api/auth/verify-email { code }
  ├── Server marks User.emailVerified = true, creates session
  ├── Resend option: "Didn't get it? Resend" (rate-limited: 1/min)
  └── On success → Redirect to /onboarding

Step 4: Business Registration (/onboarding — Step 1 of 2)
  ├── Business Name (required)
  ├── Industry / Business Type (optional) — label: "Industry/Business (optional)"
  │     dropdown: Clothing & Apparel, Electronics, Grocery & FMCG, Beauty & Personal Care,
  │               Furniture, Pharmacy, Books & Stationery, Other
  ├── First Store Name (pre-filled as "Main Store", editable)
  ├── Store City / Location (optional)
  └── "Next →" button

Step 5: Choose Plan (/onboarding — Step 2 of 2)
  ├── 3 plan cards: Starter (Free) / Growth ₹2,499/mo / Enterprise
  ├── Starter: always free, no trial expiry
  ├── Growth: "Start 1-month free trial" — no credit card required at signup
  │     After 30 days: notification sent → if no payment → plan downgrades to Starter
  ├── Enterprise: "Contact Sales" → opens contact form / mailto link
  └── "Complete Setup" button

Step 6: Done → Redirect to /dashboard
  ├── User now has orgId, storeId, role=OWNER, emailVerified=true
  ├── Dashboard shows welcome / empty state with quick-start guide
  └── Guide: "Add your first category → Add brands → Add products → You're ready!"
```

### 4.2 Existing User — Signs In

```
Step 1: Landing Page (/) or direct URL
  ├── Click "Login (existing users)"
  └── Redirected to /login?tab=signin

Step 2: Sign In (/login — Sign In tab)
  ├── Fields: Email, Password (or Google)
  └── Auto-redirect based on state:
      ├── emailVerified=false → /verify-email (rare: dropped off mid-signup)
      ├── orgId exists        → /dashboard
      └── orgId is null       → /onboarding (signed up but never registered a business)
```

### 4.3 Invited Team Member — First Time

```
Step 1: Receives invite email with link
  └── /invite/abc123-token-xyz

Step 2: Invitation Page (/invite/[token])
  ├── Shows: "You've been invited to join [Org Name] as [Role]"
  ├── If already signed in:
  │     ├── Shows: "Accept invitation" button
  │     └── POST /api/invitations/[token]/accept → joins the org
  ├── If not signed in:
  │     ├── Shows: Sign Up form (name, email [pre-filled], password)
  │     ├── OR "Sign in" link (if they already have an account)
  │     ├── After sign up/in → auto-accepts the invitation
  │     └── Redirect to /dashboard
  └── No need for /onboarding — they join an existing org
```

### 4.4 Google OAuth User — First Time

```
Step 1: Click "Sign up with Google" on /login
  ├── Google OAuth completes → account created
  ├── Google accounts are already email-verified — skip /verify-email
  ├── JWT has orgId: null, emailVerified: true
  └── Redirect directly to /onboarding

Step 2: /onboarding
  ├── Same wizard as 4.1 Step 4-5 (business name, plan)
  ├── Email + name already populated from Google profile (read-only)
  └── Completes setup → /dashboard
```

### 4.5 Super Admin — Platform Admin

```
Step 1: Signs in at /login
  ├── role: SUPER_ADMIN, orgId: null
  └── Redirect to /admin (not /dashboard, not /onboarding)

Note: SUPER_ADMIN is a special case — they don't belong to any org.
      The proxy/middleware must NOT redirect them to /onboarding.
```

---

## 5. Middleware / Proxy Logic Update

Current `proxy.ts` only checks if a session cookie exists. The updated logic:

```
Request comes in
      │
      ├── Is public route? (/, /login, /verify-email, /api/auth, /api/cron, /invite/*)
      │     └── YES → allow through
      │
      ├── Has session cookie?
      │     └── NO → redirect to /login
      │
      ├── Is /login and user is authenticated?
      │     └── YES → redirect to:
      │           ├── SUPER_ADMIN             → /admin
      │           ├── emailVerified=false     → /verify-email
      │           ├── has orgId               → /dashboard
      │           └── no orgId                → /onboarding
      │
      ├── Is SUPER_ADMIN?
      │     └── YES → allow /admin/* routes, block /dashboard/* and /onboarding
      │
      ├── Is /onboarding and user already has orgId?
      │     └── YES → redirect to /dashboard (already set up)
      │
      ├── Is /dashboard/* and user has NO orgId?
      │     └── YES → redirect to /onboarding (must set up business first)
      │
      └── All other authenticated routes → allow through
```

### Route Access Matrix

| Route | Unauthenticated | Auth + Unverified Email | Auth + No Org | Auth + Has Org | SUPER_ADMIN |
|-------|:-:|:-:|:-:|:-:|:-:|
| `/` (landing) | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/login` | ✅ | → `/verify-email` | → `/onboarding` | → `/dashboard` | → `/admin` |
| `/verify-email` | → `/login` | ✅ | → `/onboarding` | → `/dashboard` | → `/admin` |
| `/onboarding` | → `/login` | → `/verify-email` | ✅ | → `/dashboard` | → `/admin` |
| `/dashboard/*` | → `/login` | → `/verify-email` | → `/onboarding` | ✅ | → `/admin` |
| `/admin/*` | → `/login` | → `/login` | → `/login` | → `/login` | ✅ |
| `/invite/[token]` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/api/*` | auth middleware | ✅ | ✅ | ✅ | ✅ |

---

## 6. API Changes Required

### 6.1 Modify: `POST /api/auth/register`

**Current:** Creates Organization + User + Store in one transaction  
**New:** Creates User only (no org), sends OTP email

```
// NEW behavior
POST /api/auth/register
Body: { name, email, password }
Response: { message, userId }

// User is created with:
//   orgId: null
//   storeId: null
//   role: OWNER (default for self-registered)
//   isActive: true
//   emailVerified: false
//
// Side effect: generates 6-digit OTP, stores with 15-min expiry,
// sends email: "Your Stockiva verification code is: 482910"
```

### 6.1b New: `POST /api/auth/verify-email`

```
POST /api/auth/verify-email
Auth: Not required (uses email from request body)
Body: { email, code }
Response: { message }

// Server-side actions:
// 1. Find OTP record by email + code
// 2. Check not expired (15 minutes)
// 3. Set User.emailVerified = true
// 4. Delete OTP record
// 5. Return success → client signs in
//
// Rate limiting: max 5 attempts per email per 15 minutes → lock out

POST /api/auth/resend-verification
Auth: Not required
Body: { email }
Response: { message }
// Rate limited: 1 email per minute per address
```

### 6.2 New: `POST /api/onboarding/register-business`

This is the new endpoint that creates the org + store (called from /onboarding page).

```
POST /api/onboarding/register-business
Auth: Required (session cookie)
Body: {
  businessName: string        // required
  industry?: string           // optional
  storeName?: string          // default "Main Store"
  storeCity?: string          // optional
  plan: "FREE" | "PRO"       // which plan they chose
}
Response: {
  message: string,
  orgId: string,
  storeId: string
}

// Server-side actions:
// 1. Validate user is authenticated and has NO orgId
// 2. Create Organization (name, slug, plan)
// 3. Create Store (name, code, orgId)
// 4. Update User: set orgId, storeId, role=OWNER
// 5. Return success → client refreshes JWT / session
```

### 6.3 New: `POST /api/invitations/[token]/accept`

```
POST /api/invitations/[token]/accept
Auth: Required (session cookie)
Body: {} (empty)
Response: { message, orgId, role }

// Server-side actions:
// 1. Validate token is valid and not expired
// 2. Validate user email matches invitation email
// 3. Update User: set orgId, storeId, role from invitation
// 4. Update Invitation: status=ACCEPTED
// 5. Return success
```

### 6.4 Session Refresh After Onboarding

After `/api/onboarding/register-business` succeeds, the JWT still has the old `orgId: null`. Two options:

**Option A (Recommended): Force re-sign-in silently**
```js
// After register-business success:
await signIn("credentials", { email, password, redirect: false });
router.push("/dashboard");
```

**Option B: Update JWT via custom endpoint**
```
POST /api/auth/refresh-session
// Reads latest user from DB, returns updated token
```

Option A is simpler and doesn't require a new endpoint. The password is already in the client from sign-up.

However, for Google OAuth users (no password), we need Option B or a `trigger: "update"` callback in NextAuth:

```js
// auth.ts callbacks
async jwt({ token, trigger }) {
  if (trigger === "update") {
    // Re-fetch user from DB to get updated orgId
    const user = await prisma.user.findUnique({ where: { id: token.id } });
    if (user) {
      token.orgId = user.orgId;
      token.storeId = user.storeId;
      token.role = user.role;
    }
  }
  return token;
}

// Client-side after registering business:
await update(); // nextauth's useSession().update()
```

**Recommendation:** Use both — the `trigger: "update"` callback handles all cases cleanly.

---

## 7. Database Changes

### 7.1 User model — add `emailVerified` field

The existing `User` model already supports `orgId: null` (user without org). One addition is needed:

```prisma
model User {
  // ... existing fields ...
  emailVerified Boolean  @default(false)   // ← ADD THIS
}
```

For Google OAuth users this will be set to `true` immediately on account creation.

### 7.2 New: `EmailVerification` model

Stores OTP codes with expiry:

```prisma
model EmailVerification {
  id        String   @id @default(uuid())
  email     String
  code      String   // 6-digit OTP
  expiresAt DateTime
  attempts  Int      @default(0) // track failed attempts
  createdAt DateTime @default(now())

  @@index([email])
  @@map("email_verifications")
}
```

> **Note:** This requires `prisma migrate dev` to apply the schema changes.

### 7.3 Plan & Trial tracking — future billing

When Growth plan trial is selected, record:
```prisma
// Add to Organization model:
trialEndsAt  DateTime?   // set to now + 30 days on plan selection
planStatus   PlanStatus  @default(ACTIVE)

enum PlanStatus {
  ACTIVE
  TRIAL
  TRIAL_EXPIRED
  CANCELLED
}
```

The cron job at `/api/cron/reorder-check` (or a new `/api/cron/billing-check`) will run daily, check `trialEndsAt`, and send notification emails at: 7 days before, 3 days before, 1 day before expiry, then downgrade on expiry day.

---

## 8. UI/UX Pages to Build

### 8.0 Email Verification Page — `/verify-email`

```
┌─────────────────────────────────────────────────┐
│             ✉️  Verify your email               │
│                                                 │
│  We sent a 6-digit code to                      │
│  john@example.com                               │
│                                                 │
│  ┌─────────────────────────────────────────┐    │
│  │   [ 4 ][ 8 ][ 2 ][ 9 ][ 1 ][ 0 ]        │    │
│  │         (individual OTP inputs)         │    │
│  └─────────────────────────────────────────┘    │
│                                                 │
│             [Verify & Continue]                 │
│                                                 │
│         Didn't receive it? Resend code          │
│         (appears after 30 seconds)              │
│                                                 │
│         Wrong email? Go back to sign up         │
└─────────────────────────────────────────────────┘
```

UX notes:
- Auto-advance between input boxes as user types
- Auto-submit when all 6 digits entered
- Show countdown timer: "Resend available in 45s"
- On wrong code: shake animation + clear fields

### 8.1 Landing Page — `/` (page.tsx)

Based on your choice: **landing-v4-glass-dark.html** design.

Convert to Next.js with:
- "Register Your Business Free" → `href="/login?tab=signup&next=onboarding"`
- "Login (existing users)" → `href="/login?tab=signin"`
- "See How It Works" → `href="#about"` (anchor scroll)
- Pricing cards "Get Started Free" → `href="/login?tab=signup&plan=free"`
- Pricing cards "Start Free Trial" → `href="/login?tab=signup&plan=pro"`

### 8.2 Onboarding Page — `/onboarding`

A clean 2-step wizard (Ant Design Steps component):

**Step 1 — Business Details:**
```
┌─────────────────────────────────────────────────┐
│  Welcome, {name}! Let's set up your business.   │
│                                                 │
│  ① Business Info  ──────  ② Choose Plan        │
│                                                 │
│  ┌─────────────────────────────────────────┐    │
│  │  Business Name *                        │    │
│  │  [________________________]             │    │
│  │                                         │    │
│  │  Industry / Business (optional)         │    │
│  │  [Select industry... ▼]                 │    │
│  │  Clothing & Apparel | Electronics |     │    │
│  │  Grocery & FMCG | Beauty | Furniture |  │    │
│  │  Pharmacy | Books | Other               │    │
│  │                                         │    │
│  │  Your First Store Name                  │    │
│  │  [Main Store_____________]              │    │
│  │                                         │    │
│  │  Store City / Location (optional)       │    │
│  │  [________________________]             │    │
│  └─────────────────────────────────────────┘    │
│                                                 │
│                             [Next →]            │
└─────────────────────────────────────────────────┘
```

**Step 2 — Plan Selection:**
```
┌─────────────────────────────────────────────────┐
│  ① Business Info  ──────  ② Choose Plan  ✓     │
│                                                 │
│  ┌──────────┐  ┌──────────────┐  ┌───────────┐  │
│  │ Starter  │  │ Growth ★     │  │Enterprise │  │
│  │ Free     │  │ ₹2,499/mo    │  │ Custom    │  │
│  │ Forever  │  │ 1-month free │  │           │  │
│  │          │  │ trial        │  │ Contact   │  │
│  │[Select]  │  │ [Start Trial]│  │  Sales    │  │
│  └──────────┘  └──────────────┘  └───────────┘  │
│                                                 │
│  ← Back                  [Complete Setup →]     │
└─────────────────────────────────────────────────┘
```

### 8.3 Invite Acceptance Page — `/invite/[token]`

```
┌─────────────────────────────────────────────────┐
│                                                 │
│  You've been invited to join                    │
│  ┌───────────────────────────────────────┐      │
│  │  🏢 Rare Thread                       │      │
│  │  as MANAGER                           │      │
│  └───────────────────────────────────────┘      │
│                                                 │
│  [If signed in]                                 │
│  ┌───────────────────────────────────────┐      │
│  │  Signed in as owner@rarethread.com    │      │
│  │  [Accept Invitation]                  │      │
│  └───────────────────────────────────────┘      │
│                                                 │
│  [If not signed in]                             │
│  ┌───────────────────────────────────────┐      │
│  │  Create an account to accept          │      │
│  │  Name: [___________]                  │      │
│  │  Email: [invite@email.com] (readonly) │      │
│  │  Password: [___________]              │      │
│  │  [Create Account & Accept]            │      │
│  │                                       │      │
│  │  Already have an account? [Sign in]   │      │
│  └───────────────────────────────────────┘      │
│                                                 │
└─────────────────────────────────────────────────┘
```

### 8.4 Dashboard Empty State

When a new user lands on `/dashboard` with zero data, instead of showing empty charts:

```
┌─────────────────────────────────────────────────┐
│  Welcome to your dashboard, {name}! 🎉          │
│                                                 │
│  Let's get your store set up:                   │
│                                                 │
│  ✅ Step 1: Account created                     │
│  ✅ Step 2: Business registered                 │
│  ○  Step 3: Add your first category             │
│  ○  Step 4: Add your first brand                │
│  ○  Step 5: Add your first product              │
│  ○  Step 6: Record your first sale!             │
│                                                 │
│  [+ Add Category] [+ Add Brand]  [+ Add Product]│
│                                                 │
└─────────────────────────────────────────────────┘
```

Once they have data, the normal dashboard with charts appears.

---

## 9. Implementation Order

### Phase A — Schema & Core Backend (do first, everything depends on this)

| Task | Description | Effort |
|------|-------------|--------|
| **A1** | Prisma schema: add `User.emailVerified`, add `EmailVerification` model | Small |
| **A2** | Run `prisma migrate dev` to apply schema changes | Small |
| **A3** | Update `POST /api/auth/register` — user only, no org, send OTP email | Small |
| **A4** | New `POST /api/auth/verify-email` and `POST /api/auth/resend-verification` | Medium |
| **A5** | New `POST /api/onboarding/register-business` endpoint | Medium |
| **A6** | Add `trigger: "update"` to `auth.ts` JWT callback + `emailVerified` in session | Small |

### Phase B — Routing & Middleware

| Task | Description | Effort |
|------|-------------|--------|
| **B1** | Update `proxy.ts` — add `/`, `/verify-email`, `/invite` to public routes | Small |
| **B2** | Update `src/app/page.tsx` — serve landing page instead of redirect | Small |
| **B3** | Add `RequireOrg` + `RequireVerified` guards to dashboard layout | Small |

### Phase C — UI Pages

| Task | Description | Effort |
|------|-------------|--------|
| **C1** | Build landing page `src/app/page.tsx` from landing-v4-glass-dark.html | Large |
| **C2** | Update `/login` — accept `?tab=signup` query param, redirect to `/verify-email` after signup | Small |
| **C3** | Build `/verify-email` page (OTP input, resend, countdown timer) | Medium |
| **C4** | Build `/onboarding` page (2-step wizard: business info + plan) | Medium |
| **D1** | Dashboard empty state / welcome guide component | Small |

### Phase D — Invitations

| Task | Description | Effort |
|------|-------------|--------|
| **D2** | New `POST /api/invitations/[token]/accept` endpoint | Medium |
| **D3** | Build `/invite/[token]` page | Medium |

### Phase E — Billing / Trial (defer, implement later)

| Task | Description | Effort |
|------|-------------|--------|
| **E1** | Add `trialEndsAt`, `planStatus` to Organization schema | Small |
| **E2** | Cron job: check trial expiry, send notification emails at 7d / 3d / 1d | Medium |
| **E3** | Downgrade plan on trial expiry | Small |
| **E4** | In-app banner: "Your trial expires in X days" | Small |

**Recommended order:** A1 → A2 → A3 → A4 → A5 → A6 → B1 → B2 → B3 → C1 → C2 → C3 → C4 → D1 → D2 → D3 → (E phases later)

---

## 10. Edge Cases & Scenarios

### 10.0 User signs up but closes browser before verifying email
- **Behavior:** Next time they sign in → `emailVerified` is false → redirected to `/verify-email`
- **OTP:** Still valid if within 15 minutes. Otherwise they click "Resend code".
- **Result:** Clean re-entry, no data lost.

### 10.1 User signs up but closes browser before onboarding
- **Behavior:** Next time they sign in → `emailVerified=true` but `orgId` is null → redirected to `/onboarding`
- **Result:** They resume from where they left off. No data lost.

### 10.2 User tries to access `/dashboard` directly without org
- **Behavior:** Proxy sees auth cookie but `orgId: null` → redirect to `/onboarding`
- **Note:** Proxy can't decode JWT claims. We need to check this in the dashboard layout or a client-side wrapper, not the proxy. (The proxy only sees cookie presence, not contents.)

**Solution:** Use a `RequireOrg` client wrapper in the dashboard layout:
```tsx
// src/app/(dashboard)/layout.tsx
const { data: session } = useSession();
if (session?.user && !session.user.orgId) {
  router.replace("/onboarding");
  return <Loading />;
}
```

### 10.3 User registers business, then receives an invite to another org
- **Current schema:** User has one `orgId`. Can't belong to two orgs.
- **Phase 1 (now):** Show "You already belong to an org" message. Decline invite.
- **Phase 2 (future):** Add `OrgMembership` join table for multi-org support.

### 10.4 Invitation email doesn't match signed-in user's email
- **Behavior:** Show error: "This invitation was sent to {invite.email}. Please sign in with that email."

### 10.5 Invitation expired
- **Behavior:** Show "This invitation has expired. Ask your admin to send a new one."

### 10.6 Google OAuth user — no password for silent re-sign-in
- **Behavior:** Use `useSession().update()` to trigger JWT refresh via `trigger: "update"` callback.

### 10.7 Landing page visited by already-signed-in user
- **Behavior:** Landing page is public and always accessible. The nav shows "Go to Dashboard" instead of "Login".

### 10.8 User bookmarks `/login` — already signed in
- **Behavior:** Redirect based on state:
  - Has org → `/dashboard`
  - No org → `/onboarding`
  - SUPER_ADMIN → `/admin`

---

## 11. Naming Reference

| Name | Status | Notes |
|------|--------|-------|
| **Stockiva** | ✅ Official app name | Deployed at `stockiva.vercel.app`. Use this everywhere — UI, emails, marketing, footer, page titles. |
| Inventigo | ❌ Old working name | Retired. Do not use in any new code, copy, or UI. |
| "Register" (combined) | ❌ Old flow | Replaced by "Sign Up" (account) + "Set up business" (onboarding wizard) |
| `/register` route | ❌ Does not exist | Replaced by `/onboarding` |

---

## 12. Summary — Before vs After

| Aspect | Before | After |
|--------|--------|-------|
| Landing | None (redirect to /login) | Full marketing page with pricing |
| Sign Up | Creates User + Org + Store | Creates User only |
| Business Setup | Part of sign-up form | Separate `/onboarding` wizard |
| Plan Selection | None (always FREE) | Step 2 of onboarding |
| Invited Users | No acceptance page | `/invite/[token]` with sign up/in + accept |
| Google OAuth | Broken (no org) | Works → redirected to /onboarding |
| Empty Dashboard | Raw empty charts | Welcome guide with quick-start checklist |
| Auth Redirects | Cookie exists → allow | Smart routing based on orgId + role |

---

## 13. Product Decisions — Finalised

| # | Question | Decision | Notes |
|---|----------|----------|-------|
| 1 | **Trial period for Growth plan** | **1 month free trial**, no CC required. Notify at 7d / 3d / 1d before expiry. Auto-downgrade to Starter if no payment. | Billing functionality deferred to Phase E |
| 2 | **Multiple businesses per user** | **Deferred — not now.** Current model: 1 owner, 1 org, multiple stores under that org. | Re-evaluate when a real user request comes in |
| 3 | **Phone number at sign-up** | **No.** Email is sufficient. Google OAuth handles social sign-up. | Can add phone later for OTP login (Phase future) |
| 4 | **Industry/Business type field** | **Optional.** Label: `Industry / Business (optional)`. Dropdown with 8 common options + "Other". | Used for analytics and future template suggestions |
| 5 | **Email verification** | **YES — implement now.** 6-digit OTP to email, valid 15 min. Required before accessing `/onboarding`. Google OAuth users are pre-verified, skip this step. | Architect's recommendation accepted. See sections 6.1b, 7.2, 8.0, Phase A in implementation order |

### Architect's note on Email Verification

> **Why implement now and not later?**
>
> Implementing email verification after the fact is painful — you have to deal with a backlog of unverified accounts in the database, add migration logic, and the UX becomes inconsistent. Doing it now (before any real users exist) costs ~1 day of effort and permanently solves:
> - Prevents spam business registrations with fake/others' emails
> - Ensures the password reset flow works (you know the email is real)
> - Builds trust — users see "we verified your email" as a quality signal
> - Required for any future notification/billing emails to be effective
>
> The added friction (1 extra step with copy-paste OTP) is minimal for genuine users and high friction for abuse.

---

*Implementation can begin immediately starting with Phase A (schema + backend APIs).*
