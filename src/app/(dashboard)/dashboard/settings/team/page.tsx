"use client";

import { useState } from "react";
import { Card, Table, Button, Tag, Modal, Form, Input, Select, Space, Typography, App, Spin, Popconfirm, Tooltip, Flex } from "antd";
import { PlusOutlined, DeleteOutlined, MailOutlined } from "@ant-design/icons";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ROLE_LABELS, ROLE_COLORS } from "@/shared/constants/roles";
import type { TeamMember, Invitation, CreateInvitationInput } from "@/modules/settings/types/org";
import type { Role } from "@prisma/client";
import { useStoreRecords } from "@/modules/settings/hooks/useStoreRecords";

const { Title, Text } = Typography;

const INVITABLE_ROLES: Role[] = ["ADMIN", "MANAGER", "STAFF"];

const TeamPage = () => {
  const { user } = useAuth();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const { stores } = useStoreRecords();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [form] = Form.useForm();
  const selectedRole = Form.useWatch("role", form);

  const canManage = user?.role === "OWNER" || user?.role === "ADMIN";

  // ── Fetch team members ──────────────────────────────────────────────────────
  const { data: members = [], isLoading: membersLoading } = useQuery<TeamMember[]>({
    queryKey: ["team-members"],
    queryFn: async () => {
      const res = await fetch("/api/team");
      if (!res.ok) throw new Error("Failed to load team");
      return res.json();
    },
  });

  // ── Fetch pending invitations ───────────────────────────────────────────────
  const { data: invitations = [], isLoading: invitationsLoading } = useQuery<Invitation[]>({
    queryKey: ["invitations"],
    queryFn: async () => {
      const res = await fetch("/api/invitations");
      if (!res.ok) throw new Error("Failed to load invitations");
      return res.json();
    },
  });

  // ── Send invitation ─────────────────────────────────────────────────────────
  const inviteMutation = useMutation({
    mutationFn: async (input: CreateInvitationInput) => {
      const res = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to send invitation");
      }
      return res.json();
    },
    onSuccess: () => {
      message.success("Invitation sent");
      queryClient.invalidateQueries({ queryKey: ["invitations"] });
      setInviteOpen(false);
      form.resetFields();
    },
    onError: (err: Error) => {
      message.error(err.message);
    },
  });

  // ── Revoke invitation ───────────────────────────────────────────────────────
  const revokeMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      const res = await fetch(`/api/invitations/${invitationId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to revoke invitation");
    },
    onSuccess: () => {
      message.success("Invitation revoked");
      queryClient.invalidateQueries({ queryKey: ["invitations"] });
    },
    onError: () => {
      message.error("Failed to revoke invitation");
    },
  });

  const memberColumns = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      render: (name: string, record: TeamMember) => (
        <Space orientation="vertical" size={0}>
          <Text strong>{name}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{record.email}</Text>
        </Space>
      ),
    },
    {
      title: "Role",
      dataIndex: "role",
      key: "role",
      render: (role: Role) => (
        <Tag color={ROLE_COLORS[role]}>{ROLE_LABELS[role]}</Tag>
      ),
    },
    {
      title: "Store",
      dataIndex: "storeName",
      key: "storeName",
      render: (storeName: string | null) => storeName ?? <Text type="secondary">—</Text>,
    },
    {
      title: "Status",
      dataIndex: "isActive",
      key: "isActive",
      render: (isActive: boolean) => (
        <Tag color={isActive ? "green" : "default"}>{isActive ? "Active" : "Inactive"}</Tag>
      ),
    },
  ];

  const invitationColumns = [
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      render: (email: string) => (
        <Space>
          <MailOutlined />
          <Text>{email}</Text>
        </Space>
      ),
    },
    {
      title: "Role",
      dataIndex: "role",
      key: "role",
      render: (role: Role) => (
        <Tag color={ROLE_COLORS[role]}>{ROLE_LABELS[role]}</Tag>
      ),
    },
    {
      title: "Store",
      dataIndex: "storeName",
      key: "storeName",
      render: (storeName: string | null) => storeName ?? <Text type="secondary">—</Text>,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: string) => (
        <Tag color={status === "PENDING" ? "orange" : status === "ACCEPTED" ? "green" : "red"}>
          {status}
        </Tag>
      ),
    },
    {
      title: "Invited by",
      dataIndex: "inviterName",
      key: "inviterName",
    },
    {
      title: "Expires",
      dataIndex: "expiresAt",
      key: "expiresAt",
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    ...(canManage
      ? [
          {
            title: "",
            key: "actions",
            render: (_: unknown, record: Invitation) =>
              record.status === "PENDING" ? (
                <Popconfirm
                  title="Revoke this invitation?"
                  onConfirm={() => revokeMutation.mutate(record.id)}
                  okText="Revoke"
                  okButtonProps={{ danger: true }}
                >
                  <Tooltip title="Revoke">
                    <Button size="small" danger icon={<DeleteOutlined />} />
                  </Tooltip>
                </Popconfirm>
              ) : null,
          },
        ]
      : []),
  ];

  return (
    <div style={{ padding: 24 }}>
      <Flex justify="space-between" align="center" style={{ marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>Team</Title>
        {canManage && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setInviteOpen(true)}>
            Invite Member
          </Button>
        )}
      </Flex>

      <Card title="Members" style={{ marginBottom: 24 }}>
        {membersLoading ? (
          <Spin />
        ) : (
          <Table
            dataSource={members}
            columns={memberColumns}
            rowKey="id"
            pagination={false}
            size="small"
          />
        )}
      </Card>

      <Card title="Pending Invitations">
        {invitationsLoading ? (
          <Spin />
        ) 
        : invitations.length === 0 ? (
          <Text type="secondary">No pending invitations</Text>
        ) 
        : (
          <Table
            dataSource={invitations}
            columns={invitationColumns}
            rowKey="id"
            pagination={false}
            size="small"
          />
        )}
      </Card>

      <Modal
        title="Invite Team Member"
        open={inviteOpen}
        onCancel={() => { setInviteOpen(false); form.resetFields(); }}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(values: CreateInvitationInput) => inviteMutation.mutate(values)}
          style={{ marginTop: 16 }}
        >
          <Form.Item
            name="email"
            label="Email address"
            rules={[
              { required: true, message: "Email is required" },
              { type: "email", message: "Enter a valid email" },
            ]}
          >
            <Input placeholder="colleague@example.com" />
          </Form.Item>

          <Form.Item name="role" label="Role" rules={[{ required: true }]} initialValue="STAFF">
            <Select
              options={INVITABLE_ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }))}
            />
          </Form.Item>

          <Form.Item
            name="storeId"
            label="Assigned Store"
            rules={selectedRole === "MANAGER" || selectedRole === "STAFF"
              ? [{ required: true, message: "Please assign a store" }]
              : undefined}
          >
            <Select
              allowClear
              placeholder="All stores (Admin only)"
              options={stores
                .filter((store) => store.isActive)
                .map((store) => ({ value: store.id, label: store.name }))}
            />
          </Form.Item>

          <div style={{ textAlign: "right" }}>
            <Space>
              <Button onClick={() => { setInviteOpen(false); form.resetFields(); }}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit" loading={inviteMutation.isPending}>
                Send Invitation
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </div>
  );
}

export default TeamPage;