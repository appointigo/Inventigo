"use client";

import { App } from "antd";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <App>{children}</App>;
}
