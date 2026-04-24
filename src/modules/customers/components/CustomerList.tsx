"use client";

import { SearchOutlined, PlusOutlined } from "@ant-design/icons";
import { Button, Input, Space, Table, Tabs } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { CustomerListItemDto, CustomerListType } from "../types";

type CustomerListProps = {
  customers: CustomerListItemDto[];
  loading: boolean;
  total: number;
  page: number;
  pageSize: number;
  search: string;
  activeType: CustomerListType;
  onSearchChange: (value: string) => void;
  onTypeChange: (type: CustomerListType) => void;
  onPageChange: (page: number, pageSize: number) => void;
  onSelectCustomer: (customerId: string) => void;
  onCreateCustomer: () => void;
};

export default function CustomerList({
  customers,
  loading,
  total,
  page,
  pageSize,
  search,
  activeType,
  onSearchChange,
  onTypeChange,
  onPageChange,
  onSelectCustomer,
  onCreateCustomer,
}: CustomerListProps) {
  const filterItems = [
    { key: "all", label: "All" },
    { key: "recent", label: "Recent" },
    { key: "high_spenders", label: "High Spenders" },
    { key: "inactive", label: "Inactive" },
  ];

  const columns: ColumnsType<CustomerListItemDto> = [
    {
      title: "Name",
      dataIndex: "name",
      render: (name: string | null, row) => (
        <a onClick={() => onSelectCustomer(row.id)}>{name || "Unnamed Customer"}</a>
      ),
    },
    {
      title: "Mobile",
      dataIndex: "mobile",
      width: 160,
    },
    {
      title: "Total Spent",
      dataIndex: "totalSpent",
      width: 140,
      align: "right",
      render: (value: number) => `Rs ${value.toFixed(2)}`,
    },
    {
      title: "Total Visits",
      dataIndex: "totalVisits",
      width: 120,
      align: "right",
    },
    {
      title: "Avg Order Value",
      dataIndex: "avgOrderValue",
      width: 140,
      align: "right",
      render: (value: number) => `Rs ${value.toFixed(2)}`,
    },
    {
      title: "Last Visit",
      dataIndex: "lastVisitAt",
      width: 150,
      render: (value: string | null) => (value ? new Date(value).toLocaleDateString("en-IN") : "-")
    },
    {
      title: "Status",
      dataIndex: "isInactive",
      width: 120,
      render: (isInactive: boolean) => (isInactive ? "🔴 Inactive" : "🟢 Active"),
    },
  ];

  return (
    <>
      <Tabs
        activeKey={activeType}
        items={filterItems}
        onChange={(key) => onTypeChange(key as CustomerListType)}
        style={{ marginBottom: 8 }}
      />

      <Space style={{ width: "100%", justifyContent: "space-between", marginBottom: 16 }} wrap>
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          prefix={<SearchOutlined />}
          placeholder="Search by name or mobile"
          allowClear
          style={{ width: 320 }}
        />

        <Button type="primary" icon={<PlusOutlined />} onClick={onCreateCustomer}>
          Add Customer
        </Button>
      </Space>

      <Table<CustomerListItemDto>
        rowKey="id"
        columns={columns}
        dataSource={customers}
        loading={loading}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showTotal: (count) => `${count} customers`,
          onChange: onPageChange,
        }}
      />
    </>
  );
}
