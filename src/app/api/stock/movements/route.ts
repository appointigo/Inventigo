import { NextResponse } from "next/server";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { stockService } from "@/modules/stock/services/stockService";
import {
  AnalyticsAccessError,
  resolveAnalyticsStore,
} from "@/modules/analytics/services/analyticsAccess";
import { normalizeInventoryPagination } from "@/modules/stock/utils/pagination";

export const GET = async (request: Request) => {
  let user;
  try {
    user = await requireOrgAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const searchParams = new URL(request.url).searchParams;
    const scope = await resolveAnalyticsStore(user, searchParams.get("storeId"));
    const { page, pageSize } = normalizeInventoryPagination(
      searchParams.get("page"),
      searchParams.get("pageSize")
    );
    const result = await stockService.getMovementHistory({
      storeId: scope.storeId,
      page,
      pageSize,
    });
    return NextResponse.json(
      searchParams.get("paginated") === "true" ? { ...result, page, pageSize } : result.items
    );
  } catch (error) {
    if (error instanceof AnalyticsAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
};
