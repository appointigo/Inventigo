"use client";

import { App } from "antd";

export default function StockivaAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <App>{children}</App>;
}
