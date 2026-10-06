import { Suspense } from "react";
import ReplenishmentPage from "@/modules/replenishment/ReplenishmentPage";
export default function Page(){return <Suspense fallback={null}><ReplenishmentPage /></Suspense>;}
