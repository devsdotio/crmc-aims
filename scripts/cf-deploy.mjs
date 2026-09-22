/**
 * Cloudflare Builds: opennextjs-cloudflare deploy calls getPlatformProxy(),
 * which requires a Hyperdrive local connection string even though production
 * uses the real Hyperdrive binding. Reuse DATABASE_URL from build secrets.
 */
import { spawnSync } from "node:child_process";

function stripWrappingQuotes(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

if (!process.env.CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE) {
  if (!process.env.DATABASE_URL) {
    console.error(
      "Missing DATABASE_URL (or CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE) for deploy."
    );
    process.exit(1);
  }
  process.env.CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE =
    stripWrappingQuotes(process.env.DATABASE_URL);
}

const result = spawnSync(
  "npx",
  ["opennextjs-cloudflare", "deploy", ...process.argv.slice(2)],
  {
    stdio: "inherit",
    env: process.env,
    shell: true,
  }
);

process.exit(result.status ?? 1);
