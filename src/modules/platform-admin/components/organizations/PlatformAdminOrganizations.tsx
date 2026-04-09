"use client";

import React, { useState, useMemo, useCallback, memo } from "react";
import {
  Table,
  Tag,
  Button,
  Input,
  Select,
  Drawer,
  Space,
  Spin,
  Flex,
  Typography,
} from "antd";
import {
  SearchOutlined,
  ExportOutlined,
  EyeOutlined,
  MoreOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { usePlatformOrgs } from "../../hooks/usePlatformAdmin";
import PlatformAdminOrgDetailPanel from "./PlatformAdminOrgDetailPanel";
import type { OrgSummary } from "../../types";
import {
  PageTop,
  PageTitle,
  PageSubtitle,
  ActionButtons,
  TablePanel,
  Toolbar,
  ResultCount,
  OrgCell,
  OrgAvatar,
  OrgNameText,
  OrgSlugText,
} from "./PlatformAdminOrganizations.styled";

const { Text } = Typography;

const PLAN_COLORS: Record<string, string> = {
  FREE:       "default",
  PRO:        "blue",
  ENTERPRISE: "gold",
};

const AVATAR_GRADIENTS = [
  "linear-gradient(135deg, #1677ff, #38bdf8)",
  "linear-gradient(135deg, #d97706, #fbbf24)",
  "linear-gradient(135deg, #16a34a, #4ade80)",
  "linear-gradient(135deg, #7c3aed, #a78bfa)",
  "linear-gradient(135deg, #dc2626, #f87171)",
];

function getAvatarBg(name: string): string {
  const idx = name.charCodeAt(0) % AVATAR_GRADIENTS.length;
  return AVATAR_GRADIENTS[idx];
}

// ── Main component ─────────────────────────────────────────────────────────

const PlatformAdminOrganizations = memo(function PlatformAdminOrganizations() {
  const { data: orgs = [], isLoading } = usePlatformOrgs();

  const [search,     setSearch]    = useState("");
  const [planFilter, setPlanFilter]= useState<string | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [panelOrgId, setPanelOrgId]= useState<string | null>(null);

  // Filtered list (memoized)
  const filtered = useMemo(() => {
    let items = orgs;
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(
        (o) => o.name.toLowerCase().includes(q) || o.slug.toLowerCase().includes(q)
      );
    }
    if (planFilter) {
      items = items.filter((o) => o.plan === planFilter);
    }
    if (statusFilter === "active")   items = items.filter((o) => o.isActive);
    if (statusFilter === "inactive") items = items.filter((o) => !o.isActive);
    return items;
  }, [orgs, search, planFilter, statusFilter]);

  const openPanel  = useCallback((id: string) => setPanelOrgId(id), []);
  const closePanel = useCallback(() => setPanelOrgId(null), []);

  const columns: ColumnsType<OrgSummary> = useMemo(
    () => [
      {
        title: "Organization",
        dataIndex: "name",
        key: "name",
        sorter: (a, b) => a.name.localeCompare(b.name),
        render: (name: string, row: OrgSummary) => (
          <OrgCell>
            <OrgAvatar bg={getAvatarBg(name)}>{name[0].toUpperCase()}</OrgAvatar>
            <div>
              <OrgNameText>{name}</OrgNameText>
              <OrgSlugText>/{row.slug}</OrgSlugText>
            </div>
          </OrgCell>
        ),
      },
      {
        title: "Plan",
        dataIndex: "plan",
        key: "plan",
        render: (plan: string) => <Tag color={PLAN_COLORS[plan]}>{plan}</Tag>,
      },
      {
        title: "Stores",
        dataIndex: "storeCount",
        key: "storeCount",
        sorter: (a, b) => a.storeCount - b.storeCount,
        render: (v: number) => (
          <span style={{ fontWeight: v ? 600 : 400, color: v ? undefined : "#9ca3af" }}>{v}</span>
        ),
      },
      {
        title: "Users",
        dataIndex: "userCount",
        key: "userCount",
        sorter: (a, b) => a.userCount - b.userCount,
        render: (v: number) => (
          <span style={{ fontWeight: v ? 600 : 400, color: v ? undefined : "#9ca3af" }}>{v}</span>
        ),
      },
      {
        title: "Products",
        dataIndex: "productCount",
        key: "productCount",
        sorter: (a, b) => a.productCount - b.productCount,
        render: (v: number) => (
          <span style={{ fontWeight: v ? 600 : 400, color: v ? undefined : "#9ca3af" }}>{v}</span>
        ),
      },
      {
        title: "Status",
        dataIndex: "isActive",
        key: "isActive",
        render: (active: boolean) => (
          <Tag color={active ? "green" : "default"}>{active ? "Active" : "Inactive"}</Tag>
        ),
      },
      {
        title: "Created",
        dataIndex: "createdAt",
        key: "createdAt",
        render: (d: string) => (
          <span style={{ color: "#9ca3af", fontSize: 12 }}>
            {new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" })}
          </span>
        ),
        sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      },
      {
        title: "Action",
        key: "actions",
        render: (_: unknown, row: OrgSummary) => (
          <Space size={6}>
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() => openPanel(row.id)}
            >
              View
            </Button>
            <Button size="small" danger>Suspend</Button>
            <Button size="small" type="text" icon={<MoreOutlined />} />
          </Space>
        ),
      },
    ],
    [openPanel]
  );

  return (
    <>
      <PageTop>
        <div>
          <PageTitle>Organizations</PageTitle>
          <PageSubtitle>Manage and monitor all organizations on the platform.</PageSubtitle>
        </div>
        <ActionButtons>
          <Button icon={<ExportOutlined />}>Export CSV</Button>
          <Button type="primary">+ Invite Org</Button>
        </ActionButtons>
      </PageTop>

      <Toolbar>
        <Input
          placeholder="Search by name or slug…"
          prefix={<SearchOutlined style={{ color: "#9ca3af" }} />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: 280 }}
          allowClear
        />
        <Select
          placeholder="All Plans"
          value={planFilter}
          onChange={setPlanFilter}
          allowClear
          style={{ width: 130 }}
          options={[
            { value: "FREE",       label: "FREE" },
            { value: "PRO",        label: "PRO" },
            { value: "ENTERPRISE", label: "ENTERPRISE" },
          ]}
        />
        <Select
          placeholder="All Statuses"
          value={statusFilter}
          onChange={setStatusFilter}
          allowClear
          style={{ width: 150 }}
          options={[
            { value: "active",   label: "Active" },
            { value: "inactive", label: "Inactive" },
          ]}
        />
        <ResultCount>{filtered.length} organization{filtered.length !== 1 ? "s" : ""}</ResultCount>
      </Toolbar>

      <TablePanel>

        {isLoading
          ? <Flex align="center" justify="center" style={{ padding: 60 }}><Spin size="large" /></Flex>
          : (
            <Table<OrgSummary>
              dataSource={filtered}
              columns={columns}
              rowKey="id"
              size="small"
              pagination={{
                pageSize: 20,
                size: "small",
                showSizeChanger: true,
                pageSizeOptions: ["10", "20", "50"],
                showTotal: (total, range) => `Showing ${range[0]}\u2013${range[1]} of ${total} organizations`,
              }}
              locale={{ emptyText: "No organizations found" }}
            />
          )
        }
      </TablePanel>

      {/* Detail Drawer */}
      <Drawer
        open={!!panelOrgId}
        onClose={closePanel}
        size={480}
        title={null}
        styles={{ body: { padding: 0 } }}
        destroyOnHidden
      >
        {panelOrgId && <PlatformAdminOrgDetailPanel orgId={panelOrgId} />}
      </Drawer>
    </>
  );
});

export default PlatformAdminOrganizations;
