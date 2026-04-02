import { NextRequest, NextResponse } from "next/server";

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/resend-verification
// Body: { email }
// Rate-limited: cannot resend if the previous code was sent < 60 seconds ago.
// ─────────────────────────────────────────────────────────────────────────────

const generateOtp = (): string => {
  return String(Math.floor(100000 + Math.random() * 900000));
};

const sendVerificationEmail = async (email: string, code: string): Promise<void> => {
  if (process.env.RESEND_API_KEY) {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Stockiva <noreply@stockiva.in>",
        to: email,
        subject: "Your new Stockiva verification code",
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
            <h2 style="color:#1677ff">New verification code</h2>
            <p>Your new Stockiva verification code is:</p>
            <div style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#1677ff;margin:24px 0">
              ${code}
            </div>
            <p style="color:#666">This code expires in 15 minutes.</p>
          </div>
        `,
      }),
    });
  } 
  else {
    console.log(`\n[Stockiva OTP Resend] Email: ${email} | Code: ${code}\n`);
  }
}

export const POST = async (request: NextRequest) => {
  let body: unknown;
  try {
    body = await request.json();
  } 
  catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { email } = body as Record<string, string>;

  if (!email?.trim()) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const emailLower = email.toLowerCase().trim();
  const otp = generateOtp();
  const expiresAt = Date.now() + 15 * 60 * 1000;
  const RESEND_COOLDOWN_MS = 60_000; // 60 seconds

  try {
    const { prisma } = await import("@/lib/db");

    const user = await prisma.user.findUnique({ where: { email: emailLower } });
    if (!user) {
      // Don't reveal whether the email is registered
      return NextResponse.json({ message: "If that email is registered, a new code has been sent." });
    }

    if (user.emailVerified) {
      return NextResponse.json({ error: "Email is already verified" }, { status: 400 });
    }

    // Rate limit check
    const existing = await prisma.emailVerification.findFirst({
      where: { email: emailLower },
      orderBy: { createdAt: "desc" },
    });

    if (existing) {
      const msSinceCreated = Date.now() - existing.createdAt.getTime();
      if (msSinceCreated < RESEND_COOLDOWN_MS) {
        return NextResponse.json(
          { error: "Please wait 60 seconds before requesting a new code" },
          { status: 429 }
        );
      }

      await prisma.emailVerification.deleteMany({ where: { email: emailLower } });
    }

    await prisma.emailVerification.create({
      data: {
        email: emailLower,
        code: otp,
        expiresAt: new Date(expiresAt),
      },
    });

    await sendVerificationEmail(emailLower, otp);

    return NextResponse.json({ message: "New verification code sent" });
  } 
  catch (error) {
    console.error("Resend verification error:", error);
    return NextResponse.json({ error: "Failed to resend verification code" }, { status: 500 });
  }
}
