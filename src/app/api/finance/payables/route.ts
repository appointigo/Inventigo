import { resolveFinanceScope } from "@/modules/finance/financeAccess";
import { financeError, requireFinanceUser } from "@/modules/finance/financeRoute";
import { financeService } from "@/modules/finance/financeService";

export async function GET(request: Request) {
  try {
    const user = await requireFinanceUser();
    const scope = await resolveFinanceScope(user, new URL(request.url).searchParams.get("storeId"));
    return Response.json(await financeService.getPayables(user.orgId, scope.storeId));
  } catch (error) {
    return financeError(error, "Unable to load supplier payables");
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireFinanceUser();
    const body = await request.json();
    return Response.json(await financeService.createPayable(user.orgId, user.id, body, user.storeId), { status: 201 });
  } catch (error) {
    return financeError(error, "Unable to create supplier payable");
  }
}
