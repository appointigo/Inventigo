"use client";

import React, { memo } from "react";
import { ShopOutlined, EditOutlined } from "@ant-design/icons";
import type { PricingPlan } from "../../types";
import {
  PlanCardWrap,
  PlanShine,
  MostPopularBadge,
  PlanIconWrap,
  OrgsBadge,
  PlanTierName,
  PlanPriceRow,
  PlanPrice,
  PlanPer,
  PlanTagline,
  PlanDivider,
  LimitsTable,
  LimitRow,
  LimitLabel,
  LimitVal,
  FeatureList,
  FeatureRow,
  FeatureCheck,
  FeatureX,
  EditPlanBtn,
  DisabledFeatureText,
} from "./PlatformAdminPricingPlans.styled";

const PLAN_CONFIG = {
  FREE: {
    highlight:  undefined as "pro" | "enterprise" | undefined,
    iconBg:     "#f3f4f6",
    iconColor:  "#6b7280",
    icon:       "🆓",
    shineColor: "#9ca3af",
    priceColor: undefined as string | undefined,
    tierColor:  undefined as string | undefined,
    editBtnBg:    undefined as string | undefined,
    editBtnBorder: undefined as string | undefined,
    editBtnColor:  undefined as string | undefined,
  },
  PRO: {
    highlight:  "pro" as const,
    iconBg:     "#eff6ff",
    iconColor:  "#1677ff",
    icon:       "⚡",
    shineColor: "#1677ff",
    priceColor: "#1677ff",
    tierColor:  "#1d4ed8",
    editBtnBg:    "#eff6ff",
    editBtnBorder: "#bfdbfe",
    editBtnColor:  "#1677ff",
  },
  ENTERPRISE: {
    highlight:  "enterprise" as const,
    iconBg:     "#fef3c7",
    iconColor:  "#d97706",
    icon:       "👑",
    shineColor: "#f59e0b",
    priceColor: "#d97706",
    tierColor:  "#92400e",
    editBtnBg:    "#fef3c7",
    editBtnBorder: "#fcd34d",
    editBtnColor:  "#d97706",
  },
} as const;

interface Props {
  plan: PricingPlan;
  delay?: number;
  onEdit: (plan: PricingPlan) => void;
}

const PlatformAdminPlanCard = memo(function PlatformAdminPlanCard({
  plan,
  delay = 0,
  onEdit,
}: Props) {
  const cfg = PLAN_CONFIG[plan.id as keyof typeof PLAN_CONFIG] ?? PLAN_CONFIG.FREE;

  const fmtLimit = (n: number) => (n === -1 ? "Unlimited" : n.toLocaleString());
  const isUnlimited = (n: number) => n === -1;

  return (
    <PlanCardWrap highlight={cfg.highlight} delay={delay}>
      <PlanShine color={cfg.shineColor} />

      {cfg.highlight === "pro" && <MostPopularBadge>Most Popular</MostPopularBadge>}

      <PlanIconWrap bg={cfg.iconBg} color={cfg.iconColor}>{cfg.icon}</PlanIconWrap>

      <OrgsBadge>
        <ShopOutlined style={{ fontSize: 10 }} />
        {plan.orgsCount ?? 0} organizations on this plan
      </OrgsBadge>

      <PlanTierName color={cfg.tierColor}>{plan.name}</PlanTierName>

      <PlanPriceRow>
        <PlanPrice color={cfg.priceColor}>${plan.price}</PlanPrice>
        <PlanPer>/ mo</PlanPer>
      </PlanPriceRow>

      <PlanTagline>{plan.tagline}</PlanTagline>

      <PlanDivider />

      <LimitsTable>
        <LimitRow>
          <LimitLabel>Max Users</LimitLabel>
          <LimitVal unlimited={isUnlimited(plan.maxUsers)}>{fmtLimit(plan.maxUsers)}</LimitVal>
        </LimitRow>
        <LimitRow>
          <LimitLabel>Max Stores</LimitLabel>
          <LimitVal unlimited={isUnlimited(plan.maxStores)}>{fmtLimit(plan.maxStores)}</LimitVal>
        </LimitRow>
        <LimitRow>
          <LimitLabel>Max Products</LimitLabel>
          <LimitVal unlimited={isUnlimited(plan.maxProducts)}>{fmtLimit(plan.maxProducts)}</LimitVal>
        </LimitRow>
      </LimitsTable>

      <FeatureList>
        {plan.features.map((f) => (
          <FeatureRow key={f.key}>
            {f.enabled ? <FeatureCheck>✓</FeatureCheck> : <FeatureX>✗</FeatureX>}
            {f.enabled ? <span>{f.label}</span> : <DisabledFeatureText>{f.label}</DisabledFeatureText>}
          </FeatureRow>
        ))}
      </FeatureList>

      <EditPlanBtn
        btnBg={cfg.editBtnBg}
        btnBorder={cfg.editBtnBorder}
        btnColor={cfg.editBtnColor}
        onClick={() => onEdit(plan)}
      >
        <EditOutlined /> Edit Plan
      </EditPlanBtn>
    </PlanCardWrap>
  );
});

export default PlatformAdminPlanCard;
