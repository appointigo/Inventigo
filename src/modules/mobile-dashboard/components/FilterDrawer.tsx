"use client";

import type { ReactNode } from "react";
import { Button, Drawer, Space } from "antd";

export function FilterDrawer({
  title,
  open,
  onClose,
  onReset,
  children,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  onReset?: () => void;
  children: ReactNode;
}) {
  return (
    <Drawer title={title} placement="bottom" open={open} onClose={onClose} height="auto" destroyOnHidden>
      <div style={{ display: "grid", gap: 16 }}>
        {children}
        <Space style={{ justifyContent: "space-between", width: "100%" }}>
          {onReset ? <Button onClick={onReset}>Reset</Button> : <span />}
          <Button type="primary" onClick={onClose}>Apply</Button>
        </Space>
      </div>
    </Drawer>
  );
}
