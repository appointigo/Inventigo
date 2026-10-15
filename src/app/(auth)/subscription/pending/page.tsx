"use client";

import { useEffect, useState } from "react";
import { Button, Spin, Typography } from "antd";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { SUBSCRIPTION_CATALOG } from "@/config/subscriptions/pricing";
import { SceneWrapper, Overlay, LogoRow, LogoIcon, LogoText } from "@/app/(auth)/login/login.styled";
import { OnboardingCard } from "@/app/(auth)/onboarding/onboarding.styled";
import { CheckoutActionButton } from "../checkout/checkout.styled";
import { requiresSubscriptionActivation, type SubscriptionAccessSource } from "@/modules/subscriptions/navigationPolicy";

const { Title, Paragraph, Text } = Typography;
const validPlanKeys = new Set(SUBSCRIPTION_CATALOG.plans.map((plan) => plan.key));

export default function SubscriptionPendingPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [accessStatus, setAccessStatus] = useState<"checking" | "pending" | "error">("checking");
  const [retry, setRetry] = useState(0);

  const choosePlan = () => {
    let destination = "/subscription/checkout?plan=starter&interval=MONTH";
    try {
      const saved = JSON.parse(sessionStorage.getItem("pendingSubscriptionChoice") ?? "null") as { planKey?: string; interval?: string } | null;
      if (saved && validPlanKeys.has(saved.planKey as "starter" | "growth" | "business")) {
        destination = `/subscription/checkout?plan=${saved.planKey}&interval=${saved.interval === "YEAR" ? "YEAR" : "MONTH"}`;
      }
    } catch { /* An invalid local preference falls back to Starter monthly. */ }
    router.push(destination);
  };

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
    if (status !== "authenticated" || !session?.user) return;
    if (!session.user.emailVerified) { router.replace(`/verify-email?email=${encodeURIComponent(session.user.email ?? "")}`); return; }
    if (!session.user.orgId) { router.replace("/onboarding"); return; }
    const controller = new AbortController();
    fetch("/api/subscriptions/access", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not check your subscription status");
        return response.json() as Promise<{ source: SubscriptionAccessSource; billingRequired: boolean }>;
      })
      .then((access) => {
        if (!requiresSubscriptionActivation(access.billingRequired, access.source)) router.replace("/dashboard");
        else setAccessStatus("pending");
      })
      .catch((error) => { if (error.name !== "AbortError") setAccessStatus("error"); });
    return () => controller.abort();
  }, [router, session, status, retry]);

  return <SceneWrapper>
    <Overlay />
    <LogoRow><LogoIcon /><LogoText>Stockiva</LogoText></LogoRow>
    <OnboardingCard style={{ maxWidth: 620 }}>
      {accessStatus === "checking" ? <Spin /> : accessStatus === "error" ? <>
        <Title level={3} style={{ color: "#fff" }}>We couldn&apos;t check your plan</Title>
        <CheckoutActionButton type="primary" block onClick={() => { setAccessStatus("checking"); setRetry((count) => count + 1); }}>Try again</CheckoutActionButton>
      </> : <>
        <Title level={2} style={{ color: "#fff", marginBottom: 10 }}>Your workspace is saved</Title>
        <Paragraph style={{ color: "rgba(255,255,255,.75)", fontSize: 16 }}>
          You can choose a plan whenever you&apos;re ready. No subscription is active, so paid Stockiva features are unavailable.
        </Paragraph>
        <div style={{ border: "1px solid rgba(255,255,255,.2)", borderRadius: 12, padding: 20, margin: "24px 0", background: "rgba(255,255,255,.06)" }}>
          <Text style={{ color: "#fff", fontWeight: 700 }}>What you can explore before paying</Text>
          <Paragraph style={{ color: "rgba(255,255,255,.7)", margin: "8px 0 0" }}>
            Review the Starter, Growth and Business plan details and prices. Your inventory, billing and team tools become available after a plan is activated.
          </Paragraph>
        </div>
        <CheckoutActionButton type="primary" size="large" block onClick={choosePlan}>Choose a plan</CheckoutActionButton>
        <Button type="text" block style={{ color: "#f4fbfd", marginTop: 12 }} onClick={() => void signOut({ callbackUrl: "/login" })}>Sign out</Button>
      </>}
    </OnboardingCard>
  </SceneWrapper>;
}
