"use client";

import { Card, Typography, Tabs, Descriptions, Tag, Space, Divider } from "antd";
import { UserOutlined, ShopOutlined, DollarOutlined, BgColorsOutlined, TeamOutlined } from "@ant-design/icons";
import { Role } from "@prisma/client";
import { useCurrentUser } from "@/modules/auth/hooks/useAuth";
import { ROLE_LABELS, ROLE_COLORS } from "@/shared/constants/roles";
import UserTable from "@/modules/settings/components/UserTable";
import StoreTable from "@/modules/settings/components/StoreTable";
import StoreProfileCard from "@/modules/settings/components/StoreProfileCard";
import BillingConfigForm from "@/modules/settings/components/BillingConfigForm";
import AppearanceSettings from "@/modules/settings/components/AppearanceSettings";

const { Title, Text } = Typography;

function ProfileTab() {
  const { user } = useCurrentUser();
  if (!user) return null;
  return (
    <Card style={{ maxWidth: 520 }}>
      <Space orientation="vertical" size={4} style={{ marginBottom: 20 }}>
        <Title level={5} style={{ margin: 0 }}>{user.name}</Title>
        <Text type="secondary">{user.email}</Text>
      </Space>
      <Divider style={{ margin: "16px 0" }} />
      <Descriptions column={1} size="small">
        <Descriptions.Item label="Role">
          <Tag color={ROLE_COLORS[user.role]}>{ROLE_LABELS[user.role]}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Store Access">
          {user.storeId ? user.storeId : "All stores"}
        </Descriptions.Item>
      </Descriptions>
      <Divider style={{ margin: "16px 0" }} />
      <Text type="secondary" style={{ fontSize: 12 }}>
        To update your name, email, or password, contact your administrator.
      </Text>
    </Card>
  );
}

export default function SettingsPage() {
  const { user } = useCurrentUser();
  const isAdmin = user?.role === Role.ADMIN;

  const tabs = [
    {
      key: "profile",
      label: (
        <Space>
          <UserOutlined />
          My Profile
        </Space>
      ),
      children: (
        <div style={{ padding: "24px 0" }}>
          <ProfileTab />
        </div>
      ),
    },
    ...(isAdmin
      ? [
          {
            key: "users",
            label: (
              <Space>
                <TeamOutlined />
                User Management
              </Space>
            ),
            children: (
              <div style={{ padding: "24px 0" }}>
                <UserTable />
              </div>
            ),
          },
          {
            key: "stores",
            label: (
              <Space>
                <ShopOutlined />
                Store Management
              </Space>
            ),
            children: (
              <div style={{ padding: "24px 0" }}>
                <StoreProfileCard />
                <StoreTable />
              </div>
            ),
          },
          {
            key: "billing",
            label: (
              <Space>
                <DollarOutlined />
                Billing Config
              </Space>
            ),
            children: (
              <div style={{ padding: "24px 0" }}>
                <BillingConfigForm />
              </div>
            ),
          },
        ]
      : []),
    {
      key: "appearance",
      label: (
        <Space>
          <BgColorsOutlined />
          Appearance
        </Space>
      ),
      children: (
        <div style={{ padding: "24px 0" }}>
          <AppearanceSettings />
        </div>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Title level={3} style={{ marginBottom: 24 }}>
        Settings
      </Title>
      <Tabs
        defaultActiveKey={isAdmin ? "users" : "profile"}
        items={tabs}
        tabBarStyle={{ marginBottom: 0 }}
      />
    </div>
  );
}

