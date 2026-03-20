"use client";

import { Typography } from "antd";

const { Title, Paragraph } = Typography;

export default function DashboardPage() {
  return (
    <div style={{ padding: 24 }}>
      <Title level={2}>Dashboard</Title>
      <Paragraph type="secondary">
        Welcome to Inventigo. Dashboard widgets will be implemented in Phase 7.
      </Paragraph>
    </div>
  );
}
