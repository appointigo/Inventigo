"use client";

import React, { memo } from "react";
import { Tag, Table, Button, Spin, Flex, Typography, Divider } from "antd";
import {
  UsergroupAddOutlined,
  ShopOutlined,
  AppstoreOutlined,
  CheckCircleOutlined,
  StopOutlined,
} from "@ant-design/icons";
import { usePlatformOrgDetail } from "../../hooks/usePlatformAdmin";
import type { OrgDetail } from "../../types";
import {
  DrawerBody,
  DrawerOrgHeader,
  DrawerOrgAvatar,
  DrawerOrgName,
  DrawerOrgSlug,
  StatsGrid,
  StatCell,
  StatValue,
  StatLabel,
  DrawerSection,
  DrawerSectionLabel,
  DrawerActions,
} from "./PlatformAdminOrganizations.styled";

const { Text } = Typography;

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

interface Props {
  orgId: string;
}

const PlatformAdminOrgDetailPanel = memo(function PlatformAdminOrgDetailPanel({
  orgId,
}: Props) {
  const { data: org, isLoading } = usePlatformOrgDetail(orgId);

  if (isLoading || !org) {
    return (
      <Flex align="center" justify="center" style={{ height: 300 }}>
        <Spin />
      </Flex>
    );
  }

  const letter = org.name[0].toUpperCase();

  const storeColumns = [
    { title: "Name", dataIndex: "name", key: "name" },
    { title: "Code", dataIndex: "code", key: "code" },
    {
      title: "Status",
      dataIndex: "isActive",
      key: "isActive",
      render: (a: boolean) => (
        <Tag color={a ? "green" : "default"} icon={a ? <CheckCircleOutlined /> : <StopOutlined />}>
          {a ? "Active" : "Inactive"}
        </Tag>
      ),
    },
  ];

  const userColumns = [
    { title: "Name",  dataIndex: "name",  key: "name",  render: (n: string) => <Text strong style={{ fontSize: 12 }}>{n}</Text> },
    { title: "Email", dataIndex: "email", key: "email", render: (e: string) => <Text type="secondary" style={{ fontSize: 11 }}>{e}</Text> },
    {
      title: "Role",
      dataIndex: "role",
      key: "role",
      render: (r: string) => <Tag style={{ fontSize: 10 }}>{r}</Tag>,
    },
  ];

  return (
    <DrawerBody>
      {/* Header */}
      <DrawerOrgHeader>
        <DrawerOrgAvatar bg={getAvatarBg(org.name)}>{letter}</DrawerOrgAvatar>
        <div>
          <DrawerOrgName>{org.name}</DrawerOrgName>
          <DrawerOrgSlug>/{org.slug}</DrawerOrgSlug>
          <div style={{ marginTop: 6 }}>
            <Tag color={org.plan === "PRO" ? "blue" : org.plan === "ENTERPRISE" ? "gold" : "default"}>
              {org.plan}
            </Tag>
            <Tag color={org.isActive ? "green" : "default"}>
              {org.isActive ? "Active" : "Inactive"}
            </Tag>
          </div>
        </div>
      </DrawerOrgHeader>

      {/* Stats */}
      <StatsGrid>
        <StatCell>
          <StatValue>{org.storeCount}</StatValue>
          <StatLabel><ShopOutlined /> Stores</StatLabel>
        </StatCell>
        <StatCell>
          <StatValue>{org.userCount}</StatValue>
          <StatLabel><UsergroupAddOutlined /> Users</StatLabel>
        </StatCell>
        <StatCell>
          <StatValue>{org.productCount}</StatValue>
          <StatLabel><AppstoreOutlined /> Products</StatLabel>
        </StatCell>
      </StatsGrid>

      <Divider style={{ margin: "0 0 0" }} />

      {/* Stores */}
      <DrawerSection>
        <DrawerSectionLabel>Stores</DrawerSectionLabel>
        <Table<OrgDetail["stores"][number]>
          dataSource={org.stores}
          columns={storeColumns}
          rowKey="id"
          size="small"
          pagination={false}
          locale={{ emptyText: "No stores yet" }}
        />
      </DrawerSection>

      <Divider style={{ margin: "12px 0 0" }} />

      {/* Users */}
      <DrawerSection>
        <DrawerSectionLabel>Team Members</DrawerSectionLabel>
        <Table<OrgDetail["users"][number]>
          dataSource={org.users}
          columns={userColumns}
          rowKey="id"
          size="small"
          pagination={{ pageSize: 5, size: "small" }}
          locale={{ emptyText: "No users yet" }}
        />
      </DrawerSection>

      {/* Actions */}
      <DrawerActions>
        <Button
          danger
          icon={<StopOutlined />}
          size="small"
          onClick={() => {/* TODO: suspend org API call */}}
        >
          {org.isActive ? "Suspend Org" : "Activate Org"}
        </Button>
      </DrawerActions>
    </DrawerBody>
  );
});

export default PlatformAdminOrgDetailPanel;
