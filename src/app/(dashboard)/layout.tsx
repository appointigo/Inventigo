"use client";

import { App } from "antd";
import { StoreProvider } from "@/providers/StoreProvider";
import AppLayout from "@/modules/layout/components/AppLayout";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <App>
      <StoreProvider defaultStoreId={null}>
        <AppLayout>{children}</AppLayout>
      </StoreProvider>
    </App>
  );
}
