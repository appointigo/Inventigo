import { financeError, requireFinanceUser } from "@/modules/finance/financeRoute";
import { financeService } from "@/modules/finance/financeService";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireFinanceUser();
    return Response.json(await financeService.settleExpense(user.orgId, user.id, (await params).id, await request.json(), user.storeId), { status: 201 });
  } catch (error) {
    return financeError(error, "Unable to settle expense");
  }
}
