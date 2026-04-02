"use client";

import { useState, useEffect } from "react";
import { Form, Input, App, Spin, Result, Typography, Button, Divider } from "antd";
import { useRouter, useParams } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { CheckCircleFilled, TeamOutlined, WarningOutlined } from "@ant-design/icons";
import { SceneWrapper, Overlay, OrbitRing, Particle, LogoRow, LogoIcon, LogoText, GlassCard, SubmitBtn, CardTitle, CardSubtext, TightFormItem, LinkBtn, FooterText } from "@/app/(auth)/login/login.styled";
import { AcceptingAsBanner } from "./invite.styled";

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

// ─── Signed-in acceptance card ─────────────────────────────────────────────

const SignedInAcceptCard = ({
  inviteInfo,
  token,
  sessionEmail,
  sessionOrgId,
}: {
  inviteInfo: InviteInfo;
  token: string;
  sessionEmail: string;
  sessionOrgId: string | null;
}) => {
  const router = useRouter();
  const { message } = App.useApp();
  const { update: updateSession } = useSession();
  const [accepting, setAccepting] = useState(false);

  // Email mismatch
  if (inviteInfo.email.toLowerCase() !== sessionEmail.toLowerCase()) {
    return (
      <Result
        icon={<WarningOutlined style={{ color: "#faad14" }} />}
        title="Wrong account"
        subTitle={
          <>
            This invitation was sent to <Text strong>{inviteInfo.email}</Text>, but you&apos;re
            signed in as <Text strong>{sessionEmail}</Text>. Please sign in with the correct
            account.
          </>
        }
        extra={
          <Button type="primary" onClick={() => router.push("/login")}>
            Sign in with correct account
          </Button>
        }
      />
    );
  }

  // Already in an org
  if (sessionOrgId) {
    return (
      <Result
        icon={<CheckCircleFilled style={{ color: "#52c41a" }} />}
        title="Already in an organization"
        subTitle="You already belong to an organization and cannot join another."
        extra={
          <Button type="primary" onClick={() => router.push("/dashboard")}>
            Go to Dashboard
          </Button>
        }
      />
    );
  }

  const onAccept = async () => {
    setAccepting(true);
    try {
      const res = await fetch(`/api/invitations/${token}/accept`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        message.error(data.error ?? "Could not accept invitation");
        return;
      }
      message.success(data.message ?? "Invitation accepted!");
      await updateSession();
      router.push("/dashboard");
    } 
    catch (error) {
      console.error(error);
      message.error("Something went wrong. Please try again.");
    } 
    finally {
      setAccepting(false);
    }
  };

  return (
    <>
      <div style={{ textAlign: "center", marginBottom: 12 }}>
        <TeamOutlined style={{ fontSize: 48, color: "#5ecfea" }} />
      </div>
      <CardTitle style={{ textAlign: "center" }}>You&apos;re Invited!</CardTitle>
      <CardSubtext style={{ textAlign: "center" }}>
        <Text style={{ color: "rgba(255,255,255,0.6)" }}>
          {inviteInfo.inviterName} has invited you to join{" "}
          <Text strong style={{ color: "#fff" }}>{inviteInfo.orgName}</Text> as{" "}
          <Text strong style={{ color: "#5ecfea" }}>{inviteInfo.role}</Text>.
        </Text>
      </CardSubtext>

      <AcceptingAsBanner>
        Accepting as <Text strong style={{ color: "#fff" }}>{sessionEmail}</Text>
      </AcceptingAsBanner>

      <SubmitBtn htmlType="button" loading={accepting} onClick={onAccept}>
        {accepting ? "Accepting…" : "Accept Invitation →"}
      </SubmitBtn>
    </>
  );
}

const AcceptInvitePage = () => {
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const token = params.token;
  const { message } = App.useApp();
  const { data: session, status: sessionStatus } = useSession();

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
        {(validating || sessionStatus === "loading") ? (
          <Spin size="large" style={{ display: "block", margin: "32px auto" }} />
        ) 
        : invalid ? (
          <Result
            status="error"
            title="Invalid or Expired Invitation"
            subTitle="This invitation link is no longer valid. Please ask your team owner to send a new invite."
          />
        ) 
        : sessionStatus === "authenticated" && inviteInfo ? (
          // ─── Signed-in path: accept or show mismatch/already-in-org ─────
          <SignedInAcceptCard
            inviteInfo={inviteInfo}
            token={token}
            sessionEmail={session!.user!.email!}
            sessionOrgId={(session!.user as { orgId?: string | null }).orgId ?? null}
          />
        ) 
        : (
          // ─── Not signed in: create new account ───────────────────────────
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

            <Divider style={{ borderColor: "rgba(255,255,255,0.1)", margin: "16px 0 8px" }} />
            <div style={{ textAlign: "center", fontSize: 13, color: "rgba(255,255,255,0.4)" }}>
              Already have an account?{" "}
              <LinkBtn onClick={() => router.push("/login")}>Sign in instead</LinkBtn>
            </div>
          </>
        )}
        <FooterText>© 2026 Stockiva. All rights reserved.</FooterText>
      </GlassCard>
    </SceneWrapper>
  );
}

export default AcceptInvitePage;