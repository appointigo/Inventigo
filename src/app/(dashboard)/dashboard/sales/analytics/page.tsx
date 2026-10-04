import { Suspense } from "react";
import SalesAnalyticsPage from "@/modules/analytics/components/SalesAnalyticsPage";

export default function Page() {
  return <Suspense fallback={null}><SalesAnalyticsPage /></Suspense>;
}
