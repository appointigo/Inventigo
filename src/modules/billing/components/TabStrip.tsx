"use client";

import React from "react";
import { Space, Button } from "antd";

interface Props {
  active: string;
  onChange: (key: string) => void;
}

export default function TabStrip({ active, onChange }: Props) {
  const tabs = [
    { key: "ALL", label: "All Orders" },
    { key: "SALE", label: "Sales" },
    { key: "EXCHANGE", label: "Exchanges" },
    { key: "RETURN", label: "Refunds" },
  ];

  return (
    <div style={{ marginBottom: 12 }}>
      <Space>
        {tabs.map((t) => (
          <Button
            key={t.key}
            onClick={() => onChange(t.key)}
            style={t.key === active ? { background: "#111827", color: "#fff", borderRadius: 8 } : { background: "#fff", color: "#374151", border: "1px solid #e5e7eb", borderRadius: 8 }}
          >
            {t.label}
          </Button>
        ))}
      </Space>
    </div>
  );
}
