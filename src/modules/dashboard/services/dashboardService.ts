// Keep the legacy import path as an alias of the canonical implementation.
// This prevents dashboard callers from drifting onto a second revenue formula.
export { dashboardServiceCompat as dashboardService } from "./dashboardServiceCompat";
