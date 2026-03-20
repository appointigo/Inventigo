"use client";

import { Typography, Empty } from "antd";
import { InboxOutlined } from "@ant-design/icons";

export default function StockPage() {
  return (
    <div style={{ padding: 24 }}>
      <Typography.Title level={3}>Stock Management</Typography.Title>
      <Empty
        image={<InboxOutlined style={{ fontSize: 64, color: "#d9d9d9" }} />}
        description="Stock management coming in Phase 4"
      />
    </div>
  );
}
