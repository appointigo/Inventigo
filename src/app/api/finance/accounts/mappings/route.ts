import { PaymentMethod } from "@prisma/client";
import { resolveFinanceScope } from "@/modules/finance/financeAccess";
import { financeError, requireFinanceUser } from "@/modules/finance/financeRoute";
import { financeService } from "@/modules/finance/financeService";

export async function POST(request: Request) {
  try {
    const user = await requireFinanceUser();
    const body = await request.json();
    const scope = await resolveFinanceScope(user, body.storeId ?? null);
    if (!scope.storeId) throw new Error("A store is required for payment-method mapping");
    if (!Object.values(PaymentMethod).includes(body.paymentMethod)) throw new Error("Invalid payment method");
    return Response.json(await financeService.mapPaymentMethod(user.orgId, user.id, { storeId: scope.storeId, paymentMethod: body.paymentMethod, accountId: body.accountId }, user.storeId));
  } catch (error) {
    return financeError(error, "Unable to map payment method");
  }
}
