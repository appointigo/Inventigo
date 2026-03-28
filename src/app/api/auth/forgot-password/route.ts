import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/auth/forgot-password
 *
 * Accepts an email address and would send a password reset link.
 * Always returns 200 to prevent email enumeration attacks.
 *
 * To enable actual email delivery, configure an email provider and
 * implement the token generation + send logic in the "Production" block below.
 */
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const emailLower = email.toLowerCase().trim();

    // ── Production: send reset email ──────────────────────────────────────
    if (process.env.NODE_ENV === "production" && process.env.DEMO_MODE !== "true") {
      // TODO: Implement when an email provider is configured (e.g. Resend, SendGrid):
      //   1. Look up user by email in the DB
      //   2. Generate a signed time-limited token (e.g. JWT or random UUID stored in DB)
      //   3. Send email with link: /reset-password?token=<token>
      //   4. Create GET /api/auth/reset-password and POST /api/auth/reset-password routes
      console.log(`[forgot-password] Reset requested for ${emailLower} — email sending not configured`);
    }

    // Always return 200 regardless of whether the email exists (security best practice)
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[forgot-password]", err);
    // Return 200 even on error to prevent enumeration
    return NextResponse.json({ success: true });
  }
}
