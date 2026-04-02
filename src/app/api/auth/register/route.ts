import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

// In-memory OTP store for demo mode (resets on server restart)
export const demoOtpStore: Map<string, { code: string; expiresAt: number; attempts: number }> =
  new Map();

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const generateOtp = (): string => {
  return String(Math.floor(100000 + Math.random() * 900000));
}

const sendVerificationEmail = async (email: string, code: string): Promise<void> => {
  // Production: use Resend (set RESEND_API_KEY in env)
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
        subject: "Verify your Stockiva account",
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
            <h2 style="color:#1677ff">Verify your email</h2>
            <p>Your Stockiva verification code is:</p>
            <div style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#1677ff;margin:24px 0">
              ${code}
            </div>
            <p style="color:#666">This code expires in 15 minutes.</p>
          </div>
        `,
      }),
    });
  } else {
    // Dev/demo fallback — log to console
    console.log(`\n[Stockiva OTP] Email: ${email} | Code: ${code}\n`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/register
// Body: { name, email, password }
// Creates user account (no org yet), sends 6-digit OTP for email verification.
// ─────────────────────────────────────────────────────────────────────────────
export const POST = async (request: NextRequest) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { name, email, password } = body as Record<string, string>;

  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (!email?.trim()) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }
  if (!password) {
    return NextResponse.json({ error: "Password is required" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 }
    );
  }

  const emailLower = email.toLowerCase().trim();
  const passwordHash = await bcrypt.hash(password, 12);
  const otp = generateOtp();
  const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes

  try {
    // Check email uniqueness
    const existingUser = await prisma.user.findUnique({ where: { email: emailLower } });
    if (existingUser) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    // Create user (no org yet — assigned during onboarding)
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: emailLower,
        passwordHash,
        role: "OWNER",
        orgId: null,
        storeId: null,
        emailVerified: false,
      },
    });

    // Delete any existing OTP records for this email, then create a fresh one
    await prisma.emailVerification.deleteMany({ where: { email: emailLower } });
    await prisma.emailVerification.create({
      data: {
        email: emailLower,
        code: otp,
        expiresAt: new Date(expiresAt),
      },
    });

    await sendVerificationEmail(emailLower, otp);

    const devPayload = process.env.NODE_ENV === "development" ? { _devOtp: otp } : {};

    return NextResponse.json(
      { message: `Verification code sent to ${emailLower}`, userId: user.id, ...devPayload },
      { status: 201 }
    );
  } 
  catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
