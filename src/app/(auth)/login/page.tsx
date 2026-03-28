"use client";

import { Form, Input, Typography, App, Divider } from "antd";
import { LockOutlined, MailOutlined, UserOutlined, BoxPlotOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

const { Title, Text } = Typography;

type Mode = "signin" | "signup" | "forgot";

// ─── Google SVG ────────────────────────────────────────────────────────────────
const GoogleIcon = () => {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
      <path fill="none" d="M0 0h48v48H0z"/>
    </svg>
  );
}

const LoginPage = () => {
  const router = useRouter();
  const { message } = App.useApp();
  const [mode, setMode] = useState<Mode>("signin");
  const [signinLoading, setSigninLoading] = useState(false);
  const [signupLoading, setSignupLoading] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [signinForm] = Form.useForm();
  const [signupForm] = Form.useForm();
  const [forgotForm] = Form.useForm();
  const { status } = useSession();

  useEffect(() => {
    if (status === "authenticated") router.replace("/dashboard");
  }, [status, router]);

  // ─── Sign In ──────────────────────────────────────────────────────────────
  const onSignIn = async (values: { email: string; password: string }) => {
    setSigninLoading(true);
    try {
      const result = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false,
      });

      if (result?.error) {
        message.error("Invalid email or password");
      } 
      else {
        router.push("/dashboard");
      }
    } 
    catch (error) {
      console.error(error);
      message.error("Something went wrong. Please try again.");
    } 
    finally {
      setSigninLoading(false);
    }
  };

  // ─── Sign Up ──────────────────────────────────────────────────────────────
  const onSignUp = async (values: { name: string; email: string; password: string; confirmPassword: string }) => {
    if (values.password !== values.confirmPassword) {
      message.error("Passwords do not match");
      return;
    }

    setSignupLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: values.name, email: values.email, password: values.password }),
      });

      const data = await res.json();
      if (!res.ok) {
        message.error(data.error ?? "Registration failed");
      } 
      else {
        message.success("Account created! Signing you in…");
        const result = await signIn("credentials", {
          email: values.email,
          password: values.password,
          redirect: false,
        });
        if (result?.error) setMode("signin");
        else router.push("/dashboard");
      }
    } 
    catch (error) {
      console.error(error);
      message.error("Something went wrong. Please try again.");
    } 
    finally {
      setSignupLoading(false);
    }
  };

  // ─── Forgot Password ──────────────────────────────────────────────────────
  const onForgot = async (values: { email: string }) => {
    setForgotLoading(true);
    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: values.email }),
      });
      message.success("If that email exists, a reset link has been sent.");
      forgotForm.resetFields();
      setMode("signin");
    } 
    catch (error) {
      console.error(error);
      message.error("Something went wrong. Please try again.");
    } 
    finally {
      setForgotLoading(false);
    }
  };

  // ─── Google OAuth ─────────────────────────────────────────────────────────
  const onGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      await signIn("google", { callbackUrl: "/dashboard" });
    } 
    catch (error) {
      console.error(error);
      message.error("Google sign-in is not configured.");
    } 
    finally {
      setGoogleLoading(false);
    }
  };

  return (
    <>
      <style>{`
        /* ── Keyframes ── */
        @keyframes spinSlow {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes cardEntrance {
          from { opacity: 0; transform: translateY(32px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes floatParticle {
          0%, 100% { transform: translateY(0px) scale(1);   opacity: 0.18; }
          50%       { transform: translateY(-50px) scale(1.15); opacity: 0.32; }
        }

        /* ── Glass card ── */
        .auth-glass-card {
          background: rgba(8, 28, 40, 0.72);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(255,255,255,0.13);
          border-radius: 20px;
          padding: 40px 40px 32px;
          width: 100%;
          max-width: 420px;
          box-shadow: 0 32px 80px rgba(0,0,0,0.55);
          animation: cardEntrance 0.55s cubic-bezier(0.16,1,0.3,1) forwards;
        }

        /* ── Tab toggle ── */
        .auth-tab-row {
          display: inline-flex;
          background: rgba(255,255,255,0.10);
          border-radius: 24px;
          padding: 4px;
          margin-bottom: 28px;
        }
        .auth-tab {
          padding: 7px 22px;
          border-radius: 20px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          border: none;
          background: transparent;
          color: rgba(255,255,255,0.45);
          transition: background 0.2s, color 0.2s;
        }
        .auth-tab.active {
          background: #5ecfea;
          color: #071e28;
        }
        .auth-tab:hover:not(.active) { color: #fff; }

        /* ── Form fields ── */
        .auth-glass-card .ant-input-affix-wrapper,
        .auth-glass-card .ant-input {
          background: rgba(255,255,255,0.13) !important;
          border-color: rgba(255,255,255,0.28) !important;
          color: #fff !important;
          border-radius: 8px !important;
          padding: 10px 14px !important;
        }
        .auth-glass-card .ant-input-affix-wrapper .ant-input {
          background: transparent !important;
          padding: 0 !important;
        }
        .auth-glass-card .ant-input-affix-wrapper:hover,
        .auth-glass-card .ant-input-affix-wrapper-focused {
          border-color: #5ecfea !important;
        }
        .auth-glass-card .ant-input::placeholder { color: rgba(255,255,255,0.38) !important; }
        .auth-glass-card .ant-input-prefix svg,
        .auth-glass-card .ant-input-suffix svg { color: rgba(255,255,255,0.45) !important; }
        .auth-glass-card .ant-input-password-icon { color: rgba(255,255,255,0.45) !important; }
        .auth-glass-card .ant-form-item-explain-error { color: #ff8fa3 !important; }

        /* ── Google button ── */
        .auth-google-btn {
          width: 100%;
          padding: 11px;
          border: 1.5px solid rgba(255,255,255,0.18);
          border-radius: 8px;
          background: rgba(255,255,255,0.08);
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: background 0.2s, border-color 0.2s;
          margin-bottom: 20px;
        }
        .auth-google-btn:hover {
          background: rgba(255,255,255,0.14);
          border-color: #5ecfea;
        }

        /* ── Submit button ── */
        .auth-submit-btn {
          width: 100%;
          padding: 13px;
          border-radius: 8px;
          background: #5ecfea;
          border: none;
          color: #071e28;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.2s, transform 0.15s;
          margin-bottom: 16px;
          letter-spacing: 0.2px;
        }
        .auth-submit-btn:hover  { background: #79d9ef; }
        .auth-submit-btn:active { transform: scale(0.98); }

        /* ── Divider override ── */
        .auth-glass-card .ant-divider { border-color: rgba(255,255,255,0.12) !important; }
        .auth-glass-card .ant-divider-inner-text { color: rgba(255,255,255,0.3) !important; font-size: 12px; }

        /* ── Responsive ── */
        @media (max-width: 480px) {
          .auth-glass-card { padding: 28px 20px 24px; margin: 16px; }
        }
      `}</style>

      {/* ── Full-viewport background ─────────────────────────────────────── */}
      <div
        style={{
          minHeight: "100vh",
          position: "relative",
          backgroundImage: "url('/stockiva_banner.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        {/* Dark overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(135deg, rgba(4,16,24,0.72) 0%, rgba(7,30,42,0.68) 60%, rgba(4,16,24,0.78) 100%)",
          }}
        />

        {/* Decorative concentric circles */}
        {[380, 600, 840].map((size, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: size,
              height: size,
              marginTop: -size / 2,
              marginLeft: -size / 2,
              border: "1px solid rgba(94,207,234,0.08)",
              borderRadius: "50%",
              animation: `spinSlow ${24 + i * 10}s linear infinite`,
              animationDirection: i % 2 === 0 ? "normal" : "reverse",
              pointerEvents: "none",
            }}
          />
        ))}

        {/* Floating ambient particles */}
        {[
          { w: 8,  top: "18%", left: "12%", dur: "6s",  delay: "0s"   },
          { w: 5,  top: "72%", left: "82%", dur: "8s",  delay: "1s"   },
          { w: 10, top: "38%", left: "90%", dur: "7s",  delay: "2s"   },
          { w: 6,  top: "82%", left: "10%", dur: "9s",  delay: "0.5s" },
          { w: 7,  top: "12%", left: "78%", dur: "5s",  delay: "1.5s" },
          { w: 4,  top: "55%", left: "6%",  dur: "10s", delay: "3s"   },
        ].map((p, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              width: p.w,
              height: p.w,
              top: p.top,
              left: p.left,
              borderRadius: "50%",
              background: "rgba(94,207,234,0.22)",
              animation: `floatParticle ${p.dur} ease-in-out infinite`,
              animationDelay: p.delay,
              pointerEvents: "none",
            }}
          />
        ))}

        {/* Logo — top-left corner */}
        <div
          style={{
            position: "absolute",
            top: 28,
            left: 36,
            display: "flex",
            alignItems: "center",
            gap: 10,
            zIndex: 10,
          }}
        >
          <BoxPlotOutlined style={{ fontSize: 26, color: "#5ecfea" }} />
          <span style={{ fontSize: 20, fontWeight: 700, color: "#fff", letterSpacing: "-0.4px" }}>
            Stockiva
          </span>
        </div>

        {/* ── Glass Card ─────────────────────────────────────────────────── */}
        <div className="auth-glass-card" style={{ position: "relative", zIndex: 2 }}>

          {/* ─ Forgot Password View ─ */}
          {mode === "forgot" && (
            <>
              <button
                onClick={() => setMode("signin")}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: "rgba(255,255,255,0.45)", display: "flex",
                  alignItems: "center", gap: 6, padding: 0, marginBottom: 24, fontSize: 13,
                }}
              >
                <ArrowLeftOutlined /> Back to sign in
              </button>
              <Title level={3} style={{ marginBottom: 4, color: "#fff" }}>
                Forgot password?
              </Title>
              <Text style={{ display: "block", marginBottom: 28, color: "rgba(255,255,255,0.5)" }}>
                Enter your email and we&apos;ll send a reset link.
              </Text>
              <Form form={forgotForm} layout="vertical" onFinish={onForgot}>
                <Form.Item
                  name="email"
                  rules={[
                    { required: true, message: "Please enter your email" },
                    { type: "email", message: "Please enter a valid email" },
                  ]}
                >
                  <Input
                    prefix={<MailOutlined />}
                    placeholder="Your account email"
                    size="large"
                  />
                </Form.Item>
                <button
                  className="auth-submit-btn"
                  type="submit"
                  onClick={() => forgotForm.submit()}
                  disabled={forgotLoading}
                >
                  {forgotLoading ? "Sending…" : "Send Reset Link"}
                </button>
              </Form>
            </>
          )}

          {/* ─ Sign In / Sign Up Views ─ */}
          {mode !== "forgot" && (
            <>
              {/* Tab toggle */}
              <div className="auth-tab-row">
                <button
                  className={`auth-tab ${mode === "signin" ? "active" : ""}`}
                  onClick={() => setMode("signin")}
                >
                  Sign In
                </button>
                <button
                  className={`auth-tab ${mode === "signup" ? "active" : ""}`}
                  onClick={() => setMode("signup")}
                >
                  Sign Up
                </button>
              </div>

              {/* ─ Sign In ─ */}
              {mode === "signin" && (
                <>
                  <Title level={3} style={{ marginBottom: 4, color: "#fff" }}>
                    Welcome back
                  </Title>
                  <Text style={{ display: "block", marginBottom: 24, color: "rgba(255,255,255,0.5)" }}>
                    Sign in to continue to your store
                  </Text>

                  <button className="auth-google-btn" onClick={onGoogleSignIn} disabled={googleLoading}>
                    <GoogleIcon />
                    {googleLoading ? "Redirecting…" : "Continue with Google"}
                  </button>

                  <Divider style={{ margin: "0 0 20px" }}>or with email</Divider>

                  <Form form={signinForm} layout="vertical" onFinish={onSignIn} autoComplete="off">
                    <Form.Item
                      name="email"
                      rules={[
                        { required: true, message: "Please enter your email" },
                        { type: "email", message: "Please enter a valid email" },
                      ]}
                    >
                      <Input prefix={<MailOutlined />} placeholder="Email address" size="large" />
                    </Form.Item>
                    <Form.Item
                      name="password"
                      rules={[{ required: true, message: "Please enter your password" }]}
                      style={{ marginBottom: 8 }}
                    >
                      <Input.Password prefix={<LockOutlined />} placeholder="Password" size="large" />
                    </Form.Item>

                    <div style={{ textAlign: "right", marginBottom: 20 }}>
                      <button
                        type="button"
                        onClick={() => setMode("forgot")}
                        style={{
                          background: "none", border: "none", cursor: "pointer",
                          color: "#5ecfea", fontSize: 13, padding: 0,
                        }}
                      >
                        Forgot password?
                      </button>
                    </div>

                    <button
                      className="auth-submit-btn"
                      type="submit"
                      onClick={() => signinForm.submit()}
                      disabled={signinLoading}
                    >
                      {signinLoading ? "Signing in…" : "Sign In"}
                    </button>
                  </Form>

                  <div style={{ textAlign: "center", marginTop: 4 }}>
                    <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>
                      New here?{" "}
                      <button
                        onClick={() => setMode("signup")}
                        style={{
                          background: "none", border: "none", cursor: "pointer",
                          color: "#5ecfea", fontWeight: 600, padding: 0, fontSize: 13,
                        }}
                      >
                        Create an account
                      </button>
                    </Text>
                  </div>
                </>
              )}

              {/* ─ Sign Up ─ */}
              {mode === "signup" && (
                <>
                  <Title level={3} style={{ marginBottom: 4, color: "#fff" }}>
                    Create account
                  </Title>
                  <Text style={{ display: "block", marginBottom: 24, color: "rgba(255,255,255,0.5)" }}>
                    Get started with Stockiva for free
                  </Text>

                  <button className="auth-google-btn" onClick={onGoogleSignIn} disabled={googleLoading}>
                    <GoogleIcon />
                    {googleLoading ? "Redirecting…" : "Sign up with Google"}
                  </button>

                  <Divider style={{ margin: "0 0 20px" }}>or with email</Divider>

                  <Form form={signupForm} layout="vertical" onFinish={onSignUp} autoComplete="off">
                    <Form.Item
                      name="name"
                      rules={[{ required: true, message: "Please enter your name" }]}
                    >
                      <Input prefix={<UserOutlined />} placeholder="Full name" size="large" />
                    </Form.Item>
                    <Form.Item
                      name="email"
                      rules={[
                        { required: true, message: "Please enter your email" },
                        { type: "email", message: "Please enter a valid email" },
                      ]}
                    >
                      <Input prefix={<MailOutlined />} placeholder="Email address" size="large" />
                    </Form.Item>
                    <Form.Item
                      name="password"
                      rules={[
                        { required: true, message: "Please enter a password" },
                        { min: 8, message: "Password must be at least 8 characters" },
                      ]}
                    >
                      <Input.Password prefix={<LockOutlined />} placeholder="Password (min. 8 chars)" size="large" />
                    </Form.Item>
                    <Form.Item
                      name="confirmPassword"
                      rules={[{ required: true, message: "Please confirm your password" }]}
                    >
                      <Input.Password prefix={<LockOutlined />} placeholder="Confirm password" size="large" />
                    </Form.Item>

                    <button
                      className="auth-submit-btn"
                      type="submit"
                      onClick={() => signupForm.submit()}
                      disabled={signupLoading}
                    >
                      {signupLoading ? "Creating account…" : "Create Account"}
                    </button>
                  </Form>

                  <div style={{ textAlign: "center", marginTop: 4 }}>
                    <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>
                      Already have an account?{" "}
                      <button
                        onClick={() => setMode("signin")}
                        style={{
                          background: "none", border: "none", cursor: "pointer",
                          color: "#5ecfea", fontWeight: 600, padding: 0, fontSize: 13,
                        }}
                      >
                        Sign in
                      </button>
                    </Text>
                  </div>
                </>
              )}
            </>
          )}

          <Text
            style={{
              display: "block",
              textAlign: "center",
              marginTop: 28,
              fontSize: 11,
              color: "rgba(255,255,255,0.18)",
            }}
          >
            © 2026 Stockiva. All rights reserved.
          </Text>
        </div>
      </div>
    </>
  );
}

export default LoginPage;