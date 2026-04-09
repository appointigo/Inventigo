"use client";

import React from "react";
import { App } from "antd";
import PlatformAdminLayout from "@/modules/platform-admin/components/layout/PlatformAdminLayout";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <App>
      <PlatformAdminLayout>{children}</PlatformAdminLayout>
    </App>
  );
}
