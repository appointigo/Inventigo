"use client";

import { AttendanceLeavePage } from "@/modules/attendance-leave/components/AttendanceLeavePage";
import { useSearchParams } from "next/navigation";

export default function AttendanceLeaveDashboardPage() {
  const searchParams = useSearchParams();
  const view = searchParams.get("view");
  const initialTab = view === "leave" ? "leaves" : "attendance";
  return <AttendanceLeavePage key={initialTab} initialTab={initialTab} />;
}
