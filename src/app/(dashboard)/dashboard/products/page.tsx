"use client";

import { Typography, Empty } from "antd";
import { ShoppingOutlined } from "@ant-design/icons";

export default function ProductsPage() {
  return (
    <div style={{ padding: 24 }}>
      <Typography.Title level={3}>Products</Typography.Title>
      <Empty
        image={<ShoppingOutlined style={{ fontSize: 64, color: "#d9d9d9" }} />}
        description="Product management coming in Phase 3"
      />
    </div>
  );
}
