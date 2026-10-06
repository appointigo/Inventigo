import { resolveFinanceScope } from "@/modules/finance/financeAccess";
import { financeError, requireFinanceUser } from "@/modules/finance/financeRoute";
import { financeService } from "@/modules/finance/financeService";

export async function GET(request: Request) {
  try {
    const user = await requireFinanceUser();
    const scope = await resolveFinanceScope(user, new URL(request.url).searchParams.get("storeId"));
    return Response.json(await financeService.getRefunds(user.orgId, scope.storeId));
  } catch (error) {
    return financeError(error, "Unable to load refund liabilities");
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireFinanceUser();
    const body = await request.json();
    return Response.json(await financeService.createRefundLiability(user.orgId, user.id, body.returnTransactionId, user.storeId), { status: 201 });
  } catch (error) {
    return financeError(error, "Unable to create refund liability");
  }
}
