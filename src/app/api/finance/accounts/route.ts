import { FinancialAccountType } from "@prisma/client";
import { resolveFinanceScope } from "@/modules/finance/financeAccess";
import { financeError, requireFinanceUser } from "@/modules/finance/financeRoute";
import { financeService } from "@/modules/finance/financeService";

export async function GET(request: Request) {
  try {
    const user = await requireFinanceUser();
    const scope = await resolveFinanceScope(user, new URL(request.url).searchParams.get("storeId"));
    return Response.json(await financeService.getAccounts(user.orgId, scope.storeId));
  } catch (error) {
    return financeError(error, "Unable to load financial accounts");
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireFinanceUser();
    const body = await request.json();
    const scope = await resolveFinanceScope(user, body.storeId ?? null);
    if (!Object.values(FinancialAccountType).includes(body.type)) throw new Error("Invalid account type");
    return Response.json(await financeService.createAccount(user.orgId, user.id, { ...body, storeId: scope.storeId }), { status: 201 });
  } catch (error) {
    return financeError(error, "Unable to create financial account");
  }
}
