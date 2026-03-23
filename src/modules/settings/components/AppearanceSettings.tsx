"use client";

import { Card, Segmented, Typography, Space } from "antd";
import { BulbOutlined, BulbFilled } from "@ant-design/icons";
import { useThemeMode } from "../hooks/useTheme";

const { Text, Paragraph } = Typography;

export default function AppearanceSettings() {
  const { mode, toggleMode } = useThemeMode();

  return (
    <Card title="Appearance" style={{ maxWidth: 480 }}>
      <Space orientation="vertical" size={16} style={{ width: "100%" }}>
        <div>
          <Text strong>Theme</Text>
          <Paragraph type="secondary" style={{ margin: "4px 0 12px" }}>
            Choose between light and dark mode. Your preference is saved in your browser.
          </Paragraph>
          <Segmented
            value={mode}
            onChange={(val) => {
              if (val !== mode) toggleMode();
            }}
            options={[
              { label: "Light", value: "light", icon: <BulbOutlined /> },
              { label: "Dark", value: "dark", icon: <BulbFilled /> },
            ]}
          />
        </div>
      </Space>
    </Card>
  );
}
