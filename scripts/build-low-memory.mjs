import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const vite = fileURLToPath(new URL("../node_modules/vite/bin/vite.js", import.meta.url));
const result = spawnSync(
  process.execPath,
  ["--max-old-space-size=512", "--liftoff-only", "--no-wasm-tier-up", vite, "build"],
  {
    stdio: "inherit",
    env: { ...process.env, GOMAXPROCS: "1", GOGC: "30", RAYON_NUM_THREADS: "1" },
  },
);
if (result.error) throw result.error;
if (result.signal) throw new Error(`Build terminated by signal ${result.signal}.`);
process.exitCode = result.status ?? 1;
