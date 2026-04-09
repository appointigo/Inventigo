"use client";

import React, { useState, useMemo, useCallback, memo } from "react";
import { Table, Tag, Input, Select, Spin, Flex, Typography, App } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { usePlatformOrgs } from "../../hooks/usePlatformAdmin";
import { DEFAULT_PRICING_PLANS } from "../../constants";
import PlatformAdminPlanCard from "./PlatformAdminPlanCard";
import PlatformAdminEditPlanModal from "./PlatformAdminEditPlanModal";
import type { PricingPlan, OrgSummary } from "../../types";
import {
  PageTop,
  PageTitle,
  PageSubtitle,
  ActionButtons,
  BtnPrimary,
  BtnGhost,
  TabRow,
  TabBtn,
  PlansGrid,
  AssignPanel,
  AssignToolbar,
  ResultCount,
  UpgradeBadge,
} from "./PlatformAdminPricingPlans.styled";

const { Text } = Typography;

const PLAN_COLORS: Record<string, string> = {
  FREE:       "default",
  PRO:        "blue",
  ENTERPRISE: "gold",
};

const NEW_PLAN_TEMPLATE: PricingPlan = {
  id: "",
  name: "",
  price: 0,
  maxUsers: 5,
  maxStores: 1,
  maxProducts: 100,
  features: [
    { key: "purchase_orders", label: "Purchase Orders", enabled: false },
    { key: "promo_codes",     label: "Promo Codes",     enabled: false },
    { key: "reports_adv",     label: "Advanced Reports", enabled: false },
    { key: "api_access",      label: "API Access",      enabled: false },
    { key: "barcode",         label: "Barcode Scanning", enabled: false },
    { key: "white_label",     label: "White-label",     enabled: false },
  ],
};

// ── Main component ─────────────────────────────────────────────────────────

const PlatformAdminPricingPlans = memo(function PlatformAdminPricingPlans() {
  const { message } = App.useApp();
  const { data: orgs = [], isLoading: orgsLoading } = usePlatformOrgs();

  // Local plan state (persisted in-memory; backend sync pending Prisma model)
  const [plans, setPlans] = useState<PricingPlan[]>(DEFAULT_PRICING_PLANS);

  const [editingPlan,   setEditingPlan]   = useState<PricingPlan | null>(null);
  const [modalOpen,     setModalOpen]     = useState(false);
  const [isCreating,    setIsCreating]    = useState(false);
  const [activeTab,     setActiveTab]     = useState<"definitions" | "assignments">("definitions");

  // Assignments tab filters
  const [search,     setSearch]    = useState("");
  const [planFilter, setPlanFilter]= useState<string | undefined>(undefined);

  // Enrich plans with org counts
  const enrichedPlans = useMemo(() => {
    const countByPlan: Record<string, number> = {};
    orgs.forEach((o) => { countByPlan[o.plan] = (countByPlan[o.plan] ?? 0) + 1; });
    return plans.map((p) => ({ ...p, orgsCount: countByPlan[p.id] ?? 0 }));
  }, [plans, orgs]);

  // Filtered org list for assignments tab
  const filteredOrgs = useMemo(() => {
    let items = orgs;
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter((o) => o.name.toLowerCase().includes(q) || o.slug.toLowerCase().includes(q));
    }
    if (planFilter) items = items.filter((o) => o.plan === planFilter);
    return items;
  }, [orgs, search, planFilter]);

  const openEdit = useCallback((plan: PricingPlan) => {
    setEditingPlan(plan);
    setIsCreating(false);
    setModalOpen(true);
  }, []);

  const openCreate = useCallback(() => {
    setEditingPlan({ ...NEW_PLAN_TEMPLATE });
    setIsCreating(true);
    setModalOpen(true);
  }, []);

  const handleSave = useCallback((updated: PricingPlan) => {
    if (isCreating) {
      const newPlan = { ...updated, id: updated.name.toUpperCase().replace(/\s+/g, "_") };
      setPlans((prev) => [...prev, newPlan]);
      message.success(`${updated.name} plan created`);
    } else {
      setPlans((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      message.success(`${updated.name} plan updated`);
    }
    setModalOpen(false);
    setEditingPlan(null);
    setIsCreating(false);
  }, [isCreating, message]);

  const handleClose = useCallback(() => {
    setModalOpen(false);
    setEditingPlan(null);
    setIsCreating(false);
  }, []);

  const assignColumns: ColumnsType<OrgSummary> = useMemo(
    () => [
      {
        title: "Organization",
        key: "org",
        render: (_: unknown, row: OrgSummary) => (
          <div>
            <Text strong style={{ fontSize: 13 }}>{row.name}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 11 }}>/{row.slug}</Text>
          </div>
        ),
      },
      {
        title: "Current Plan",
        dataIndex: "plan",
        key: "plan",
        render: (plan: string) => <Tag color={PLAN_COLORS[plan]}>{plan}</Tag>,
      },
      { title: "Users",    dataIndex: "userCount",    key: "userCount"  },
      { title: "Stores",   dataIndex: "storeCount",   key: "storeCount" },
      { title: "Products", dataIndex: "productCount", key: "productCount" },
      {
        title: "Created",
        dataIndex: "createdAt",
        key: "createdAt",
        render: (d: string) => (
          <span style={{ color: "#9ca3af", fontSize: 12 }}>
            {new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" })}
          </span>
        ),
      },
      {
        title: "Change Plan",
        key: "change",
        render: (_: unknown, row: OrgSummary) =>
          row.plan !== "ENTERPRISE" ? (
            <UpgradeBadge
              onClick={() =>
                message.info(`Plan change for "${row.name}" — backend wiring pending`)
              }
            >
              ⬆ Upgrade to {row.plan === "FREE" ? "Pro" : "Enterprise"}
            </UpgradeBadge>
          ) : (
            <Text type="secondary" style={{ fontSize: 12 }}>Max tier</Text>
          ),
      },
    ],
    []
  );

  return (
    <>
      <PageTop>
        <div>
          <PageTitle>Pricing Plans</PageTitle>
          <PageSubtitle>Define plan limits, features, and pricing. Changes apply to new signups immediately.</PageSubtitle>
        </div>
        <ActionButtons>
          <BtnGhost onClick={() => message.info("Copy limits — coming soon")}>📋 Copy Limits to All</BtnGhost>
          <BtnPrimary onClick={openCreate}>+ New Plan</BtnPrimary>
        </ActionButtons>
      </PageTop>

      <TabRow>
        <TabBtn active={activeTab === "definitions"} onClick={() => setActiveTab("definitions")}>
          Plan Definitions
        </TabBtn>
        <TabBtn active={activeTab === "assignments"} onClick={() => setActiveTab("assignments")}>
          Plan Assignments
        </TabBtn>
      </TabRow>

      {activeTab === "definitions" && (
        <PlansGrid>
          {enrichedPlans.map((plan, i) => (
            <PlatformAdminPlanCard
              key={plan.id}
              plan={plan}
              delay={0.05 + i * 0.06}
              onEdit={openEdit}
            />
          ))}
        </PlansGrid>
      )}

      {activeTab === "assignments" && (
        <AssignPanel>
          <AssignToolbar>
            <Input
              placeholder="Search organizations…"
              prefix={<SearchOutlined style={{ color: "#9ca3af" }} />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: 260 }}
              allowClear
            />
            <Select
              placeholder="All Plans"
              value={planFilter}
              onChange={setPlanFilter}
              allowClear
              style={{ width: 140 }}
              options={[
                { value: "FREE",       label: "FREE" },
                { value: "PRO",        label: "PRO" },
                { value: "ENTERPRISE", label: "ENTERPRISE" },
              ]}
            />
            <ResultCount>{filteredOrgs.length} organizations</ResultCount>
          </AssignToolbar>
          {orgsLoading
            ? <Flex justify="center" style={{ padding: 40 }}><Spin /></Flex>
            : (
              <Table<OrgSummary>
                dataSource={filteredOrgs}
                columns={assignColumns}
                rowKey="id"
                size="small"
                pagination={{ pageSize: 20, size: "small" }}
                locale={{ emptyText: "No organizations found" }}
              />
            )
          }
        </AssignPanel>
      )}

      <PlatformAdminEditPlanModal
        plan={editingPlan}
        open={modalOpen}
        onClose={handleClose}
        onSave={handleSave}
        isCreating={isCreating}
      />
    </>
  );
});

export default PlatformAdminPricingPlans;
