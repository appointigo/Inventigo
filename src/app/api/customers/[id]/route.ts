import { NextResponse } from "next/server";
import { requireOrgAuth } from "@/lib/auth.middleware";
import { customerService } from "@/modules/customers/services/customerService";

export async function GET(_request: Request, context: RouteContext<"/api/customers/[id]">) {
  const user = await requireOrgAuth().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await context.params;
    const customer = await customerService.getCustomerById(user.orgId, decodeURIComponent(id), user.storeId);
    if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    return NextResponse.json(customer);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext<"/api/customers/[id]">) {
  const user = await requireOrgAuth().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await context.params;
    const updated = await customerService.updateCustomer(
      user.orgId,
      decodeURIComponent(id),
      await request.json(),
      user.storeId
    );
    if (!updated) return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    return NextResponse.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { error: message },
      { status: /required|invalid|already exists/i.test(message) ? 400 : 500 }
    );
  }
}
