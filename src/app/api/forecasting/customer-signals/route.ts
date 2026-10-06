import { forecastError, forecastStore, forecastUser } from "@/modules/forecasting/forecastRoute";
import { predictiveService } from "@/modules/forecasting/predictiveService";

export async function GET(request: Request) {
  try {
    const user = await forecastUser();
    const store = await forecastStore(user, new URL(request.url).searchParams.get("storeId"));
    return Response.json(await predictiveService.customerSignals(user.orgId, store.id));
  } catch (error) {
    return forecastError(error, "Unable to load customer signals");
  }
}
