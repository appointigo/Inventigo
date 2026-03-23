"use client";

import { useState } from "react";
import { Table, Button, Space, Tag, Input, Tooltip, Modal, Flex, Badge, Popconfirm } from "antd";
import { App } from "antd";
import { PlusOutlined, EditOutlined, SearchOutlined, StopOutlined, CheckCircleOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { useStoreRecords } from "../hooks/useStoreRecords";
import StoreForm from "./StoreForm";
import type { StoreRecord, CreateStoreInput, UpdateStoreInput } from "../types";

export default function StoreTable() {
  const { message } = App.useApp();
  const { stores, loading, createStore, updateStore } = useStoreRecords();

  const [search, setSearch] = useState("");
  const [formVisible, setFormVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedStore, setSelectedStore] = useState<StoreRecord | null>(null);

  const filtered = stores.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.code.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = () => {
    setSelectedStore(null);
    setFormVisible(true);
  };

  const handleEdit = (store: StoreRecord) => {
    setSelectedStore(store);
    setFormVisible(true);
  };

  const handleFormSubmit = async (values: CreateStoreInput | UpdateStoreInput) => {
    setSubmitting(true);
    try {
      if (selectedStore) {
        await updateStore(selectedStore.id, values as UpdateStoreInput);
        message.success("Store updated");
      } 
      else {
        await createStore(values as CreateStoreInput);
        message.success("Store created");
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

  const handleToggleActive = async (store: StoreRecord) => {
    try {
      await updateStore(store.id, { isActive: !store.isActive });
      message.success(store.isActive ? "Store deactivated" : "Store activated");
    } 
    catch (err) {
      message.error(err instanceof Error ? err.message : "Operation failed");
    }
  };

  const columns: ColumnsType<StoreRecord> = [
    {
      title: "Store",
      dataIndex: "name",
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (name: string, record) => (
        <Space orientation="vertical" size={0}>
          <span style={{ fontWeight: 500 }}>{name}</span>
          <Tag style={{ marginTop: 2 }}>{record.code}</Tag>
        </Space>
      ),
    },
    {
      title: "Address",
      dataIndex: "address",
      ellipsis: true,
      render: (address: string | null) =>
        address ?? <span style={{ color: "#8c8c8c" }}>—</span>,
    },
    {
      title: "Phone",
      dataIndex: "phone",
      width: 160,
      render: (phone: string | null) =>
        phone ?? <span style={{ color: "#8c8c8c" }}>—</span>,
    },
    {
      title: "Users",
      dataIndex: "userCount",
      width: 80,
      align: "center",
      sorter: (a, b) => a.userCount - b.userCount,
    },
    {
      title: "Status",
      dataIndex: "isActive",
      width: 90,
      align: "center",
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
      width: 100,
      align: "center",
      render: (_, record) => (
        <Space>
          <Tooltip title="Edit" destroyOnHidden>
            <Button type="text" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          </Tooltip>
          <Popconfirm
            title={record.isActive ? "Deactivate store?" : "Activate store?"}
            onConfirm={() => handleToggleActive(record)}
            okText="Confirm"
          >
            <Tooltip
              title={record.isActive ? "Deactivate" : "Activate"}
              destroyOnHidden
            >
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
          placeholder="Search stores..."
          prefix={<SearchOutlined />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          allowClear
          style={{ maxWidth: 300 }}
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          Add Store
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
          showTotal: (t) => `${t} stores`,
        }}
      />

      <Modal
        title={selectedStore ? "Edit Store" : "Add Store"}
        open={formVisible}
        onCancel={() => setFormVisible(false)}
        footer={null}
        destroyOnHidden
      >
        <StoreForm
          initialValues={selectedStore}
          onSubmit={handleFormSubmit}
          onCancel={() => setFormVisible(false)}
          loading={submitting}
        />
      </Modal>
    </>
  );
}
