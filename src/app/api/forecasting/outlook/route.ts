import {
  forecastError,
  forecastUser,
  ForecastRouteError,
} from "@/modules/forecasting/forecastRoute";
import { predictiveService } from "@/modules/forecasting/predictiveService";

export async function GET() {
  try {
    const user = await forecastUser();
    if (user.storeId)
      throw new ForecastRouteError("Forward outlook requires organization-wide access", 403);
    return Response.json(await predictiveService.organizationOutlook(user.orgId));
  } catch (error) {
    return forecastError(error, "Unable to load forward outlook");
  }
}
