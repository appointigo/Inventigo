"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { App, Typography, Space } from "antd";
import { MailOutlined, ReloadOutlined } from "@ant-design/icons";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { SceneWrapper, Overlay, OrbitRing, Particle, LogoRow, LogoIcon, LogoText, GlassCard, SubmitBtn, CardTitle, CardSubtext, LinkBtn, FooterText } from "@/app/(auth)/login/login.styled";
import { OtpRow, OtpInput, ResendRow, OtpErrorText, MailIconWrap } from "./verify-email.styled";

const { Text } = Typography;

const ORBIT_SIZES = [380, 600, 840];
const PARTICLES = [
  { w: 8,  top: "18%", left: "12%", dur: "6s",  delay: "0s"   },
  { w: 5,  top: "72%", left: "82%", dur: "8s",  delay: "1s"   },
  { w: 6,  top: "82%", left: "10%", dur: "9s",  delay: "0.5s" },
];

const RESEND_COOLDOWN = 60; // seconds
const OTP_LENGTH = 6;

const VerifyEmailInner = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { message } = App.useApp();
  const { update: updateSession } = useSession();

  const email = searchParams.get("email") ?? "";
  const decodedEmail = decodeURIComponent(email);

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(RESEND_COOLDOWN);
  const [error, setError] = useState("");
  const [shaking, setShaking] = useState(false);
  const inputRefs = useRef<HTMLInputElement[]>([]);

  // Redirect to login if no email param
  useEffect(() => {
    if (!email) router.replace("/login?tab=signup");
  }, [email, router]);

  // Countdown timer for resend button
  useEffect(() => {
    if (countdown <= 0) return;
    const id = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [countdown]);

  const triggerShake = useCallback(() => {
    setShaking(true);
    setTimeout(() => setShaking(false), 500);
  }, []);

  const getCode = () => digits.join("");

  // ─── Verify OTP ──────────────────────────────────────────────────────────
  const verify = useCallback(
    async (code: string) => {
      if (code.length < OTP_LENGTH || verifying) return;
      setVerifying(true);
      setError("");

      try {
        const res = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: decodedEmail, code }),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error ?? "Invalid verification code");
          triggerShake();
          setDigits(Array(OTP_LENGTH).fill(""));
          inputRefs.current[0]?.focus();
          return;
        }

        // Try auto sign-in using credentials stored at registration
        const stored = sessionStorage.getItem("pendingAuth");
        if (stored) {
          try {
            const { email: storedEmail, password } = JSON.parse(stored);
            sessionStorage.removeItem("pendingAuth");
            const result = await signIn("credentials", {
              email: storedEmail,
              password,
              redirect: false,
            });
            if (!result?.error) {
              // Force JWT refresh so emailVerified = true is picked up
              await updateSession();
              message.success("Email verified! Setting up your workspace…");
              router.push("/onboarding");
              return;
            }
          } 
          catch (error) {
            console.error(error);
            // Fall through to manual sign-in
          }
        }

        message.success("Email verified! Please sign in.");
        router.push(`/login?tab=signin&email=${encodeURIComponent(decodedEmail)}`);
      } 
      catch (error) {
        console.error(error);
        setError("Something went wrong. Please try again.");
        triggerShake();
      } 
      finally {
        setVerifying(false);
      }
    },
    [decodedEmail, verifying, triggerShake, router, message, updateSession]
  );

  // ─── Resend OTP ──────────────────────────────────────────────────────────
  const resend = async () => {
    if (countdown > 0 || resending) return;
    setResending(true);
    setError("");

    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: decodedEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        message.error(data.error ?? "Failed to resend code");
      } 
      else {
        message.success("A new code has been sent to your email");
        setCountdown(RESEND_COOLDOWN);
        setDigits(Array(OTP_LENGTH).fill(""));
        inputRefs.current[0]?.focus();
      }
    } 
    catch (error) {
      console.error(error);
      message.error("Failed to resend code");
    } 
    finally {
      setResending(false);
    }
  };

  // ─── Keyboard handling ────────────────────────────────────────────────────
  const handleChange = (index: number, value: string) => {
    setError("");
    const char = value.replace(/\D/g, "").slice(-1);
    const updated = [...digits];
    updated[index] = char;
    setDigits(updated);
    if (char && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
    // Auto-submit when all digits filled
    const newCode = updated.join("");
    if (newCode.length === OTP_LENGTH && !newCode.includes("")) {
      verify(newCode);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (digits[index]) {
        const updated = [...digits];
        updated[index] = "";
        setDigits(updated);
      } 
      else if (index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    } 
    else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } 
    else if (e.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pasted) return;

    const updated = Array(OTP_LENGTH).fill("");
    pasted.split("").forEach((ch, i) => { updated[i] = ch; });
    setDigits(updated);
    const nextEmpty = updated.findIndex((d) => d === "");
    const focusIndex = nextEmpty === -1 ? OTP_LENGTH - 1 : nextEmpty;
    inputRefs.current[focusIndex]?.focus();
    if (pasted.length === OTP_LENGTH) {
      verify(pasted);
    }
  };

  const filled = digits.filter(Boolean).length;
  const allFilled = filled === OTP_LENGTH;

  return (
    <SceneWrapper>
      <Overlay />
      {ORBIT_SIZES.map((size, i) => (
        <OrbitRing key={size} $size={size} $index={i} />
      ))}
      {PARTICLES.map((p, i) => (
        <Particle key={i} $w={p.w} $top={p.top} $left={p.left} $dur={p.dur} $delay={p.delay} />
      ))}

      <LogoRow>
        <LogoIcon />
        <LogoText>Stockiva</LogoText>
      </LogoRow>

      <GlassCard>
        <MailIconWrap>
          <MailOutlined />
        </MailIconWrap>

        <CardTitle level={3} style={{ textAlign: "center" }}>
          Check your email
        </CardTitle>
        <CardSubtext $mb={8} style={{ textAlign: "center" }}>
          We sent a 6-digit code to
        </CardSubtext>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <Text style={{ color: "#5ecfea", fontWeight: 600 }}>
            {decodedEmail || "your email"}
          </Text>
        </div>

        <OtpRow $shake={shaking}>
          {digits.map((d, i) => (
            <OtpInput
              key={i}
              ref={(el) => { if (el) inputRefs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={d}
              $filled={!!d}
              $error={!!error}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={handlePaste}
              autoFocus={i === 0}
              disabled={verifying}
            />
          ))}
        </OtpRow>

        {error && <OtpErrorText>{error}</OtpErrorText>}

        <SubmitBtn
          htmlType="button"
          loading={verifying}
          disabled={!allFilled}
          onClick={() => verify(getCode())}
        >
          {verifying ? "Verifying…" : "Verify & Continue"}
        </SubmitBtn>

        <ResendRow>
          {countdown > 0 ? (
            <Space>
              <span>Resend code in</span>
              <Text style={{ color: "#5ecfea", fontWeight: 600 }}>{countdown}s</Text>
            </Space>
          ) : (
            <LinkBtn onClick={resend} disabled={resending}>
              <ReloadOutlined />
              {resending ? " Sending…" : " Resend code"}
            </LinkBtn>
          )}
        </ResendRow>

        <FooterText>
          Wrong email?{" "}
          <LinkBtn onClick={() => router.push("/login?tab=signup")}>
            Go back to sign up
          </LinkBtn>
        </FooterText>
      </GlassCard>
    </SceneWrapper>
  );
}

const VerifyEmailPage = () => (
  <Suspense>
    <VerifyEmailInner />
  </Suspense>
);

export default VerifyEmailPage;
