// Reads KEY=value lines from .env.local, so scripts see the same keys as
// Next.js without needing a dotenv package or a newer Node flag. Values
// already set in the real environment win.
import { readFileSync, existsSync } from "node:fs";

export function loadEnvLocal(file) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m || process.env[m[1]] !== undefined) continue;
    process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, "$2");
  }
}
