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
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, padding: 14, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12 }}>
      <div style={{ flex: '0 0 auto' }}>
        <Input
          placeholder="Search orders, invoices..."
          prefix={<SearchOutlined />}
          value={filters.search ?? ""}
          onChange={(e) => onChange({ ...filters, search: e.target.value || undefined })}
          allowClear
          style={{ height: 44, width: 320 }}
        />
      </div>

      <Space>
        <Select
          placeholder="Payment method"
          value={filters.paymentMethod}
          style={{ width: 140, height: 40 }}
          onChange={(v) => onChange({ ...filters, paymentMethod: v as PaymentMethodType | undefined })}
          allowClear
          options={[{ label: "Cash", value: "CASH" }, { label: "Card", value: "CARD" }, { label: "UPI", value: "UPI" }]}
        />

        {/* Transaction type is handled by the bottom tabs; removed duplicate type dropdown */}

        <Select
          placeholder="Status"
          value={filters.status}
          style={{ width: 140 }}
          onChange={(v) => onChange({ ...filters, status: v === undefined ? undefined : (v as SaleFilters["status"]) })}
          allowClear
          options={[{ label: "Completed", value: "COMPLETED" }, { label: "Exchanged", value: "EXCHANGED" }, { label: "Refunded", value: "REFUNDED" }, { label: "Pending", value: "PENDING" }]}
        />

        <RangePicker
          onChange={(dates) => onChange({ ...filters, startDate: dates?.[0]?.toISOString() ?? undefined, endDate: dates?.[1]?.toISOString() ?? undefined })}
          style={{ height: 40 }}
        />

        <Button onClick={() => onChange({})} type="default" size="small">Clear</Button>
      </Space>
    </div>
  );
}
