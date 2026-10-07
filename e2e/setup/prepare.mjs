import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { loadE2EEnvironment, assertSafeE2EEnvironment } from "./environment.mjs";
import { prepareGreenfieldDatabase } from "./greenfield.mjs";
import { verifyGreenfieldDatabase } from "./verify-greenfield.mjs";

const root = fileURLToPath(new URL("../..", import.meta.url));

export async function prepareE2E() {
  loadE2EEnvironment(root);
  assertSafeE2EEnvironment();
  await prepareGreenfieldDatabase();
  await verifyGreenfieldDatabase();
  const executable = process.platform === "win32" ? "npx.cmd" : "npx";
  for (const args of [["node", "e2e/setup/seed.mjs"]]) {
    const command = args[0] === "node" ? process.execPath : executable;
    const commandArgs = args[0] === "node" ? args.slice(1) : args;
    const result = spawnSync(command, commandArgs, {
      cwd: root,
      env: process.env,
      stdio: "inherit",
      shell: false,
    });
    if (result.status !== 0) process.exit(result.status ?? 1);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await prepareE2E();
