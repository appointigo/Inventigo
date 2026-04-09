"use client";

import React, { useMemo, memo } from "react";
import { useRouter } from "next/navigation";
import { Table, Tag, Button, Spin, Flex, Typography } from "antd";
import {
  HomeOutlined,
  TeamOutlined,
  ShopOutlined,
  CalendarOutlined,
  AppstoreOutlined,
} from "@ant-design/icons";
import { usePlatformStats, usePlatformOrgs } from "../../hooks/usePlatformAdmin";
import PlatformAdminKPICard from "./PlatformAdminKPICard";
import PlatformAdminBarChart from "./PlatformAdminBarChart";
import type { OrgSummary } from "../../types";
import {
  PageHeader,
  PageTitle,
  PageSubtitle,
  KPIGrid,
  MidRow,
  Panel,
  PanelHeader,
  PanelTitle,
  PanelAction,
  ChartArea,
  ChartLegend,
  LegendItem,
  LegendDot,
  ActivityList,
  ActivityItem,
  ActivityDot,
  ActivityText,
  ActivityTime,
  PlanDistGrid,
  PlanDistItem,
  PlanDistName,
  PlanDistCount,
  PlanDistPct,
  PlanBarTrack,
  PlanBarFill,
  SectionHeader,
  fadeUp,
} from "./PlatformAdminDashboard.styled";
import styled from "@emotion/styled";

const { Text } = Typography;

const PLAN_TAG_COLORS: Record<string, string> = {
  FREE:       "default",
  PRO:        "blue",
  ENTERPRISE: "gold",
};

const PLAN_BAR_COLORS: Record<string, string> = {
  FREE:       "linear-gradient(90deg, #9ca3af, #e5e7eb)",
  PRO:        "linear-gradient(90deg, #1677ff, #38bdf8)",
  ENTERPRISE: "linear-gradient(90deg, #f59e0b, #fcd34d)",
};

const PLAN_NAME_COLORS: Record<string, string | undefined> = {
  FREE:       undefined,
  PRO:        "#1d4ed8",
  ENTERPRISE: "#92400e",
};

const BottomPanel = styled(Panel)`
  animation: ${fadeUp} 0.4s 0.5s ease both;
`;

// ── Activity derived from org list ─────────────────────────────────────────

function deriveActivity(orgs: OrgSummary[]) {
  return orgs.slice(0, 5).map((org) => {
    const date = new Date(org.createdAt);
    const now  = Date.now();
    const diff = now - date.getTime();
    const days = Math.floor(diff / 86_400_000);
    const timeStr = days === 0 ? "Today" : days === 1 ? "Yesterday" : `${days} days ago`;
    return {
      id:    org.id,
      text:  `${org.name} signed up on ${org.plan} plan`,
      time:  timeStr,
      color: org.plan === "PRO" ? "#1677ff" : org.plan === "ENTERPRISE" ? "#d97706" : "#16a34a",
    };
  });
}

// ── Dashboard columns (memoized outside component) ─────────────────────────

const buildColumns = (router: { push: (url: string) => void }) => [
  {
    title: "Organization",
    dataIndex: "name",
    key: "name",
    render: (name: string, row: OrgSummary) => (
      <div>
        <Text strong style={{ fontSize: 13 }}>{name}</Text>
        <br />
        <Text type="secondary" style={{ fontSize: 11 }}>/{row.slug}</Text>
      </div>
    ),
  },
  {
    title: "Plan",
    dataIndex: "plan",
    key: "plan",
    render: (plan: string) => <Tag color={PLAN_TAG_COLORS[plan]}>{plan}</Tag>,
  },
  { title: "Stores",   dataIndex: "storeCount",   key: "storeCount" },
  { title: "Users",    dataIndex: "userCount",    key: "userCount"  },
  { title: "Products", dataIndex: "productCount", key: "productCount" },
  {
    title: "Status",
    dataIndex: "isActive",
    key: "isActive",
    render: (isActive: boolean) => (
      <Tag color={isActive ? "green" : "default"}>{isActive ? "Active" : "Inactive"}</Tag>
    ),
  },
  {
    title: "",
    key: "actions",
    render: (_: unknown, row: OrgSummary) => (
      <Button size="small" onClick={() => router.push(`/admin/organizations/${row.id}`)}>
        View
      </Button>
    ),
  },
];

// ── Main component ─────────────────────────────────────────────────────────

const PlatformAdminDashboard = memo(function PlatformAdminDashboard() {
  const router = useRouter();
  const { data: stats, isLoading: statsLoading } = usePlatformStats();
  const { data: orgs = [],  isLoading: orgsLoading  } = usePlatformOrgs();

  const activity = useMemo(() => deriveActivity(orgs), [orgs]);

  const planDist = useMemo(() => {
    const dist: Record<string, number> = { FREE: 0, PRO: 0, ENTERPRISE: 0 };
    stats?.planDistribution?.forEach((p) => { dist[p.plan] = p.count; });
    const total = Object.values(dist).reduce((a, b) => a + b, 0) || 1;
    return Object.entries(dist).map(([plan, count]) => ({
      plan,
      count,
      pct: Math.round((count / total) * 100),
    }));
  }, [stats]);

  const columns = useMemo(() => buildColumns(router), [router]);

  const weeklyData = useMemo(
    () => stats?.weeklySignups ?? Array.from({ length: 7 }, (_, i) => ({ week: `W${i + 1}`, count: 0 })),
    [stats]
  );

  if (statsLoading) {
    return (
      <Flex align="center" justify="center" style={{ minHeight: 300 }}>
        <Spin size="large" />
      </Flex>
    );
  }

  return (
    <>
      <PageHeader>
        <PageTitle>Platform Dashboard</PageTitle>
        <PageSubtitle>Real-time overview of all organizations, users and platform health.</PageSubtitle>
      </PageHeader>

      {/* KPI Cards */}
      <KPIGrid>
        <PlatformAdminKPICard
          label="Total Organizations"  value={stats?.totalOrgs ?? 0}
          delta={`↑ +${stats?.newOrgsThisMonth ?? 0} this month`} positive
          icon={<HomeOutlined />} color="#1677ff" delay={0.05}
        />
        <PlatformAdminKPICard
          label="Active Users" value={stats?.totalUsers ?? 0}
          delta="— across all orgs" neutral
          icon={<TeamOutlined />} color="#16a34a" delay={0.10}
        />
        <PlatformAdminKPICard
          label="Total Stores" value={stats?.totalStores ?? 0}
          delta={`↑ +${stats?.totalStores ?? 0} vs last month`} positive
          icon={<ShopOutlined />} color="#7c3aed" delay={0.15}
        />
        <PlatformAdminKPICard
          label="New Orgs This Month" value={stats?.newOrgsThisMonth ?? 0}
          delta="↑ Best month yet" positive
          icon={<CalendarOutlined />} color="#d97706" delay={0.20}
        />
      </KPIGrid>

      {/* Chart + Activity */}
      <MidRow>
        <Panel delay={0.25}>
          <PanelHeader>
            <PanelTitle>📈 Organization Signups — Last 7 Weeks</PanelTitle>
            <PanelAction>Export</PanelAction>
          </PanelHeader>
          <ChartArea>
            <PlatformAdminBarChart data={weeklyData} />
            <ChartLegend>
              <LegendItem>
                <LegendDot color="#1677ff" /> New signups
              </LegendItem>
              <LegendItem>
                <LegendDot color="#e5e7eb" /> Below average
              </LegendItem>
            </ChartLegend>
          </ChartArea>
        </Panel>

        <Panel delay={0.30}>
          <PanelHeader>
            <PanelTitle>⚡ Recent Activity</PanelTitle>
          </PanelHeader>
          <ActivityList>
            {orgsLoading
              ? <Flex justify="center" style={{ padding: 24 }}><Spin /></Flex>
              : activity.map((a) => (
                <ActivityItem key={a.id}>
                  <ActivityDot color={a.color} />
                  <div>
                    <ActivityText>{a.text}</ActivityText>
                    <ActivityTime>{a.time}</ActivityTime>
                  </div>
                </ActivityItem>
              ))
            }
          </ActivityList>
        </Panel>
      </MidRow>

      {/* Plan Distribution */}
      <Panel delay={0.35} style={{ marginBottom: 24 }}>
        <PanelHeader>
          <PanelTitle>◈ Plan Distribution</PanelTitle>
          <PanelAction onClick={() => router.push("/admin/pricing-plans")}>
            Manage Plans →
          </PanelAction>
        </PanelHeader>
        <PlanDistGrid>
          {planDist.map(({ plan, count, pct }, i) => (
            <PlanDistItem key={plan}>
              <PlanDistName planColor={PLAN_NAME_COLORS[plan]}>{plan}</PlanDistName>
              <PlanDistCount>{count}</PlanDistCount>
              <PlanDistPct>{pct}% of organizations</PlanDistPct>
              <PlanBarTrack>
                <PlanBarFill
                  color={PLAN_BAR_COLORS[plan] ?? "#6b7280"}
                  widthPct={pct}
                  delay={0.4 + i * 0.08}
                />
              </PlanBarTrack>
            </PlanDistItem>
          ))}
        </PlanDistGrid>
      </Panel>

      {/* Recent Orgs Table */}
      <BottomPanel>
        <SectionHeader>
          <PanelTitle>
            <AppstoreOutlined style={{ marginRight: 6 }} />
            Organizations
          </PanelTitle>
          <PanelAction onClick={() => router.push("/admin/organizations")}>
            View All →
          </PanelAction>
        </SectionHeader>
        <Table<OrgSummary>
          dataSource={orgs.slice(0, 6)}
          columns={columns}
          rowKey="id"
          size="small"
          loading={orgsLoading}
          pagination={false}
          style={{ padding: "0 0 8px" }}
        />
      </BottomPanel>
    </>
  );
});

export default PlatformAdminDashboard;
