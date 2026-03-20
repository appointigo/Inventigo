"use client";

import { Typography, Empty } from "antd";
import { FileTextOutlined } from "@ant-design/icons";

export default function PurchaseOrdersPage() {
  return (
    <div style={{ padding: 24 }}>
      <Typography.Title level={3}>Purchase Orders</Typography.Title>
      <Empty
        image={<FileTextOutlined style={{ fontSize: 64, color: "#d9d9d9" }} />}
        description="Purchase order management coming in Phase 5"
      />
    </div>
  );
}
