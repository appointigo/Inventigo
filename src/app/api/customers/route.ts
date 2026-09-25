import { NextResponse } from "next/server";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { customerService } from "@/modules/customers/services/customerService";
import { customerIntelligenceService } from "@/modules/customers/services/customerIntelligenceService";
import type { CustomerGroupFilter, CustomerSortField, SortDirection } from "@/modules/customers/types";
import { CUSTOMER_DATE_PRESETS, type CustomerDatePreset } from "@/modules/customers/utils/customerDateWindow";

const VALID_TYPES: CustomerGroupFilter[] = ["all", "recent", "repeat", "high_spenders", "attention", "never_purchased"];

export async function GET(request: Request) {
  let user;
  try {
    user = await requireOrgAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const page = Number(searchParams.get("page") ?? "1");
    const pageSize = Number(searchParams.get("pageSize") ?? "10");
    const typeParam = (searchParams.get("type") ?? "all") as CustomerGroupFilter;
    const requestedStore = searchParams.get("storeId");
    if (user.storeId && requestedStore && requestedStore !== user.storeId) return NextResponse.json({ error: "Store access denied" }, { status: 403 });

    if (!VALID_TYPES.includes(typeParam)) {
      return NextResponse.json({ error: "Invalid type filter" }, { status: 400 });
    }

    const number = (key: string) => { const value = searchParams.get(key); return value === null || value === "" ? undefined : Number(value); };
    const lastPurchaseDays = number("lastPurchaseDays");
    if (lastPurchaseDays !== undefined && !CUSTOMER_DATE_PRESETS.includes(lastPurchaseDays as CustomerDatePreset)) {
      return NextResponse.json({ error: "Invalid last-purchase period" }, { status: 400 });
    }
    const result = await customerIntelligenceService.query(user.orgId, { search, page, pageSize, group: typeParam, storeId: requestedStore ?? user.storeId, sortBy: (searchParams.get("sortBy") ?? "lastPurchase") as CustomerSortField, sortDirection: (searchParams.get("sortDirection") ?? "desc") as SortDirection, lastPurchaseDays: lastPurchaseDays as CustomerDatePreset | undefined, minSpend: number("minSpend"), maxSpend: number("maxSpend"), minOrders: number("minOrders"), maxOrders: number("maxOrders") });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let user;
  try {
    user = await requireOrgAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const created = await customerService.createCustomer(user.orgId, body);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = /required|invalid|already exists/i.test(message) ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
