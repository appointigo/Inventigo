"use client";

import React from "react";
import { Spin } from "antd";
import {
  RiseOutlined,
  DollarOutlined,
  SyncOutlined,
  ShoppingCartOutlined,
  BarChartOutlined,
  TrophyOutlined,
  ExportOutlined,
  PieChartOutlined,
  CreditCardOutlined,
} from "@ant-design/icons";
import { usePlatformAnalytics } from "../../hooks/usePlatformAdmin";
import {
  PageTop, PageTitle, PageSubtitle, ActionButtons, BtnGhost, FilterSelect,
  KPIGrid, KPICard, KPIShine, KPIIcon, KPILabel, KPIValue, KPIDelta,
  ChartGrid, ChartCard, ChartTitle, ChartSubtitle,
  BarChartWrap, BarCol, Bar, BarLabel, BarValue,
  RetentionGrid, RetentionCard, RetentionPct, RetentionLabel, RetentionNote,
  Leaderboard, LBRow, LBRank, LBName, LBBarWrap, LBBarFill, LBVal,
  DonutWrap, DonutSvg, DonutRing, DonutLabel, DonutSub,
  DonutLegend, LegendItem, LegendDot, LegendVal,
} from "./PlatformAdminAnalytics.styled";

const RANK_VARIANTS = ["gold", "silver", "bronze"] as const;
const RANK_COLORS = [
  "linear-gradient(90deg, #d97706, #fbbf24)",
  "linear-gradient(90deg, #1677ff, #38bdf8)",
  "linear-gradient(90deg, #16a34a, #4ade80)",
  "#e5e7eb",
  "#e5e7eb",
];
const RETENTION_COLORS = ["#16a34a", "#1677ff", "#d97706"];

export default function PlatformAdminAnalytics() {
  const { data, isLoading } = usePlatformAnalytics();

  if (isLoading || !data) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  const maxSignup = Math.max(...data.signupsOverTime.map((s) => s.count), 1);
  const maxRevenue = Math.max(...data.topOrgsByRevenue.map((o) => o.revenue), 1);

  const PLAN_COLORS: Record<string, string> = { FREE: "#6b7280", PRO: "#1677ff", ENTERPRISE: "#d97706" };
  const PLAN_LABELS: Record<string, string> = { FREE: "Free", PRO: "Pro", ENTERPRISE: "Enterprise" };
  const PAYMENT_COLORS: Record<string, string> = { CASH: "#16a34a", CARD: "#1677ff", UPI: "#7c3aed" };

  const totalOrgs = data.planDistribution.reduce((s, p) => s + p.count, 0);
  const totalPaymentRev = data.revenueByPaymentMethod.reduce((s, p) => s + p.total, 0);
  const CIRC = 2 * Math.PI * 50; // ~314

  return (
    <>
      <PageTop>
        <div>
          <PageTitle>Analytics</PageTitle>
          <PageSubtitle>Business intelligence for platform health, retention, and revenue insights.</PageSubtitle>
        </div>
        <ActionButtons>
          <FilterSelect>
            <option>Last 30 Days</option>
            <option>Last 7 Days</option>
            <option>Last 90 Days</option>
          </FilterSelect>
          <BtnGhost><ExportOutlined style={{ marginRight: 4 }} /> Export Report</BtnGhost>
        </ActionButtons>
      </PageTop>

      {/* KPI Row */}
      <KPIGrid>
        <KPICard delay={0}>
          <KPIShine color="#1677ff" />
          <KPIIcon bg="#eff6ff" color="#1677ff"><RiseOutlined /></KPIIcon>
          <KPILabel>Monthly Signups</KPILabel>
          <KPIValue>{data.monthlySignups}</KPIValue>
          <KPIDelta variant="up">↑ This month</KPIDelta>
        </KPICard>
        <KPICard delay={0.05}>
          <KPIShine color="#16a34a" />
          <KPIIcon bg="#f0fdf4" color="#16a34a"><DollarOutlined /></KPIIcon>
          <KPILabel>Est. MRR</KPILabel>
          <KPIValue>${data.estimatedMRR.toLocaleString()}</KPIValue>
          <KPIDelta variant={data.estimatedMRR > 0 ? "up" : "neutral"}>
            {data.estimatedMRR > 0 ? "From active plans" : "All on FREE"}
          </KPIDelta>
        </KPICard>
        <KPICard delay={0.1}>
          <KPIShine color="#d97706" />
          <KPIIcon bg="#fffbeb" color="#d97706"><SyncOutlined /></KPIIcon>
          <KPILabel>30-Day Retention</KPILabel>
          <KPIValue>{data.retention30Day}%</KPIValue>
          <KPIDelta variant={data.retention30Day >= 80 ? "up" : "warn"}>
            {data.retention30Day === 100 ? "No churn" : `${100 - data.retention30Day}% churned`}
          </KPIDelta>
        </KPICard>
        <KPICard delay={0.15}>
          <KPIShine color="#7c3aed" />
          <KPIIcon bg="#f5f3ff" color="#7c3aed"><ShoppingCartOutlined /></KPIIcon>
          <KPILabel>Platform Sales</KPILabel>
          <KPIValue>${data.platformSales.toLocaleString()}</KPIValue>
          <KPIDelta variant={data.platformSales > 0 ? "up" : "neutral"}>
            {data.platformSales > 0 ? "All time" : "No sales yet"}
          </KPIDelta>
        </KPICard>
      </KPIGrid>

      {/* Charts Row 1 */}
      <ChartGrid>
        {/* Signups Over Time */}
        <ChartCard>
          <ChartTitle>
            <BarChartOutlined /> Signups Over Time
            <ChartSubtitle>Last 8 weeks</ChartSubtitle>
          </ChartTitle>
          <BarChartWrap>
            {data.signupsOverTime.map((s, i) => {
              const pct = (s.count / maxSignup) * 100;
              const isLast = i === data.signupsOverTime.length - 1;
              return (
                <BarCol key={s.week}>
                  <BarValue>{s.count}</BarValue>
                  <Bar heightPct={Math.max(pct, 2)} delay={i * 0.05} highlight={isLast} />
                  <BarLabel>{s.week}</BarLabel>
                </BarCol>
              );
            })}
          </BarChartWrap>
        </ChartCard>

        {/* Plan Distribution */}
        <ChartCard>
          <ChartTitle>
            <PieChartOutlined /> Plan Distribution
            <ChartSubtitle>Current</ChartSubtitle>
          </ChartTitle>
          <DonutWrap>
            <DonutSvg viewBox="0 0 130 130">
              {(() => {
                let offset = 0;
                const plans = ["FREE", "PRO", "ENTERPRISE"];
                return plans.map((plan) => {
                  const entry = data.planDistribution.find((p) => p.plan === plan);
                  const count = entry?.count ?? 0;
                  const seg = totalOrgs > 0 ? (count / totalOrgs) * CIRC : 0;
                  const el = (
                    <DonutRing
                      key={plan}
                      cx="65" cy="65" r="50"
                      stroke={PLAN_COLORS[plan]}
                      strokeDasharray={`${seg} ${CIRC}`}
                      strokeDashoffset={-offset}
                      transform="rotate(-90 65 65)"
                    />
                  );
                  offset += seg;
                  return el;
                });
              })()}
              <DonutLabel x="65" y="62" textAnchor="middle">{totalOrgs}</DonutLabel>
              <DonutSub x="65" y="78" textAnchor="middle">Total Orgs</DonutSub>
            </DonutSvg>
            <DonutLegend>
              {["FREE", "PRO", "ENTERPRISE"].map((plan) => {
                const entry = data.planDistribution.find((p) => p.plan === plan);
                return (
                  <LegendItem key={plan}>
                    <LegendDot color={PLAN_COLORS[plan]} />
                    {PLAN_LABELS[plan]}
                    <LegendVal>{entry?.count ?? 0}</LegendVal>
                  </LegendItem>
                );
              })}
            </DonutLegend>
          </DonutWrap>
        </ChartCard>
      </ChartGrid>

      {/* Charts Row 2 */}
      <ChartGrid>
        {/* Revenue by Payment Method */}
        <ChartCard>
          <ChartTitle>
            <CreditCardOutlined /> Revenue by Payment Method
            <ChartSubtitle>All time</ChartSubtitle>
          </ChartTitle>
          <DonutWrap>
            <DonutSvg viewBox="0 0 130 130">
              {(() => {
                let offset = 0;
                const methods = ["CASH", "CARD", "UPI"];
                return methods.map((method) => {
                  const entry = data.revenueByPaymentMethod.find((p) => p.method === method);
                  const total = entry?.total ?? 0;
                  const seg = totalPaymentRev > 0 ? (total / totalPaymentRev) * CIRC : 0;
                  const el = (
                    <DonutRing
                      key={method}
                      cx="65" cy="65" r="50"
                      stroke={PAYMENT_COLORS[method]}
                      strokeDasharray={`${seg} ${CIRC}`}
                      strokeDashoffset={-offset}
                      transform="rotate(-90 65 65)"
                    />
                  );
                  offset += seg;
                  return el;
                });
              })()}
              <DonutLabel x="65" y="62" textAnchor="middle">
                {totalPaymentRev >= 1000 ? `$${(totalPaymentRev / 1000).toFixed(1)}K` : `$${totalPaymentRev}`}
              </DonutLabel>
              <DonutSub x="65" y="78" textAnchor="middle">Total</DonutSub>
            </DonutSvg>
            <DonutLegend>
              {["CASH", "CARD", "UPI"].map((method) => {
                const entry = data.revenueByPaymentMethod.find((p) => p.method === method);
                return (
                  <LegendItem key={method}>
                    <LegendDot color={PAYMENT_COLORS[method]} />
                    {method.charAt(0) + method.slice(1).toLowerCase()}
                    <LegendVal>${(entry?.total ?? 0).toLocaleString()}</LegendVal>
                  </LegendItem>
                );
              })}
            </DonutLegend>
          </DonutWrap>
        </ChartCard>

        {/* Retention */}
        <ChartCard>
          <ChartTitle>
            <SyncOutlined /> Organization Retention
          </ChartTitle>
          <RetentionGrid>
            {data.retention.map((r, i) => (
              <RetentionCard key={r.period}>
                <RetentionPct color={RETENTION_COLORS[i] || "#9ca3af"}>
                  {r.percentage > 0 ? `${r.percentage}%` : "—"}
                </RetentionPct>
                <RetentionLabel>{r.period}</RetentionLabel>
              </RetentionCard>
            ))}
          </RetentionGrid>
          <RetentionNote>
            {data.retention.every((r) => r.percentage === 100)
              ? "✨ Zero churn — all organizations still active"
              : "Retention across active cohorts"}
          </RetentionNote>
        </ChartCard>
      </ChartGrid>

      {/* Leaderboard */}
      <ChartCard delay={0.15}>
        <ChartTitle>
          <TrophyOutlined /> Most Active Orgs by Revenue
          <ChartSubtitle>All time</ChartSubtitle>
        </ChartTitle>
        <Leaderboard>
          {data.topOrgsByRevenue.map((org, i) => {
            const pct = (org.revenue / maxRevenue) * 100;
            return (
              <LBRow key={`${org.name}-${i}`}>
                <LBRank variant={RANK_VARIANTS[i] as "gold" | "silver" | "bronze" | undefined}>
                  {i + 1}
                </LBRank>
                <LBName>{org.name}</LBName>
                <LBBarWrap>
                  <LBBarFill widthPct={pct} color={RANK_COLORS[i] || "#e5e7eb"} delay={i * 0.1} />
                </LBBarWrap>
                <LBVal>${org.revenue.toLocaleString()}</LBVal>
              </LBRow>
            );
          })}
          {data.topOrgsByRevenue.length === 0 && (
            <div style={{ textAlign: "center", padding: 20, color: "#9ca3af", fontSize: 13 }}>
              No revenue data yet
            </div>
          )}
        </Leaderboard>
      </ChartCard>
    </>
  );
}
