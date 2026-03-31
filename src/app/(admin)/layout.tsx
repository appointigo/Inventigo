"use client";

import { App } from "antd";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <App>{children}</App>;
}
