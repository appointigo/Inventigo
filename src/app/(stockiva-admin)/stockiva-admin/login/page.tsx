"use client";

import { Form, Input, App } from "antd";
import { LockOutlined, MailOutlined } from "@ant-design/icons";
import { signIn, useSession } from "next-auth/react";
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
  TightFormItem,
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

function AdminLoginInner() {
  const router = useRouter();
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const { data: session, status } = useSession();

  // Redirect authenticated super admins to /admin
  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      const user = session.user as { role: string };
      if (user.role === "SUPER_ADMIN") {
        router.replace("/admin");
      }
    }
  }, [status, session, router]);

  const onSignIn = async (values: { email: string; password: string }) => {
    setLoading(true);
    try {
      const result = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false,
      });

      if (result?.error) {
        message.error("Invalid email or password");
      } else {
        router.replace("/admin");
      }
    } catch {
      message.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
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
        <LogoText>Stockiva Admin</LogoText>
      </LogoRow>

      <GlassCard>
        <CardTitle level={3}>Admin Portal</CardTitle>
        <CardSubtext $mb={28}>Sign in with your super admin credentials</CardSubtext>

        <Form form={form} layout="vertical" onFinish={onSignIn} autoComplete="off">
          <Form.Item
            name="email"
            rules={[
              { required: true, message: "Please enter your email" },
              { type: "email", message: "Please enter a valid email" },
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder="Admin email" size="large" />
          </Form.Item>

          <TightFormItem
            name="password"
            rules={[{ required: true, message: "Please enter your password" }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Password" size="large" />
          </TightFormItem>

          <SubmitBtn htmlType="submit" loading={loading} style={{ marginTop: 8 }}>
            Sign In
          </SubmitBtn>
        </Form>

        <BottomRow>
          Setting up for the first time?{" "}
          <LinkBtn onClick={() => router.push("/stockiva-admin/signup")}>
            Create super admin
          </LinkBtn>
        </BottomRow>

        <FooterText>© 2026 Stockiva. All rights reserved.</FooterText>
      </GlassCard>
    </SceneWrapper>
  );
}

const AdminLoginPage = () => (
  <Suspense>
    <AdminLoginInner />
  </Suspense>
);

export default AdminLoginPage;
