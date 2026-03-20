"use client";

import { Typography, Empty } from "antd";
import { ScanOutlined } from "@ant-design/icons";

export default function ScanPage() {
  return (
    <div style={{ padding: 24 }}>
      <Typography.Title level={3}>Barcode Scanner</Typography.Title>
      <Empty
        image={<ScanOutlined style={{ fontSize: 64, color: "#d9d9d9" }} />}
        description="Barcode scanning coming in Phase 4"
      />
    </div>
  );
}
