"use client";

import { Typography, Empty } from "antd";
import { SettingOutlined } from "@ant-design/icons";

export default function SettingsPage() {
  return (
    <div style={{ padding: 24 }}>
      <Typography.Title level={3}>Settings</Typography.Title>
      <Empty
        image={<SettingOutlined style={{ fontSize: 64, color: "#d9d9d9" }} />}
        description="Settings & user management coming in Phase 6"
      />
    </div>
  );
}
