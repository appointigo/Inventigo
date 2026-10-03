export type DeploymentEnvironmentLabel = "local" | "railway" | "vercel" | "production" | "test" | "unknown";

export function getDeploymentEnvironmentLabel(
  env: NodeJS.ProcessEnv = process.env
): DeploymentEnvironmentLabel {
  if (env.RAILWAY_ENVIRONMENT_ID || env.RAILWAY_PROJECT_ID || env.RAILWAY_SERVICE_ID)
    return "railway";
  if (env.VERCEL || env.VERCEL_ENV) return "vercel";
  if (env.NODE_ENV === "development") return "local";
  if (env.NODE_ENV === "production") return "production";
  if (env.NODE_ENV === "test") return "test";
  return "unknown";
}
