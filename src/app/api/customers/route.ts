import { NextResponse } from "next/server";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { customerService } from "@/modules/customers/services/customerService";
import type { CustomerListType } from "@/modules/customers/types";

const VALID_TYPES: CustomerListType[] = ["all", "recent", "high_spenders", "inactive"];

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
    const typeParam = (searchParams.get("type") ?? "all") as CustomerListType;
    const highSpenderThreshold = Number(searchParams.get("highSpenderThreshold") ?? "10000");

    if (!VALID_TYPES.includes(typeParam)) {
      return NextResponse.json({ error: "Invalid type filter" }, { status: 400 });
    }

    const result = await customerService.listCustomers(user.orgId, {
      search,
      page,
      pageSize,
      type: typeParam,
      highSpenderThreshold,
    });

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
