import { Suspense } from "react";
import ProfitabilityPage from "@/modules/analytics/components/ProfitabilityPage";

export default function Page() {
  return <Suspense fallback={null}><ProfitabilityPage /></Suspense>;
}
