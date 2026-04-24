import { NextRequest, NextResponse } from "next/server";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { customerService } from "@/modules/customers/services/customerService";

export const POST = async (request: NextRequest) => {
  let user;
  try {
    user = await requireOrgAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const mobile = String(body.mobile ?? "").trim();
    const name = typeof body.name === "string" ? body.name : undefined;
    const email = typeof body.email === "string" ? body.email : undefined;

    if (!mobile) {
      return NextResponse.json({ error: "mobile is required" }, { status: 400 });
    }

    const customer = await customerService.getOrCreateCustomer(user.orgId!, mobile, name, email);
    return NextResponse.json(customer);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = /required|invalid/i.test(message) ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
};
