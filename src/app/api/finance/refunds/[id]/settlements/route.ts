import { financeError, requireFinanceUser } from "@/modules/finance/financeRoute";
import { financeService } from "@/modules/finance/financeService";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireFinanceUser();
    const body = await request.json();
    return Response.json(await financeService.settleRefund(user.orgId, user.id, (await params).id, body, user.storeId), { status: 201 });
  } catch (error) {
    return financeError(error, "Unable to settle refund");
  }
}
