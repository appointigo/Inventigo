import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { canAccessExpenses } from "@/lib/rbac";

export default async function ExpensesLayout({ children }: { children: ReactNode }) {
  const user = await requireOrgAuth().catch(() => null);
  if (!user || !canAccessExpenses(user.role)) redirect("/dashboard");
  return children;
}
