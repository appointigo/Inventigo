"use client";

import { Suspense, useEffect, useState } from "react";
import { App, Segmented, Select, Spin, Typography } from "antd";
import Script from "next/script";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { SUBSCRIPTION_CATALOG } from "@/config/subscriptions/pricing";
import { SceneWrapper, Overlay, LogoRow, LogoIcon, LogoText } from "@/app/(auth)/login/login.styled";
import { OnboardingCard } from "@/app/(auth)/onboarding/onboarding.styled";
import { CheckoutActionButton, CheckoutSecondaryButton } from "./checkout.styled";

type PlanKey = (typeof SUBSCRIPTION_CATALOG.plans)[number]["key"];
type Interval = "MONTH" | "YEAR";
type Availability = {
  ready: boolean;
  reason: string | null;
  price: { amountMinor: number; currency: string; interval: Interval; taxMode: string } | null;
};
type RazorpayResponse = { razorpay_payment_id: string; razorpay_subscription_id: string; razorpay_signature: string };
type RazorpayCheckout = new (options: {
  key: string;
  subscription_id: string;
  name: string;
  description: string;
  handler: (response: RazorpayResponse) => void;
  modal: { ondismiss: () => void };
}) => { open: () => void };

declare global {
  interface Window { Razorpay?: RazorpayCheckout }
}

const { Title, Text, Paragraph } = Typography;
const money = (paise: number) => new Intl.NumberFormat("en-IN", {
  style: "currency", currency: "INR", maximumFractionDigits: 0,
}).format(paise / 100);

function CheckoutContent() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const params = useSearchParams();
  const initialPlan = params.get("plan");
  const [planKey, setPlanKey] = useState<PlanKey>(
    SUBSCRIPTION_CATALOG.plans.find((plan) => plan.key === initialPlan)?.key ?? "starter"
  );
  const [interval, setInterval] = useState<Interval>(params.get("interval") === "YEAR" ? "YEAR" : "MONTH");
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [scriptReady, setScriptReady] = useState(false);
  const [scriptFailed, setScriptFailed] = useState(false);
  const [paymentPending, setPaymentPending] = useState(false);
  const [refreshCount, setRefreshCount] = useState(0);
  const { message, modal } = App.useApp();
  const plan = SUBSCRIPTION_CATALOG.plans.find((item) => item.key === planKey)!;

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/subscriptions/checkout?plan=${planKey}&interval=${interval}`, {
      cache: "no-store", signal: controller.signal,
    }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Checkout unavailable");
      setAvailability(data);
    }).catch((error) => {
      if (error.name !== "AbortError") setAvailability({ ready: false, reason: error.message, price: null });
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [planKey, interval, refreshCount]);

  const changePlan = (value: PlanKey) => { setLoading(true); setAvailability(null); setPlanKey(value); };
  const changeInterval = (value: Interval) => { setLoading(true); setAvailability(null); setInterval(value); };
  const retryAvailability = () => { setLoading(true); setAvailability(null); setRefreshCount((count) => count + 1); };

  useEffect(() => {
    sessionStorage.setItem("pendingSubscriptionChoice", JSON.stringify({
      planKey,
      interval,
      catalogVersion: SUBSCRIPTION_CATALOG.version,
    }));
  }, [planKey, interval]);

  const payLater = () => modal.confirm({
    title: "Leave checkout and pay later?",
    content: "Your account and workspace will stay saved. No paid features will be activated. You can return and choose a plan whenever you're ready.",
    okText: "Pay later",
    cancelText: "Keep reviewing",
    onOk: async () => {
      // Newly created workspaces are already marked as requiring a subscription.
      // Leaving checkout does not need another server mutation.
      if (session?.user?.saasBillingRequired) {
        router.replace("/subscription/pending");
        return;
      }
      if (!session?.user) {
        message.error("Your session has expired. Please sign in to continue.");
        router.replace("/login?callbackUrl=%2Fsubscription%2Fcheckout");
        return;
      }
      try {
        const response = await fetch("/api/subscriptions/pay-later", { method: "POST" });
        if (response.status === 401) {
          message.error("Your session has expired. Please sign in to continue.");
          router.replace("/login?callbackUrl=%2Fsubscription%2Fcheckout");
          return;
        }
        if (!response.ok) throw new Error((await response.json()).error ?? "Could not save your choice");
        router.replace("/subscription/pending");
      } catch (error) {
        message.error(error instanceof Error ? error.message : "Could not leave checkout");
      }
    },
  });

  const startCheckout = async () => {
    setStarting(true);
    try {
      const response = await fetch("/api/subscriptions/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planKey, interval }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not start checkout");
      if (!window.Razorpay) throw new Error("Razorpay checkout did not load. Please refresh this page.");
      new window.Razorpay({
        key: data.keyId,
        subscription_id: data.subscriptionId,
        name: "Stockiva",
        description: `${plan.name} · ${interval === "MONTH" ? "Monthly" : "Yearly"} (Test Mode)`,
        handler: () => {
          // Only signed provider events and reconciliation can activate access.
          setPaymentPending(true);
          message.info("Payment submitted. Subscription confirmation is pending.");
        },
        modal: { ondismiss: () => setStarting(false) },
      }).open();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Could not start checkout");
    } finally {
      setStarting(false);
    }
  };

  const displayPrice = availability?.price?.amountMinor ?? (interval === "MONTH" ? plan.monthlyPaise : plan.annualPaise);

  return <>
    {availability?.ready && <Script src="https://checkout.razorpay.com/v1/checkout.js" onReady={() => { setScriptReady(true); setScriptFailed(false); }} onError={() => { setScriptReady(false); setScriptFailed(true); }} />}
    <SceneWrapper>
      <Overlay />
      <LogoRow><LogoIcon /><LogoText>Stockiva</LogoText></LogoRow>
      <OnboardingCard style={{ maxWidth: 620 }}>
        <Title level={2} style={{ color: "#fff", marginBottom: 4 }}>Review your subscription</Title>
        <Paragraph style={{ color: "rgba(255,255,255,.7)" }}>Your workspace is ready. Choose a plan and billing interval to continue.</Paragraph>
        <div style={{ display: "grid", gap: 16, margin: "28px 0" }}>
          <label style={{ color: "#fff" }}>Plan<br />
            <Select value={planKey} onChange={changePlan} style={{ width: "100%", marginTop: 8 }} options={SUBSCRIPTION_CATALOG.plans.map((item) => ({ value: item.key, label: item.name }))} />
          </label>
          <div><Text style={{ color: "#fff", display: "block", marginBottom: 8 }}>Billing interval</Text>
            <Segmented block value={interval} onChange={changeInterval} options={[{ label: "Monthly", value: "MONTH" }, { label: "Yearly", value: "YEAR" }]} />
          </div>
        </div>
        <div style={{ border: "1px solid rgba(255,255,255,.2)", borderRadius: 12, padding: 20, marginBottom: 20, background: "rgba(255,255,255,.06)" }}>
          <Text style={{ color: "#fff", fontSize: 17, fontWeight: 700 }}>{plan.name}</Text><br />
          <Text style={{ color: "rgba(255,255,255,.65)" }}>{plan.description}</Text>
          <Title level={2} style={{ color: "#5ecfea", margin: "12px 0 0" }}>{money(displayPrice)} <Text style={{ color: "rgba(255,255,255,.6)", fontSize: 14 }}>/{interval === "MONTH" ? "month" : "year"}</Text></Title>
          <Text style={{ color: "rgba(255,255,255,.65)" }}>Taxes extra. Final amount and recurring terms will appear in Razorpay checkout.</Text>
        </div>
        {loading ? <Spin /> : availability?.reason && <Paragraph role="status" style={{ color: "#ffd591" }}>{availability.reason} Your workspace is saved; check again when payment setup is complete.</Paragraph>}
        {availability?.ready && scriptFailed && <Paragraph role="status" style={{ color: "#ffd591" }}>Razorpay checkout could not load. Check your connection and retry.</Paragraph>}
        {paymentPending && <Paragraph style={{ color: "#5ecfea" }}>Payment submitted. We are awaiting verified confirmation before enabling the plan.</Paragraph>}
        {!paymentPending && <CheckoutActionButton
          type="primary"
          size="large"
          block
          loading={loading || starting || (availability?.ready && !scriptReady && !scriptFailed)}
          onClick={availability?.ready ? scriptFailed ? () => window.location.reload() : startCheckout : retryAvailability}
        >
          {availability?.ready ? scriptFailed ? "Retry Razorpay checkout" : "Continue to Razorpay (Test Mode)" : "Check payment availability"}
        </CheckoutActionButton>}
        {!paymentPending && <CheckoutSecondaryButton block onClick={payLater} disabled={starting || sessionStatus === "loading"}>
          ← Pay later
        </CheckoutSecondaryButton>}
      </OnboardingCard>
    </SceneWrapper>
  </>;
}

export default function CheckoutPage() {
  return <Suspense fallback={<Spin />}><CheckoutContent /></Suspense>;
}
