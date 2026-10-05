export type IntegritySeverity = "warning" | "error";

export function summarizeIntegrity(
  issues: Array<{ severity: IntegritySeverity; count: number }>,
  complete: number,
  total: number,
) {
  return {
    status: issues.some((issue) => issue.severity === "error" && issue.count > 0)
      ? "ACTION_REQUIRED" as const
      : issues.some((issue) => issue.count > 0)
        ? "REVIEW" as const
        : "HEALTHY" as const,
    completenessPercentage: total === 0 ? 100 : Number(((complete / total) * 100).toFixed(1)),
  };
}
