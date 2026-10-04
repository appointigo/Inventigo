"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Space, Typography } from "antd";
import { ArrowRightOutlined, CheckCircleOutlined, WhatsAppOutlined } from "@ant-design/icons";
import { Role } from "@prisma/client";
import { useCurrentUser } from "@/modules/auth/hooks/useAuth";

export default function IntegrationsPage() {
  const router = useRouter();
  const { user, isLoading } = useCurrentUser();
  const canManageIntegrations = user?.role === Role.OWNER || user?.role === Role.ADMIN;

  useEffect(() => {
    if (!isLoading && user && !canManageIntegrations) router.replace("/dashboard/settings");
  }, [canManageIntegrations, isLoading, router, user]);

  if (isLoading || !canManageIntegrations) return null;

  return (
    <div style={{ padding: 24, maxWidth: 960 }}>
      <Typography.Title level={2} style={{ marginBottom: 4 }}>Integrations</Typography.Title>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 24 }}>
        Connect services used by your stores and manage their technical configuration.
      </Typography.Paragraph>
      <Card style={{ borderRadius: 12 }}>
        <Space align="start" size={16} style={{ width: "100%" }}>
          <span style={{ width: 44, height: 44, borderRadius: 11, display: "inline-flex", alignItems: "center", justifyContent: "center", background: "#ecfdf5", color: "#16a34a", fontSize: 21 }}><WhatsAppOutlined /></span>
          <div style={{ flex: 1 }}>
            <Space size={8}><Typography.Title level={4} style={{ margin: 0 }}>WhatsApp</Typography.Title><CheckCircleOutlined style={{ color: "#16a34a" }} /></Space>
            <Typography.Paragraph type="secondary" style={{ margin: "6px 0 14px" }}>
              Configure Meta accounts, phone numbers, store mappings, templates, readiness, and integration health.
            </Typography.Paragraph>
            <Button type="primary" onClick={() => router.push("/dashboard/whatsapp")}>Manage WhatsApp integration <ArrowRightOutlined /></Button>
          </div>
        </Space>
      </Card>
    </div>
  );
}
