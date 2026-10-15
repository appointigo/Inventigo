import { randomInt } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendVerificationEmail, verificationCodeBrowserEnabled, verificationEmailConfigured, VerificationEmailError, type VerificationDelivery } from "@/modules/auth/verificationEmail";

const RESEND_COOLDOWN_MS = 60_000;
const CODE_LIFETIME_MS = 15 * 60_000;

export const POST = async (request: NextRequest) => {
  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Invalid body");
    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body.email !== "string" || !body.email.trim()) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }
  const email = body.email.toLowerCase().trim();

  try {
    const user = await prisma.user.findUnique({ where: { email }, select: { emailVerified: true } });
    if (!user) {
      return NextResponse.json({ message: "If that email is registered, a verification code has been sent." });
    }
    if (user.emailVerified) {
      return NextResponse.json({ error: "Email is already verified" }, { status: 400 });
    }
    if (!verificationEmailConfigured()) {
      console.error("[resend-verification] verification email sender is not configured");
      return NextResponse.json({ error: "Email verification is temporarily unavailable. Please try again later." }, { status: 503 });
    }

    const now = new Date();
    const existing = await prisma.emailVerification.findFirst({
      where: { email },
      orderBy: { expiresAt: "desc" },
    });
    // Failed sends have an epoch timestamp and can be retried immediately.
    if (existing && now.getTime() - existing.lastSentAt.getTime() < RESEND_COOLDOWN_MS) {
      return NextResponse.json(
        { error: "Please wait 60 seconds before requesting another code" },
        { status: 429 },
      );
    }

    let verification = existing;
    if (!existing || existing.expiresAt.getTime() - now.getTime() < 2 * 60_000 || existing.attempts >= 5) {
      verification = await prisma.$transaction(async (tx) => {
        await tx.emailVerification.deleteMany({ where: { email } });
        return tx.emailVerification.create({
          data: {
            email,
            code: String(randomInt(100000, 1_000_000)),
            expiresAt: new Date(now.getTime() + CODE_LIFETIME_MS),
            lastSentAt: new Date(0),
          },
        });
      });
    }

    if (!verification) throw new Error("Verification record was not created");
    const reservation = await prisma.emailVerification.updateMany({
      where: { id: verification.id, lastSentAt: { lte: new Date(now.getTime() - RESEND_COOLDOWN_MS) } },
      data: { lastSentAt: now },
    });
    if (reservation.count !== 1) {
      return NextResponse.json(
        { error: "Please wait 60 seconds before requesting another code" },
        { status: 429 },
      );
    }
    let delivery: VerificationDelivery;
    try {
      delivery = await sendVerificationEmail(email, verification.code, "resend");
    } catch (error) {
      if (error instanceof VerificationEmailError) {
        await prisma.emailVerification.update({
          where: { id: verification.id },
          data: { lastSentAt: new Date(0) },
        }).catch((updateError) => console.error("[resend-verification] could not reset failed-send cooldown", updateError));
        console.error("[resend-verification] email was not accepted", { reason: error.reason, providerStatus: error.providerStatus });
        return NextResponse.json(
          { error: "We could not send the verification code. Please try again shortly." },
          { status: 503 },
        );
      }
      throw error;
    }

    const browserCode = delivery === "console" && verificationCodeBrowserEnabled(request.url, request.headers.get("origin"));
    return NextResponse.json({
      message: browserCode ? "Verification code available in browser console" : delivery === "console" ? "Verification code logged to server console" : "Verification code sent",
      delivery,
      ...(browserCode ? { verificationCode: verification.code } : {}),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Resend verification error:", error);
    return NextResponse.json({ error: "Failed to resend verification code" }, { status: 500 });
  }
};
