"use client";

import React from "react";
import { Input, Select, DatePicker, Space, Button, Tooltip } from "antd";
import { SearchOutlined, DownloadOutlined, BellOutlined, QuestionCircleOutlined } from "@ant-design/icons";
import type { SaleFilters, PaymentMethodType } from "../types";
const { RangePicker } = DatePicker;

interface Props {
  filters: SaleFilters;
  onChange: (filters: SaleFilters) => void;
}

export default function FilterBar({ filters, onChange }: Props) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
      <div style={{ flex: 1 }}>
        <Input
          placeholder="Search orders, invoices..."
          prefix={<SearchOutlined />}
          value={filters.search ?? ""}
          onChange={(e) => onChange({ ...filters, search: e.target.value || undefined })}
          allowClear
        />
      </div>

      <Space>
        <Select
          placeholder="Payment method"
          value={filters.paymentMethod}
          style={{ width: 140 }}
          onChange={(v) => onChange({ ...filters, paymentMethod: v as PaymentMethodType | undefined })}
          allowClear
          options={[{ label: "Cash", value: "CASH" }, { label: "Card", value: "CARD" }, { label: "UPI", value: "UPI" }]}
        />

        <Select
          placeholder="Order type"
          value={(filters as any).type ?? ""}
          style={{ width: 140 }}
          onChange={(v) => onChange({ ...filters, type: v === "" ? undefined : (v as any) })}
          options={[{ label: "All Types", value: "" }, { label: "Sale", value: "SALE" }, { label: "Exchange", value: "EXCHANGE" }, { label: "Return", value: "RETURN" }]}
        />

        <Select
          placeholder="Status"
          value={filters.status}
          style={{ width: 140 }}
          onChange={(v) => onChange({ ...filters, status: v as any })}
          allowClear
          options={[{ label: "Completed", value: "COMPLETED" }, { label: "Exchanged", value: "EXCHANGED" }, { label: "Refunded", value: "REFUNDED" }, { label: "Pending", value: "PENDING" }]}
        />

        <RangePicker
          onChange={(dates) => onChange({ ...filters, startDate: dates?.[0]?.toISOString() ?? undefined, endDate: dates?.[1]?.toISOString() ?? undefined })}
        />

        <Button onClick={() => onChange({})}>Clear Filters</Button>

        <Tooltip title="Export">
          <Button icon={<DownloadOutlined />}>Export</Button>
        </Tooltip>
        <Tooltip title="Notifications"><Button icon={<BellOutlined />} /></Tooltip>
        <Tooltip title="Help"><Button icon={<QuestionCircleOutlined />} /></Tooltip>
      </Space>
    </div>
  );
}
