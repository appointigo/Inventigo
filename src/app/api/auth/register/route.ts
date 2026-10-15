import { randomInt } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { sendVerificationEmail, verificationCodeBrowserEnabled, verificationEmailConfigured, VerificationEmailError, type VerificationDelivery } from "@/modules/auth/verificationEmail";

export const POST = async (request: NextRequest) => {
  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Invalid body");
    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { name, email, password } = body;
  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (typeof email !== "string" || !email.trim()) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }
  if (typeof password !== "string" || password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const emailLower = email.toLowerCase().trim();
  if (!verificationEmailConfigured()) {
    console.error("[register] verification email sender is not configured");
    return NextResponse.json({ error: "Email verification is temporarily unavailable. Please try again later." }, { status: 503 });
  }
  const code = String(randomInt(100000, 1_000_000));
  const expiresAt = new Date(Date.now() + 15 * 60_000);

  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const { user, verificationId } = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
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
      await tx.emailVerification.deleteMany({ where: { email: emailLower } });
      const verification = await tx.emailVerification.create({
        data: { email: emailLower, code, expiresAt, lastSentAt: new Date() },
      });
      return { user, verificationId: verification.id };
    });

    let delivery: VerificationDelivery;
    try {
      delivery = await sendVerificationEmail(emailLower, code, "signup");
    } catch (error) {
      if (error instanceof VerificationEmailError) {
        await prisma.emailVerification.update({
          where: { id: verificationId },
          data: { lastSentAt: new Date(0) },
        }).catch((updateError) => console.error("[register] could not reset failed-send cooldown", updateError));
        console.error("[register] verification email was not accepted", { reason: error.reason, providerStatus: error.providerStatus });
        return NextResponse.json(
          { error: "We could not send the verification code. Please retry sending it from the verification screen.", needsVerification: true },
          { status: 503 },
        );
      }
      throw error;
    }

    const browserCode = delivery === "console" && verificationCodeBrowserEnabled(request.url, request.headers.get("origin"));
    return NextResponse.json(
      {
        message: browserCode ? "Verification code available in browser console" : delivery === "console" ? "Verification code logged to server console" : "Verification code sent",
        delivery,
        userId: user.id,
        ...(browserCode ? { verificationCode: code } : {}),
      },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Email already registered. Sign in to verify it or request a new code." }, { status: 409 });
    }
    console.error("Registration error:", error);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
};
