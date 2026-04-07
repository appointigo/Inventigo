# Email Verification Setup Guide

## Current State

The full email verification flow is **already implemented in code**:

| What | File | Status |
|------|------|--------|
| OTP generation + DB storage | `POST /api/auth/register` | ✅ Done |
| OTP email send helper (`sendVerificationEmail`) | `register/route.ts`, `resend-verification/route.ts` | ✅ Done — gated behind env var |
| Resend OTP API | `POST /api/auth/resend-verification` | ✅ Done |
| OTP validation + mark verified | `POST /api/auth/verify-email` | ✅ Done |
| Verify email UI page | `/verify-email` | ✅ Done |

**Why email is not being sent right now:**  
`sendVerificationEmail()` checks for `RESEND_API_KEY` in the environment. If it's not set, it falls back to:
```ts
console.log(`\n[Stockiva OTP] Email: ${email} | Code: ${code}\n`);
```
So the OTP prints to the server terminal (and is also returned in the API response as `_devOtp` in development mode), but no actual email is triggered.

---

## Steps to Enable Real Email Sending

### Step 1 — Sign up for Resend

1. Go to **[resend.com](https://resend.com)** and create a free account.
2. Free tier: **3,000 emails/month**, 100/day — sufficient for development and early production.

---

### Step 2 — Get your API key

1. In the Resend dashboard → **API Keys** → **Create API Key**
2. Give it a name (e.g. `stockiva-dev`)
3. Permission: **Full access** (or "Sending access" is enough)
4. Copy the key — it starts with `re_`

---

### Step 3 — Add the key to your environment

In `.env.local` (development):
```env
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxx
```

In **Vercel** (production):
- Dashboard → Project → Settings → Environment Variables
- Add `RESEND_API_KEY` with the value from Step 2

---

### Step 4 — Choose your sender domain

The code currently uses `noreply@stockiva.in` as the `from` address:
```ts
from: "Stockiva <noreply@stockiva.in>",
```

You have two options:

#### Option A — Use Resend's shared test domain (quickest, dev only)
Change the `from` address in **both** route files to:
```ts
from: "Stockiva <onboarding@resend.dev>",
```
This works immediately with no domain setup. Limitation: can only send to the email address you registered Resend with.

**Files to update:**
- `src/app/api/auth/register/route.ts` (line ~27)
- `src/app/api/auth/resend-verification/route.ts` (line ~27)

#### Option B — Verify your own domain (recommended for production)
1. In Resend dashboard → **Domains** → **Add Domain**
2. Add `stockiva.in` (or whatever domain you own)
3. Resend gives you DNS records (TXT, MX) to add to your domain registrar
4. Once DNS propagates (usually 5–30 mins), the domain shows "Verified"
5. You can then send from any `@stockiva.in` address — keep `noreply@stockiva.in` as-is

---

### Step 5 — Test it

1. Start the dev server: `npm run dev`
2. Register a new account
3. Check the terminal — if `RESEND_API_KEY` is set and valid, you'll see no console OTP log (the email was sent instead)
4. Check the inbox of the email you registered with

If it fails, check the Resend dashboard → **Logs** for delivery status and error details.

---

## Quick Checklist

```
[ ] Created Resend account at resend.com
[ ] Created API key (starts with re_)
[ ] Added RESEND_API_KEY to .env.local
[ ] Either: changed from address to onboarding@resend.dev (quick test)
       OR: verified your domain in Resend dashboard (production)
[ ] Restarted dev server
[ ] Registered a test account → checked inbox
```

---

## How the Code Flow Works (for reference)

```
User submits registration form
  ↓
POST /api/auth/register
  → Creates User (emailVerified: false)
  → Generates 6-digit OTP
  → Stores OTP in EmailVerification table (expires in 15 min)
  → Calls sendVerificationEmail(email, otp)
      → If RESEND_API_KEY set: sends via Resend API  ← needs setup above
      → If not set: logs OTP to console
  → Returns { userId, _devOtp } (dev mode only)
  ↓
Browser redirects to /verify-email?email=...
User enters 6-digit code
  ↓
POST /api/auth/verify-email
  → Validates OTP (expiry, attempts)
  → Sets User.emailVerified = true
  → Deletes OTP record
  → Browser auto-signs in → redirects to /onboarding
```

---

## Notes

- **Resend is also used for the resend-verification flow** — same `RESEND_API_KEY` env var covers both register and resend routes.
- The `forgot-password` route has a similar `TODO` comment — the same Resend setup will unblock that too when you implement it.
- In development, the OTP is still returned in the API response as `_devOtp` even after Resend is configured (it's stripped in production). You can see it in the Network tab.
