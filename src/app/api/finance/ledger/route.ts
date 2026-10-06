import { resolveFinanceScope } from "@/modules/finance/financeAccess";
import { financeError, requireFinanceUser } from "@/modules/finance/financeRoute";
import { financeService } from "@/modules/finance/financeService";

export async function GET(request: Request) {
  try {
    const user = await requireFinanceUser();
    const params = new URL(request.url).searchParams;
    const scope = await resolveFinanceScope(user, params.get("storeId"));
    return Response.json(await financeService.getLedger(user.orgId, scope.storeId, Number(params.get("page") ?? 1), Number(params.get("pageSize") ?? 50)));
  } catch (error) {
    return financeError(error, "Unable to load cash movements");
  }
}
