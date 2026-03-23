"use client";

import { useState } from "react";
import { Table, Button, Space, Tag, Input, Popconfirm, Tooltip, Modal, Flex, Badge } from "antd";
import { App } from "antd";
import { PlusOutlined, EditOutlined, LockOutlined, SearchOutlined, StopOutlined, CheckCircleOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { Role } from "@prisma/client";
import { ROLE_LABELS, ROLE_COLORS } from "@/shared/constants/roles";
import { useUsers } from "../hooks/useUsers";
import { useStoreRecords } from "../hooks/useStoreRecords";
import UserForm from "./UserForm";
import ResetPasswordModal from "./ResetPasswordModal";
import type { AppUser, CreateUserInput, UpdateUserInput } from "../types";

export default function UserTable() {
  const { message } = App.useApp();
  const { users, loading, createUser, updateUser, deleteUser, resetPassword } = useUsers();
  const { stores } = useStoreRecords();

  const [search, setSearch] = useState("");
  const [formVisible, setFormVisible] = useState(false);
  const [resetVisible, setResetVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = () => {
    setSelectedUser(null);
    setFormVisible(true);
  };

  const handleEdit = (user: AppUser) => {
    setSelectedUser(user);
    setFormVisible(true);
  };

  const handleResetPassword = (user: AppUser) => {
    setSelectedUser(user);
    setResetVisible(true);
  };

  const handleFormSubmit = async (values: CreateUserInput | UpdateUserInput) => {
    setSubmitting(true);
    try {
      if (selectedUser) {
        await updateUser(selectedUser.id, values as UpdateUserInput);
        message.success("User updated");
      } 
      else {
        await createUser(values as CreateUserInput);
        message.success("User created");
      }
      setFormVisible(false);
    } 
    catch (err) {
      message.error(err instanceof Error ? err.message : "Operation failed");
    } 
    finally {
      setSubmitting(false);
    }
  };

  const handlePasswordReset = async (newPassword: string) => {
    if (!selectedUser) return;
    setSubmitting(true);
    try {
      await resetPassword(selectedUser.id, newPassword);
      message.success(`Password reset for ${selectedUser.name}`);
      setResetVisible(false);
    } 
    catch (err) {
      message.error(err instanceof Error ? err.message : "Reset failed");
    } 
    finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async (user: AppUser) => {
    try {
      await updateUser(user.id, { isActive: !user.isActive });
      message.success(user.isActive ? "User deactivated" : "User activated");
    } 
    catch (err) {
      message.error(err instanceof Error ? err.message : "Operation failed");
    }
  };

  const columns: ColumnsType<AppUser> = [
    {
      title: "Name",
      dataIndex: "name",
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (name: string, record) => (
        <Space orientation="vertical" size={0}>
          <span style={{ fontWeight: 500 }}>{name}</span>
          <span style={{ fontSize: 12, color: "#8c8c8c" }}>{record.email}</span>
        </Space>
      ),
    },
    {
      title: "Role",
      dataIndex: "role",
      width: 110,
      filters: Object.values(Role).map((r) => ({ text: ROLE_LABELS[r], value: r })),
      onFilter: (value, record) => record.role === value,
      render: (role: Role) => (
        <Tag color={ROLE_COLORS[role]}>{ROLE_LABELS[role]}</Tag>
      ),
    },
    {
      title: "Store",
      dataIndex: "storeName",
      width: 140,
      render: (storeName: string | null) =>
        storeName ? storeName : <span style={{ color: "#8c8c8c" }}>All stores</span>,
    },
    {
      title: "Status",
      dataIndex: "isActive",
      width: 90,
      align: "center",
      filters: [{ text: "Active", value: true }, { text: "Inactive", value: false }],
      onFilter: (value, record) => record.isActive === value,
      render: (isActive: boolean) =>
        isActive ? (
          <Badge status="success" text="Active" />
        ) : (
          <Badge status="default" text="Inactive" />
        ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 130,
      align: "center",
      render: (_, record) => (
        <Space>
          <Tooltip title="Edit" destroyOnHidden>
            <Button type="text" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          </Tooltip>
          <Tooltip title="Reset Password" destroyOnHidden>
            <Button
              type="text"
              icon={<LockOutlined />}
              onClick={() => handleResetPassword(record)}
            />
          </Tooltip>
          <Popconfirm
            title={record.isActive ? "Deactivate user?" : "Activate user?"}
            description={
              record.isActive
                ? "This user will no longer be able to log in."
                : "This user will regain access."
            }
            onConfirm={() => handleDeactivate(record)}
            okText="Confirm"
          >
            <Tooltip title={record.isActive ? "Deactivate" : "Activate"} destroyOnHidden>
              <Button
                type="text"
                danger={record.isActive}
                icon={record.isActive ? <StopOutlined /> : <CheckCircleOutlined />}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Flex justify="space-between" align="center" gap={12} wrap style={{ marginBottom: 16 }}>
        <Input
          placeholder="Search by name or email..."
          prefix={<SearchOutlined />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          allowClear
          style={{ maxWidth: 320 }}
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          Add User
        </Button>
      </Flex>

      <Table
        columns={columns}
        dataSource={filtered}
        rowKey="id"
        loading={loading}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (t) => `${t} users`,
        }}
      />

      <Modal
        title={selectedUser ? "Edit User" : "Add User"}
        open={formVisible}
        onCancel={() => setFormVisible(false)}
        footer={null}
        destroyOnHidden
      >
        <UserForm
          initialValues={selectedUser}
          stores={stores}
          onSubmit={handleFormSubmit}
          onCancel={() => setFormVisible(false)}
          loading={submitting}
        />
      </Modal>

      <Modal
        title={`Reset Password — ${selectedUser?.name}`}
        open={resetVisible}
        onCancel={() => setResetVisible(false)}
        footer={null}
        destroyOnHidden
      >
        <ResetPasswordModal
          onSubmit={handlePasswordReset}
          onCancel={() => setResetVisible(false)}
          loading={submitting}
        />
      </Modal>
    </>
  );
}
