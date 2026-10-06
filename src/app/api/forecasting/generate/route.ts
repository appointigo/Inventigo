import { forecastError, forecastStore, forecastUser } from "@/modules/forecasting/forecastRoute";
import { forecastService } from "@/modules/forecasting/forecastService";

export async function POST(request: Request) {
  try {
    const user = await forecastUser();
    const body = await request.json().catch(() => ({}));
    const store = await forecastStore(user, typeof body.storeId === "string" ? body.storeId : null);
    return Response.json(await forecastService.generate(user.orgId, store.id), { status: 201 });
  } catch (error) {
    return forecastError(error, "Unable to generate forecasts");
  }
}
