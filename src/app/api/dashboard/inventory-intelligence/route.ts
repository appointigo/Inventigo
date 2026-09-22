import { NextResponse } from "next/server";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { inventoryIntelligenceService } from "@/modules/inventory-intelligence/services/inventoryIntelligenceService";
import {
  AnalyticsPeriodError,
  parseInventoryAnalyticsSearchParams,
} from "@/modules/inventory-intelligence/utils/analyticsPeriod";

export const GET = async (request: Request) => {
  let user;
  try {
    user = await requireOrgAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const { storeId, period } = parseInventoryAnalyticsSearchParams(searchParams, user.storeId);
    const data = await inventoryIntelligenceService.getData(user.orgId, storeId, period);
    return NextResponse.json(data);
  } catch (error) {
    if (
      error instanceof AnalyticsPeriodError ||
      (error instanceof Error && error.message === "STORE_NOT_FOUND")
    ) {
      return NextResponse.json(
        {
          error:
            error.message === "STORE_NOT_FOUND"
              ? "Store was not found in this organization"
              : error.message,
        },
        { status: 400 }
      );
    }
    console.error("[inventory-intelligence GET]", error);
    return NextResponse.json({ error: "Unable to load inventory intelligence" }, { status: 500 });
  }
};
