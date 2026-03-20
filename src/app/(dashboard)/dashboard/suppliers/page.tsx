"use client";

import { Typography, Empty } from "antd";
import { ShopOutlined } from "@ant-design/icons";

export default function SuppliersPage() {
  return (
    <div style={{ padding: 24 }}>
      <Typography.Title level={3}>Suppliers</Typography.Title>
      <Empty
        image={<ShopOutlined style={{ fontSize: 64, color: "#d9d9d9" }} />}
        description="Supplier management coming in Phase 5"
      />
    </div>
  );
}
