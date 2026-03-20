"use client";

import { Typography, Empty } from "antd";
import { TagsOutlined } from "@ant-design/icons";

export default function BrandsPage() {
  return (
    <div style={{ padding: 24 }}>
      <Typography.Title level={3}>Brands</Typography.Title>
      <Empty
        image={<TagsOutlined style={{ fontSize: 64, color: "#d9d9d9" }} />}
        description="Brand management coming in Phase 3"
      />
    </div>
  );
}
