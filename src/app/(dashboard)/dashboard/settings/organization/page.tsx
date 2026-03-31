"use client";

import { useState } from "react";
import { Card, Form, Input, Button, Typography, Tag, Spin, App, Divider, Row, Col, Statistic } from "antd";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import type { Organization } from "@/modules/settings/types/org";

const { Title, Text } = Typography;

const PLAN_COLORS: Record<string, string> = {
  FREE: "default",
  PRO: "blue",
  ENTERPRISE: "gold",
};

const OrgSettingsPage = () => {
  const { user } = useAuth();
  const { message } = App.useApp();
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const { data: org, isLoading } = useQuery<Organization>({
    queryKey: ["org", user?.orgId],
    queryFn: async () => {
      const res = await fetch("/api/org");
      if (!res.ok) throw new Error("Failed to load organization");
      return res.json();
    },
    enabled: !!user?.orgId,
  });

  const isOwner = user?.role === "OWNER";

  const onSave = async (values: { name: string }) => {
    setSaving(true);
    try {
      const res = await fetch("/api/org", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: values.name }),
      });
      if (!res.ok) {
        const err = await res.json();
        message.error(err.error ?? "Failed to update organization");
        return;
      }
      message.success("Organization updated");
    } 
    catch (error) {
        console.error(error);
        message.error("Something went wrong");
    } 
    finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 860, margin: "0 auto" }}>
      <Title level={2} style={{ marginBottom: 4 }}>Organization Settings</Title>
      <Text type="secondary">Manage your organization details and plan</Text>

      <Row gutter={16} style={{ marginTop: 24, marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic title="Plan" value={org?.plan ?? "FREE"} />
            <Tag color={PLAN_COLORS[org?.plan ?? "FREE"]} style={{ marginTop: 8 }}>
              {org?.plan ?? "FREE"}
            </Tag>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic title="Team Members" value={org?.userCount ?? "—"} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic title="Stores" value={org?.storeCount ?? "—"} />
          </Card>
        </Col>
      </Row>

      <Card title="Organization Details">
        <Form
          form={form}
          layout="vertical"
          initialValues={{ name: org?.name ?? "" }}
          onFinish={onSave}
        >
          <Form.Item label="Organization Name" name="name" rules={[{ required: true }]}>
            <Input disabled={!isOwner} placeholder="Business name" />
          </Form.Item>

          <Form.Item label="Slug">
            <Input value={org?.slug ?? ""} disabled />
          </Form.Item>

          {isOwner && (
            <Button type="primary" htmlType="submit" loading={saving}>
              Save Changes
            </Button>
          )}
          {!isOwner && (
            <Text type="secondary">Only the organization owner can edit these settings.</Text>
          )}
        </Form>
      </Card>

      <Divider />

      <Card title="Organization ID">
        <Text code copyable>{org?.id ?? user?.orgId ?? "—"}</Text>
        <br />
        <Text type="secondary" style={{ fontSize: 12 }}>
          Use this ID when contacting support.
        </Text>
      </Card>
    </div>
  );
}

export default OrgSettingsPage;