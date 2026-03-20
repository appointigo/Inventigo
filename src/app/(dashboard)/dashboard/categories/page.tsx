"use client";

import { Typography, Empty } from "antd";
import { AppstoreOutlined } from "@ant-design/icons";

export default function CategoriesPage() {
  return (
    <div style={{ padding: 24 }}>
      <Typography.Title level={3}>Categories</Typography.Title>
      <Empty
        image={<AppstoreOutlined style={{ fontSize: 64, color: "#d9d9d9" }} />}
        description="Category management coming in Phase 3"
      />
    </div>
  );
}
