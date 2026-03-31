"use client";

import { useState, useEffect } from "react";
import { Form, Input, App, Spin, Result, Typography } from "antd";
import { useRouter, useParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { SceneWrapper, Overlay, OrbitRing, Particle, LogoRow, LogoIcon, LogoText, GlassCard, SubmitBtn, CardTitle, CardSubtext, TightFormItem } from "@/app/(auth)/login/login.styled";

const { Text } = Typography;

const ORBIT_SIZES = [380, 600, 840];

const PARTICLES = [
  { w: 8,  top: "18%", left: "12%", dur: "6s",  delay: "0s"   },
  { w: 5,  top: "72%", left: "82%", dur: "8s",  delay: "1s"   },
  { w: 6,  top: "82%", left: "10%", dur: "9s",  delay: "0.5s" },
];

type InviteInfo = {
  email: string;
  orgName: string;
  role: string;
  inviterName: string;
};

const AcceptInvitePage = () => {
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const token = params.token;
  const { message } = App.useApp();

  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    const validate = async () => {
      try {
        const res = await fetch(`/api/invitations/${token}`);
        if (!res.ok) {
          setInvalid(true);
        } 
        else {
          const data = await res.json();
          setInviteInfo(data);
          form.setFieldsValue({ email: data.email });
        }
      } 
      catch (error) {
        console.error(error);
        setInvalid(true);
      } 
      finally {
        setValidating(false);
      }
    };

    validate();
  }, [token, form]);

  const onAccept = async (values: { name: string; password: string; confirmPassword: string }) => {
    if (values.password !== values.confirmPassword) {
      message.error("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/invitations/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: values.name, password: values.password }),
      });

      const data = await res.json();
      if (!res.ok) {
        message.error(data.error ?? "Could not accept invitation");
        return;
      }

      message.success("Welcome! Signing you in…");
      const result = await signIn("credentials", {
        email: inviteInfo?.email,
        password: values.password,
        redirect: false,
      });

      if (result?.error) {
        message.info("Account created. Please sign in.");
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
        {validating ? (
          <Spin size="large" style={{ display: "block", margin: "32px auto" }} />
        ) : invalid ? (
          <Result
            status="error"
            title="Invalid or Expired Invitation"
            subTitle="This invitation link is no longer valid. Please ask your team owner to send a new invite."
          />
        ) : (
          <>
            <CardTitle>You&apos;re Invited!</CardTitle>
            <CardSubtext>
              {inviteInfo?.inviterName} has invited you to join{" "}
              <Text strong>{inviteInfo?.orgName}</Text> as{" "}
              <Text strong>{inviteInfo?.role}</Text>.
            </CardSubtext>

            <Form form={form} layout="vertical" onFinish={onAccept} style={{ marginTop: 16 }}>
              <TightFormItem name="email">
                <Input disabled size="large" />
              </TightFormItem>

              <TightFormItem
                name="name"
                rules={[{ required: true, message: "Your name is required" }]}
              >
                <Input placeholder="Your full name" size="large" />
              </TightFormItem>

              <TightFormItem
                name="password"
                rules={[
                  { required: true, message: "Password is required" },
                  { min: 8, message: "Minimum 8 characters" },
                ]}
              >
                <Input.Password placeholder="Set a password" size="large" autoComplete="new-password" />
              </TightFormItem>

              <TightFormItem
                name="confirmPassword"
                rules={[{ required: true, message: "Please confirm your password" }]}
              >
                <Input.Password placeholder="Confirm password" size="large" autoComplete="new-password" />
              </TightFormItem>

              <SubmitBtn type="primary" htmlType="submit" loading={loading} block>
                Accept Invitation &amp; Create Account
              </SubmitBtn>
            </Form>
          </>
        )}
      </GlassCard>
    </SceneWrapper>
  );
}

export default AcceptInvitePage;