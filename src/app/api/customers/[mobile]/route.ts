import { NextResponse } from "next/server";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { customerService } from "@/modules/customers/services/customerService";

export async function GET(_request: Request, { params }: { params: Promise<{ mobile: string }> }) {
  let user;
  try {
    user = await requireOrgAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { mobile: id } = await params;
    const customer = await customerService.getCustomerById(user.orgId, decodeURIComponent(id));

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    return NextResponse.json(customer);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ mobile: string }> }) {
  let user;
  try {
    user = await requireOrgAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { mobile: id } = await params;
    const payload = await request.json();
    const updated = await customerService.updateCustomer(user.orgId, decodeURIComponent(id), payload);

    if (!updated) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = /required|invalid|already exists/i.test(message) ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
