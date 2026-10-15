"use client";

import { useState, useEffect, Suspense } from "react";
import { Form, Input, Select, App, Steps, Typography, Space, Segmented } from "antd";
import { ShopOutlined, RocketOutlined, CrownOutlined } from "@ant-design/icons";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { SUBSCRIPTION_CATALOG } from "@/config/subscriptions/pricing";
import { SceneWrapper, Overlay, OrbitRing, Particle, LogoRow, LogoIcon, LogoText, SubmitBtn, CardTitle, CardSubtext, FooterText } from "@/app/(auth)/login/login.styled";
import { OnboardingCard, PlanGrid, PlanCard, PopularBadge, PlanSelectedIcon, PlanName, PlanPrice, PlanPeriod, PlanDesc, PlanDivider, PlanFeatsList, PlanFeatsItem, PlanCheckMark, StepNavRow, BackBtn, ProBanner } from "./onboarding.styled";

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

type PlanKey = (typeof SUBSCRIPTION_CATALOG.plans)[number]["key"];
type BillingInterval = "MONTH" | "YEAR";

const planIcons = {
  starter: ShopOutlined,
  growth: RocketOutlined,
  business: CrownOutlined,
} as const;

const formatRupees = (paise: number) => new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
}).format(paise / 100);

function planFromLanding(value: string | null): PlanKey | null {
  if (value === "starter" || value === "free") return "starter";
  if (value === "growth" || value === "pro") return "growth";
  if (value === "business" || value === "enterprise") return "business";
  return null;
}

// ─── Main Component ───────────────────────────────────────────────────────────

const OnboardingInner = () => {
  const router = useRouter();
  const { data: session, status, update: updateSession } = useSession();
  const { message } = App.useApp();
  const [stepIndex, setStepIndex] = useState(0);
  const [selectedPlan, setSelectedPlan] = useState<PlanKey>("starter");
  const [interval, setInterval] = useState<BillingInterval>("MONTH");
  const [submitting, setSubmitting] = useState(false);
  const [businessForm] = Form.useForm();

  // Redirect if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  useEffect(() => {
    const preferredPlan = planFromLanding(sessionStorage.getItem("selectedPlan"));
    if (preferredPlan) setSelectedPlan(preferredPlan);
  }, []);

  const firstName = session?.user?.name?.split(" ")[0] ?? "there";

  const goToPlans = async () => {
    const values = await businessForm.validateFields().catch(() => null);
    if (values) setStepIndex(1);
  };

  // ─── Final Submit ─────────────────────────────────────────────────────────
  const onComplete = async () => {
    const values = await businessForm.validateFields().catch(() => null);
    if (!values) return;
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
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        message.error(data.error ?? "Could not finish setup");
        return;
      }

      sessionStorage.removeItem("selectedPlan");
      // A preference for the eventual checkout, never proof of payment or access.
      sessionStorage.setItem("pendingSubscriptionChoice", JSON.stringify({
        planKey: selectedPlan,
        interval,
        catalogVersion: SUBSCRIPTION_CATALOG.version,
      }));
      // Pass the server-confirmed values directly into the JWT callback via
      // update(data). This is the reliable path in NextAuth v5: the `session`
      // param in the jwt callback receives these values immediately under
      // trigger="update", with no DB round-trip or timing race.
      await updateSession({
        orgId: data.orgId as string,
        storeId: data.storeId as string,
        role: "OWNER",
      });
      message.success("Workspace created. Review your plan before payment.");
      router.push(`/subscription/checkout?plan=${selectedPlan}&interval=${interval}`);
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
              { title: <Text style={{ color: "#fff", fontSize: 13 }}>Business info</Text> },
              { title: <Text style={{ color: "#fff", fontSize: 13 }}>View plans</Text> },
            ]}
          />
        </div>

        <div style={{ display: stepIndex === 0 ? undefined : "none" }}>
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

              <SubmitBtn htmlType="button" onClick={goToPlans}>
                View plans →
              </SubmitBtn>
            </Form>
        </div>

        {stepIndex === 1 && (
          <div>
            <Space orientation="vertical" size={2} style={{ marginBottom: 16 }}>
              <CardTitle level={3}>Choose a plan to preview</CardTitle>
              <CardSubtext $mb={0}>Final pricing and taxes will be shown before checkout.</CardSubtext>
            </Space>

            <div style={{ marginBottom: 24 }}>
              <Segmented<BillingInterval>
                value={interval}
                onChange={setInterval}
                options={[{ label: "Monthly", value: "MONTH" }, { label: "Yearly", value: "YEAR" }]}
              />
            </div>

            <PlanGrid>
              {SUBSCRIPTION_CATALOG.plans.map((plan) => {
                const Icon = planIcons[plan.key];
                const selected = selectedPlan === plan.key;
                const amount = interval === "MONTH" ? plan.monthlyPaise : plan.annualPaise;
                return (
                  <PlanCard
                    key={plan.key}
                    $selected={selected}
                    role="button"
                    tabIndex={0}
                    aria-pressed={selected}
                    onClick={() => setSelectedPlan(plan.key)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedPlan(plan.key);
                      }
                    }}
                  >
                    {plan.key === "growth" && <PopularBadge>Popular</PopularBadge>}
                    {selected && <PlanSelectedIcon />}
                    <Icon style={{ fontSize: 24, color: "#5ecfea", marginBottom: 8 }} />
                    <PlanName>{plan.name}</PlanName>
                    <PlanPrice>{formatRupees(amount)}</PlanPrice>
                    <PlanPeriod>per {interval === "MONTH" ? "month" : "year"}, plus applicable tax</PlanPeriod>
                    <PlanDesc>{plan.description}</PlanDesc>
                    <PlanDivider />
                    <PlanFeatsList>
                      <PlanFeatsItem><PlanCheckMark>✓</PlanCheckMark>{plan.features["stores.max"]} stores</PlanFeatsItem>
                      <PlanFeatsItem><PlanCheckMark>✓</PlanCheckMark>{plan.features["team.seats.max"]} team members</PlanFeatsItem>
                      <PlanFeatsItem><PlanCheckMark>✓</PlanCheckMark>POS billing and inventory</PlanFeatsItem>
                      {"purchasing.orders" in plan.features && (
                        <PlanFeatsItem><PlanCheckMark>✓</PlanCheckMark>Purchasing and stock transfers</PlanFeatsItem>
                      )}
                    </PlanFeatsList>
                  </PlanCard>
                );
              })}
            </PlanGrid>

            <ProBanner>
              Your workspace is created first. You can review the plan, pay now or leave checkout and return later. Paid features start only after activation.
            </ProBanner>
            <StepNavRow>
              <BackBtn type="button" onClick={() => setStepIndex(0)}>← Back</BackBtn>
              <SubmitBtn
                htmlType="button"
                loading={submitting}
                onClick={onComplete}
                style={{ flex: 2, marginBottom: 0 }}
              >
                {submitting ? "Creating workspace…" : "Continue to checkout →"}
              </SubmitBtn>
            </StepNavRow>
          </div>
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
