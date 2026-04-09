"use client";

import { Form, Input, App, Spin } from "antd";
import { LockOutlined, MailOutlined, UserOutlined } from "@ant-design/icons";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import {
  SceneWrapper,
  Overlay,
  OrbitRing,
  Particle,
  LogoRow,
  LogoIcon,
  LogoText,
  GlassCard,
  SubmitBtn,
  CardTitle,
  CardSubtext,
  BottomRow,
  LinkBtn,
  FooterText,
} from "@/app/(auth)/login/login.styled";

const ORBIT_SIZES = [380, 600, 840];

const PARTICLES = [
  { w: 8,  top: "18%", left: "12%", dur: "6s",  delay: "0s"   },
  { w: 5,  top: "72%", left: "82%", dur: "8s",  delay: "1s"   },
  { w: 10, top: "38%", left: "90%", dur: "7s",  delay: "2s"   },
  { w: 6,  top: "82%", left: "10%", dur: "9s",  delay: "0.5s" },
  { w: 7,  top: "12%", left: "78%", dur: "5s",  delay: "1.5s" },
  { w: 4,  top: "55%", left: "6%",  dur: "10s", delay: "3s"   },
];

function AdminSignupInner() {
  const router = useRouter();
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [form] = Form.useForm();

  // Check if bootstrap is still available — redirect to login if not
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/bootstrap-status");
        const data = await res.json();
        if (!data.bootstrapAvailable) {
          message.warning("Super admin already exists. Please sign in.");
          router.replace("/stockiva-admin/login");
        }
      } catch {
        message.error("Could not reach server.");
        router.replace("/stockiva-admin/login");
      } finally {
        setChecking(false);
      }
    })();
  }, [message, router]);

  const onSignUp = async (values: {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
  }) => {
    if (values.password !== values.confirmPassword) {
      message.error("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/create-super-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name,
          email: values.email,
          password: values.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          message.warning("Super admin already exists. Redirecting to login…");
          router.replace("/stockiva-admin/login");
        } else {
          message.error(data.error ?? "Registration failed");
        }
        return;
      }

      message.success("Super admin created! Signing you in…");

      // Auto sign-in after successful creation
      const result = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false,
      });

      if (result?.error) {
        message.error("Account created but sign-in failed. Please log in manually.");
        router.replace("/stockiva-admin/login");
      } else {
        router.replace("/admin");
      }
    } catch {
      message.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <SceneWrapper>
        <Overlay />
        <Spin size="large" />
      </SceneWrapper>
    );
  }

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
        <LogoText>Stockiva Admin</LogoText>
      </LogoRow>

      <GlassCard>
        <CardTitle level={3}>Setup Admin Account</CardTitle>
        <CardSubtext $mb={28}>Create the super admin for this platform</CardSubtext>

        <Form form={form} layout="vertical" onFinish={onSignUp} autoComplete="off">
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

          <SubmitBtn htmlType="submit" loading={loading}>
            Create Super Admin
          </SubmitBtn>
        </Form>

        <BottomRow>
          Already have an account?{" "}
          <LinkBtn onClick={() => router.push("/stockiva-admin/login")}>Sign in</LinkBtn>
        </BottomRow>

        <FooterText>© 2026 Stockiva. All rights reserved.</FooterText>
      </GlassCard>
    </SceneWrapper>
  );
}

const AdminSignupPage = () => (
  <Suspense>
    <AdminSignupInner />
  </Suspense>
);

export default AdminSignupPage;
