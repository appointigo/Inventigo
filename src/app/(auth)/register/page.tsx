"use client";

import { useState } from "react";
import { Form, Input, App, Typography } from "antd";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { SceneWrapper, Overlay, OrbitRing, Particle, LogoRow, LogoIcon, LogoText, GlassCard, SubmitBtn, BottomRow, LinkBtn, FooterText, CardTitle, CardSubtext, TightFormItem } from "@/app/(auth)/login/login.styled";

const { Text } = Typography;

const ORBIT_SIZES = [380, 600, 840];

const PARTICLES = [
  { w: 8,  top: "18%", left: "12%", dur: "6s",  delay: "0s"   },
  { w: 5,  top: "72%", left: "82%", dur: "8s",  delay: "1s"   },
  { w: 10, top: "38%", left: "90%", dur: "7s",  delay: "2s"   },
  { w: 6,  top: "82%", left: "10%", dur: "9s",  delay: "0.5s" },
  { w: 7,  top: "12%", left: "78%", dur: "5s",  delay: "1.5s" },
  { w: 4,  top: "55%", left: "6%",  dur: "10s", delay: "3s"   },
];

const RegisterPage = () => {
  const router = useRouter();
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const onRegister = async (values: {
    orgName: string;
    ownerName: string;
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
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgName: values.orgName,
          ownerName: values.ownerName,
          email: values.email,
          password: values.password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        message.error(data.error ?? "Registration failed");
        return;
      }

      message.success("Organization created! Signing you in…");
      const result = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false,
      });

      if (result?.error) {
        message.error("Account created but sign-in failed. Please log in.");
        router.push("/login");
      } 
      else {
        router.push("/dashboard");
      }
    } catch (error) {
      console.error(error);
      message.error("Something went wrong. Please try again.");
    } 
    finally {
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
        <LogoText>Stockiva</LogoText>
      </LogoRow>

      <GlassCard>
        <CardTitle>Create your account</CardTitle>
        <CardSubtext>Start managing your inventory today</CardSubtext>

        <Form form={form} layout="vertical" onFinish={onRegister} style={{ marginTop: 16 }}>
          <TightFormItem
            name="orgName"
            rules={[{ required: true, message: "Business name is required" }]}
          >
            <Input placeholder="Business / Organization name" size="large" />
          </TightFormItem>

          <TightFormItem
            name="ownerName"
            rules={[{ required: true, message: "Your name is required" }]}
          >
            <Input placeholder="Your full name" size="large" />
          </TightFormItem>

          <TightFormItem
            name="email"
            rules={[
              { required: true, message: "Email is required" },
              { type: "email", message: "Enter a valid email" },
            ]}
          >
            <Input placeholder="Email address" size="large" autoComplete="email" />
          </TightFormItem>

          <TightFormItem
            name="password"
            rules={[
              { required: true, message: "Password is required" },
              { min: 8, message: "Password must be at least 8 characters" },
            ]}
          >
            <Input.Password placeholder="Password (min 8 characters)" size="large" autoComplete="new-password" />
          </TightFormItem>

          <TightFormItem
            name="confirmPassword"
            rules={[{ required: true, message: "Please confirm your password" }]}
          >
            <Input.Password placeholder="Confirm password" size="large" autoComplete="new-password" />
          </TightFormItem>

          <SubmitBtn type="primary" htmlType="submit" loading={loading} block>
            Create Account
          </SubmitBtn>
        </Form>

        <BottomRow>
          <FooterText>Already have an account?</FooterText>
          <LinkBtn onClick={() => router.push("/login")}>
            Sign in
          </LinkBtn>
        </BottomRow>
      </GlassCard>
    </SceneWrapper>
  );
}

export default RegisterPage;