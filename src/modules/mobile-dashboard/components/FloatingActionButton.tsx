"use client";

import { PlusOutlined } from "@ant-design/icons";
import { Button } from "antd";

export function FloatingActionButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button
      type="primary"
      shape="round"
      icon={<PlusOutlined />}
      onClick={onClick}
      style={{
        position: "fixed",
        right: 16,
        bottom: 118,
        height: 52,
        maxWidth: "calc(100vw - 32px)",
        paddingInline: 18,
        borderRadius: 999,
        boxShadow: "0 18px 30px rgba(22, 119, 255, 0.28)",
        zIndex: 30,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </Button>
  );
}
