import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { prepareE2E } from "./prepare.mjs";

const root = fileURLToPath(new URL("../..", import.meta.url));
await prepareE2E();

const executable = process.platform === "win32" ? "npx.cmd" : "npx";
const result = spawnSync(executable, ["playwright", "test", ...process.argv.slice(2)], {
  cwd: root,
  env: process.env,
  stdio: "inherit",
  shell: false,
});
process.exit(result.status ?? 1);
