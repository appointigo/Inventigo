import { resolveFinanceScope } from "@/modules/finance/financeAccess";
import { financeError, requireFinanceUser } from "@/modules/finance/financeRoute";
import { financeService } from "@/modules/finance/financeService";

export async function GET(request: Request) {
  try {
    const user = await requireFinanceUser();
    const scope = await resolveFinanceScope(user, new URL(request.url).searchParams.get("storeId"));
    return Response.json(await financeService.summary(user.orgId, scope.storeId));
  } catch (error) {
    return financeError(error, "Unable to load finance summary");
  }
}
