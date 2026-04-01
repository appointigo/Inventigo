"use client";

import { Form, Input, App } from "antd";
import { LockOutlined, MailOutlined, UserOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  SceneWrapper,
  Overlay,
  OrbitRing,
  Particle,
  LogoRow,
  LogoIcon,
  LogoText,
  GlassCard,
  TabRow,
  TabBtn,
  GoogleBtn,
  SubmitBtn,
  BackBtn,
  AuthDivider,
  CardTitle,
  CardSubtext,
  ForgotRow,
  ForgotLink,
  BottomRow,
  LinkBtn,
  FooterText,
  TightFormItem,
} from "./login.styled";

type Mode = "signin" | "signup" | "forgot";

const ORBIT_SIZES = [380, 600, 840];

const PARTICLES = [
  { w: 8,  top: "18%", left: "12%", dur: "6s",  delay: "0s"   },
  { w: 5,  top: "72%", left: "82%", dur: "8s",  delay: "1s"   },
  { w: 10, top: "38%", left: "90%", dur: "7s",  delay: "2s"   },
  { w: 6,  top: "82%", left: "10%", dur: "9s",  delay: "0.5s" },
  { w: 7,  top: "12%", left: "78%", dur: "5s",  delay: "1.5s" },
  { w: 4,  top: "55%", left: "6%",  dur: "10s", delay: "3s"   },
];

// ─── Google Icon ──────────────────────────────────────────────────────────────
const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    <path fill="none" d="M0 0h48v48H0z"/>
  </svg>
);

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
  const onSignUp = async (values: { orgName: string; name: string; email: string; password: string; confirmPassword: string }) => {
    if (values.password !== values.confirmPassword) {
      message.error("Passwords do not match");
      return;
    }

    setSignupLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgName: values.orgName, ownerName: values.name, email: values.email, password: values.password }),
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

        {/* ─ Forgot Password ─ */}
        {mode === "forgot" && (
          <>
            <BackBtn onClick={() => setMode("signin")}>
              <ArrowLeftOutlined /> Back to sign in
            </BackBtn>

            <CardTitle level={3}>Forgot password?</CardTitle>
            <CardSubtext $mb={28}>
              Enter your email and we&apos;ll send a reset link.
            </CardSubtext>

            <Form form={forgotForm} layout="vertical" onFinish={onForgot}>
              <Form.Item
                name="email"
                rules={[
                  { required: true, message: "Please enter your email" },
                  { type: "email", message: "Please enter a valid email" },
                ]}
              >
                <Input prefix={<MailOutlined />} placeholder="Your account email" size="large" />
              </Form.Item>

              <SubmitBtn htmlType="submit" loading={forgotLoading}>
                Send Reset Link
              </SubmitBtn>
            </Form>
          </>
        )}

        {/* ─ Sign In / Sign Up ─ */}
        {mode !== "forgot" && (
          <>
            <TabRow>
              <TabBtn $active={mode === "signin"} onClick={() => setMode("signin")}>
                Sign In
              </TabBtn>
              <TabBtn $active={mode === "signup"} onClick={() => setMode("signup")}>
                Sign Up
              </TabBtn>
            </TabRow>

            {/* Sign In */}
            {mode === "signin" && (
              <>
                <CardTitle level={3}>Welcome back</CardTitle>
                <CardSubtext>Sign in to continue to your store</CardSubtext>

                <GoogleBtn onClick={onGoogleSignIn} loading={googleLoading} icon={<GoogleIcon />}>
                  {googleLoading ? "Redirecting…" : "Continue with Google"}
                </GoogleBtn>

                <AuthDivider>or with email</AuthDivider>

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

                  <TightFormItem
                    name="password"
                    rules={[{ required: true, message: "Please enter your password" }]}
                  >
                    <Input.Password prefix={<LockOutlined />} placeholder="Password" size="large" />
                  </TightFormItem>

                  <ForgotRow>
                    <ForgotLink type="button" onClick={() => setMode("forgot")}>
                      Forgot password?
                    </ForgotLink>
                  </ForgotRow>

                  <SubmitBtn htmlType="submit" loading={signinLoading}>
                    Sign In
                  </SubmitBtn>
                </Form>

                <BottomRow>
                  New here?{" "}
                  <LinkBtn onClick={() => setMode("signup")}>Create an account</LinkBtn>
                </BottomRow>
              </>
            )}

            {/* Sign Up */}
            {mode === "signup" && (
              <>
                <CardTitle level={3}>Create account</CardTitle>
                <CardSubtext>Get started with Stockiva for free</CardSubtext>

                <GoogleBtn onClick={onGoogleSignIn} loading={googleLoading} icon={<GoogleIcon />}>
                  {googleLoading ? "Redirecting…" : "Sign up with Google"}
                </GoogleBtn>

                <AuthDivider>or with email</AuthDivider>

                <Form form={signupForm} layout="vertical" onFinish={onSignUp} autoComplete="off">
                  <Form.Item
                    name="orgName"
                    rules={[{ required: true, message: "Please enter your organization name" }]}
                  >
                    <Input prefix={<UserOutlined />} placeholder="Organization / Store name" size="large" />
                  </Form.Item>

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
                    <Input.Password
                      prefix={<LockOutlined />}
                      placeholder="Password (min. 8 chars)"
                      size="large"
                    />
                  </Form.Item>

                  <Form.Item
                    name="confirmPassword"
                    rules={[{ required: true, message: "Please confirm your password" }]}
                  >
                    <Input.Password
                      prefix={<LockOutlined />}
                      placeholder="Confirm password"
                      size="large"
                    />
                  </Form.Item>

                  <SubmitBtn htmlType="submit" loading={signupLoading}>
                    Create Account
                  </SubmitBtn>
                </Form>

                <BottomRow>
                  Already have an account?{" "}
                  <LinkBtn onClick={() => setMode("signin")}>Sign in</LinkBtn>
                </BottomRow>
              </>
            )}
          </>
        )}

        <FooterText>© 2026 Stockiva. All rights reserved.</FooterText>
      </GlassCard>
    </SceneWrapper>
  );
};

export default LoginPage;