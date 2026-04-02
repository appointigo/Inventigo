import { NextRequest, NextResponse } from "next/server";

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/verify-email
// Body: { email, code }
// Verifies the 6-digit OTP. On success, marks user as emailVerified=true.
// Max 5 attempts before the code is invalidated (rate limiting).
// ─────────────────────────────────────────────────────────────────────────────
export const POST = async (request: NextRequest) => {
  let body: unknown;
  try {
    body = await request.json();
  } 
  catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { email, code } = body as Record<string, string>;

  if (!email?.trim() || !code?.trim()) {
    return NextResponse.json({ error: "Email and code are required" }, { status: 400 });
  }

  const emailLower = email.toLowerCase().trim();

  // ── Demo / development mode ─────────────────────────────────────────────────
  if (process.env.NODE_ENV === "development" || process.env.DEMO_MODE === "true") {
    const { demoOtpStore, demoRegisteredUsers } = await import("@/app/api/auth/register/route");

    const record = demoOtpStore.get(emailLower);
    if (!record) {
      return NextResponse.json(
        { error: "No verification code found for this email" },
        { status: 404 }
      );
    }

    if (Date.now() > record.expiresAt) {
      demoOtpStore.delete(emailLower);
      return NextResponse.json(
        { error: "Verification code has expired. Please request a new one." },
        { status: 410 }
      );
    }

    if (record.attempts >= 5) {
      demoOtpStore.delete(emailLower);
      return NextResponse.json(
        { error: "Too many failed attempts. Please request a new code." },
        { status: 429 }
      );
    }

    if (record.code !== code.trim()) {
      record.attempts += 1;
      return NextResponse.json(
        { error: "Invalid code", attemptsRemaining: 5 - record.attempts },
        { status: 400 }
      );
    }

    // Valid — mark user as verified
    demoOtpStore.delete(emailLower);
    const user = demoRegisteredUsers.find((u) => u.email === emailLower);
    if (user) {
      user.emailVerified = true;
    }

    return NextResponse.json({ message: "Email verified successfully" });
  }

  // ── Production mode — database ──────────────────────────────────────────────
  try {
    const { prisma } = await import("@/lib/db");

    const record = await prisma.emailVerification.findFirst({
      where: { email: emailLower },
      orderBy: { createdAt: "desc" },
    });

    if (!record) {
      return NextResponse.json(
        { error: "No verification code found for this email" },
        { status: 404 }
      );
    }

    if (new Date() > record.expiresAt) {
      await prisma.emailVerification.delete({ where: { id: record.id } });
      return NextResponse.json(
        { error: "Verification code has expired. Please request a new one." },
        { status: 410 }
      );
    }

    if (record.attempts >= 5) {
      await prisma.emailVerification.delete({ where: { id: record.id } });
      return NextResponse.json(
        { error: "Too many failed attempts. Please request a new code." },
        { status: 429 }
      );
    }

    if (record.code !== code.trim()) {
      await prisma.emailVerification.update({
        where: { id: record.id },
        data: { attempts: record.attempts + 1 },
      });
      return NextResponse.json(
        { error: "Invalid code", attemptsRemaining: 5 - (record.attempts + 1) },
        { status: 400 }
      );
    }

    // Valid — mark user verified and clean up OTP record
    await prisma.$transaction([
      prisma.user.update({
        where: { email: emailLower },
        data: { emailVerified: true },
      }),
      prisma.emailVerification.delete({ where: { id: record.id } }),
    ]);

    return NextResponse.json({ message: "Email verified successfully" });
  } 
  catch (error) {
    console.error("Email verification error:", error);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
