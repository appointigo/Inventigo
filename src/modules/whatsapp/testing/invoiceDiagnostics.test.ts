import assert from "node:assert/strict";
import test from "node:test";
import { getDeploymentEnvironmentLabel } from "../invoiceDiagnostics.ts";

test("labels Railway without recording deployment identifiers", () => {
  assert.equal(
    getDeploymentEnvironmentLabel({
      NODE_ENV: "production",
      RAILWAY_PROJECT_ID: "sensitive-project-id",
      RAILWAY_ENVIRONMENT_ID: "sensitive-environment-id",
    }),
    "railway"
  );
});

test("labels local, Vercel, production, test, and unknown runtimes", () => {
  assert.equal(getDeploymentEnvironmentLabel({ NODE_ENV: "development" }), "local");
  assert.equal(getDeploymentEnvironmentLabel({ NODE_ENV: "production", VERCEL: "1" }), "vercel");
  assert.equal(getDeploymentEnvironmentLabel({ NODE_ENV: "production" }), "production");
  assert.equal(getDeploymentEnvironmentLabel({ NODE_ENV: "test" }), "test");
  assert.equal(getDeploymentEnvironmentLabel({}), "unknown");
});
