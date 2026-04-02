"use client";

import { useState, useEffect, Suspense } from "react";
import { Form, Input, Select, App, Steps, Typography, Space } from "antd";
import { ShopOutlined, RocketOutlined, CrownOutlined, StarFilled } from "@ant-design/icons";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { SceneWrapper, Overlay, OrbitRing, Particle, LogoRow, LogoIcon, LogoText, SubmitBtn, CardTitle, CardSubtext, FooterText } from "@/app/(auth)/login/login.styled";
import { OnboardingCard, PlanGrid, PlanCard, PopularBadge, PlanSelectedIcon, PlanName, PlanPrice, PlanDesc, StepNavRow, BackBtn, ProBanner, EnterpriseBanner } from "./onboarding.styled";

const { Text } = Typography;

// ─── Constants ──────────────────────────────────────────────────────────────

const ORBIT_SIZES = [380, 600, 840];
const PARTICLES = [
  { w: 8,  top: "18%", left: "12%", dur: "6s",  delay: "0s"   },
  { w: 5,  top: "72%", left: "82%", dur: "8s",  delay: "1s"   },
  { w: 6,  top: "82%", left: "10%", dur: "9s",  delay: "0.5s" },
];

const INDUSTRIES = [
  "Clothing & Apparel",
  "Electronics",
  "Grocery & FMCG",
  "Beauty & Personal Care",
  "Furniture & Home Decor",
  "Pharmacy",
  "Books & Stationery",
  "Sports & Fitness",
  "Jewelry & Accessories",
  "Other",
];

const PLANS = [
  {
    id: "free",
    name: "Starter",
    price: "Free",
    desc: "Up to 100 products",
    icon: <ShopOutlined style={{ fontSize: 22, color: "#5ecfea", marginBottom: 8 }} />,
    popular: false,
  },
  {
    id: "pro",
    name: "Growth",
    price: "₹2,499/mo",
    desc: "1 month free trial",
    icon: <RocketOutlined style={{ fontSize: 22, color: "#f0d060", marginBottom: 8 }} />,
    popular: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "Custom",
    desc: "Contact sales",
    icon: <CrownOutlined style={{ fontSize: 22, color: "#c87eff", marginBottom: 8 }} />,
    popular: false,
  },
] as const;

// ─── Main Component ───────────────────────────────────────────────────────────

const OnboardingInner = () => {
  const router = useRouter();
  const { data: session, status, update: updateSession } = useSession();
  const { message } = App.useApp();
  const [stepIndex, setStepIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [plan, setPlan] = useState<"free" | "pro" | "enterprise">("free");
  const [businessForm] = Form.useForm();

  // Redirect if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  // Pre-select plan from sessionStorage (set by landing page pricing buttons)
  useEffect(() => {
    const stored = sessionStorage.getItem("selectedPlan");
    if (stored === "pro" || stored === "free" || stored === "enterprise") {
      setPlan(stored as "free" | "pro" | "enterprise");
    }
  }, []);

  const firstName = session?.user?.name?.split(" ")[0] ?? "there";

  // ─── Step 1 → Step 2 ─────────────────────────────────────────────────────
  const goToStep2 = () => {
    businessForm.validateFields().then(() => setStepIndex(1));
  };

  // ─── Final Submit ─────────────────────────────────────────────────────────
  const onComplete = async () => {
    const values = businessForm.getFieldsValue();
    setSubmitting(true);

    try {
      const res = await fetch("/api/onboarding/register-business", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: values.businessName,
          industry: values.industry ?? null,
          storeName: values.storeName || "Main Store",
          storeCity: values.storeCity ?? null,
          plan,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        message.error(data.error ?? "Could not finish setup");
        return;
      }

      sessionStorage.removeItem("selectedPlan");
      // Refresh JWT so orgId/storeId is picked up
      await updateSession();
      message.success("Setup complete! Welcome to Stockiva 🎉");
      router.push("/dashboard");
    } 
    catch (error) {
      console.error(error);
      message.error("Something went wrong. Please try again.");
    } 
    finally {
      setSubmitting(false);
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

      <OnboardingCard>
        <div style={{ marginBottom: 28 }}>
          <Steps
            current={stepIndex}
            size="small"
            items={[
              { title: <Text style={{ color: "#fff", fontSize: 13 }}>Business Info</Text> },
              { title: <Text style={{ color: "#fff", fontSize: 13 }}>Choose Plan</Text> },
            ]}
            style={{ "--ant-color-primary": "#5ecfea" } as React.CSSProperties}
          />
        </div>

        {/* ─── Step 1: Business Info ─ */}
        {stepIndex === 0 && (
          <>
            <Space orientation="vertical" size={2} style={{ marginBottom: 24 }}>
              <CardTitle level={3}>Hi {firstName}! 👋</CardTitle>
              <CardSubtext $mb={0}>Tell us a bit about your business</CardSubtext>
            </Space>

            <Form form={businessForm} layout="vertical" autoComplete="off">
              <Form.Item
                name="businessName"
                label={<Text style={{ color: "rgba(255,255,255,0.7)" }}>Business Name</Text>}
                rules={[{ required: true, message: "Please enter your business name" }]}
              >
                <Input
                  prefix={<ShopOutlined />}
                  placeholder="e.g. Rare Thread Co."
                  size="large"
                />
              </Form.Item>

              <Form.Item
                name="industry"
                label={<Text style={{ color: "rgba(255,255,255,0.7)" }}>Industry</Text>}
              >
                <Select
                  placeholder="Select your industry (optional)"
                  size="large"
                  options={INDUSTRIES.map((ind) => ({ label: ind, value: ind }))}
                  allowClear
                  popupMatchSelectWidth={false}
                />
              </Form.Item>

              <Form.Item
                name="storeName"
                label={<Text style={{ color: "rgba(255,255,255,0.7)" }}>Store Name</Text>}
              >
                <Input placeholder="Main Store" size="large" />
              </Form.Item>

              <Form.Item
                name="storeCity"
                label={<Text style={{ color: "rgba(255,255,255,0.7)" }}>Store City</Text>}
              >
                <Input placeholder="e.g. Mumbai (optional)" size="large" />
              </Form.Item>

              <SubmitBtn htmlType="button" onClick={goToStep2}>
                Next →
              </SubmitBtn>
            </Form>
          </>
        )}

        {/* ─── Step 2: Plan ─ */}
        {stepIndex === 1 && (
          <>
            <Space orientation="vertical" size={2} style={{ marginBottom: 24 }}>
              <CardTitle level={3}>Choose your plan</CardTitle>
              <CardSubtext $mb={0}>You can change this any time from settings</CardSubtext>
            </Space>

            <PlanGrid>
              {PLANS.map((p) => (
                <PlanCard
                  key={p.id}
                  $selected={plan === p.id}
                  onClick={() => setPlan(p.id as typeof plan)}
                >
                  {p.popular && <PopularBadge>Popular</PopularBadge>}
                  {plan === p.id && <PlanSelectedIcon />}
                  <div>{p.icon}</div>
                  <PlanName>{p.name}</PlanName>
                  <PlanPrice>{p.price}</PlanPrice>
                  <PlanDesc>{p.desc}</PlanDesc>
                </PlanCard>
              ))}
            </PlanGrid>

            {plan === "pro" && (
              <ProBanner>
                <StarFilled style={{ color: "#5ecfea", marginRight: 8 }} />
                Your first month is <strong style={{ color: "#fff" }}>completely free</strong>. No
                credit card required.
              </ProBanner>
            )}

            {plan === "enterprise" && (
              <EnterpriseBanner>
                <CrownOutlined style={{ color: "#c87eff", marginRight: 8 }} />
                Our team will reach out within 24 hours to discuss your needs.
              </EnterpriseBanner>
            )}

            <StepNavRow>
              <BackBtn onClick={() => setStepIndex(0)}>← Back</BackBtn>
              <SubmitBtn
                htmlType="button"
                loading={submitting}
                onClick={onComplete}
                style={{ flex: 2, marginBottom: 0 }}
              >
                {submitting ? "Setting up…" : "Complete Setup →"}
              </SubmitBtn>
            </StepNavRow>
          </>
        )}

        <FooterText>© 2026 Stockiva. All rights reserved.</FooterText>
      </OnboardingCard>
    </SceneWrapper>
  );
}

const OnboardingPage = () => (
  <Suspense>
    <OnboardingInner />
  </Suspense>
);

export default OnboardingPage;
