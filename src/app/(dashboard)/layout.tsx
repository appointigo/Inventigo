"use client";

import { App } from "antd";
import { StoreProvider } from "@/providers/StoreProvider";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <App>
      <StoreProvider defaultStoreId={null}>
        {children}
      </StoreProvider>
    </App>
  );
}
