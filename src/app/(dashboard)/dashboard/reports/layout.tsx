import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { canAccessReports } from "@/lib/rbac";

export default async function ReportsLayout({ children }: { children: ReactNode }) {
  const user = await requireOrgAuth().catch(() => null);
  if (!user || !canAccessReports(user.role)) redirect("/dashboard");
  return children;
}
