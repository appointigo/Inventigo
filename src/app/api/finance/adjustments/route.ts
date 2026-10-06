import { financeError, requireFinanceUser } from "@/modules/finance/financeRoute";
import { financeService } from "@/modules/finance/financeService";

export async function POST(request: Request) {
  try {
    const user = await requireFinanceUser();
    return Response.json(await financeService.adjust(user.orgId, user.id, await request.json(), user.storeId), { status: 201 });
  } catch (error) {
    return financeError(error, "Unable to record cash adjustment");
  }
}
