"use client";

import { Typography, Empty } from "antd";
import { BarChartOutlined } from "@ant-design/icons";

export default function ReportsPage() {
  return (
    <div style={{ padding: 24 }}>
      <Typography.Title level={3}>Reports</Typography.Title>
      <Empty
        image={<BarChartOutlined style={{ fontSize: 64, color: "#d9d9d9" }} />}
        description="Reports & analytics coming in Phase 7"
      />
    </div>
  );
}
