import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { lookup } from "node:dns/promises";
import { loadEnvConfig } from "@next/env";

/**
 * Must run before any `getDb()` import.
 * Integration suites use DATABASE_URL_TEST exclusively.
 *
 * Next.js skips `.env.local` when NODE_ENV=test — Vitest sets that — so we also
 * parse `.env.local` ourselves for DATABASE_URL_TEST (and only that key if unset).
 */
loadEnvConfig(process.cwd());

function loadDatabaseUrlTestFromDotEnvLocal(): void {
  if (process.env.DATABASE_URL_TEST?.trim()) return;

  const envPath = path.join(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;

  const text = readFileSync(envPath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    if (key !== "DATABASE_URL_TEST") continue;
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (value) process.env.DATABASE_URL_TEST = value;
    break;
  }
}

loadDatabaseUrlTestFromDotEnvLocal();

const testUrl = process.env.DATABASE_URL_TEST?.trim() || "";

if (testUrl) {
  process.env.DATABASE_URL = testUrl;
}

/**
 * True when a dedicated wipeable test database is configured **and** its host
 * resolves from this machine. Mutated by `probeTestDatabaseReachability()`.
 */
export let hasTestDatabase = Boolean(testUrl);

if (process.env.CI === "true" && !testUrl) {
  console.warn(
    "[tests] CI=true but DATABASE_URL_TEST is unset — integration suites will skip."
  );
}

if (
  process.env.CI === "true" &&
  testUrl &&
  /prod|production/i.test(testUrl)
) {
  throw new Error(
    "Refusing to run tests: DATABASE_URL_TEST looks like a production URL."
  );
}

function hostnameFromDatabaseUrl(url: string): string | null {
  try {
    return new URL(url).hostname || null;
  } catch {
    return null;
  }
}

/**
 * Vitest awaits async setupFiles. Direct `db.*.supabase.co` hosts are often
 * AAAA-only; Node on Windows then returns ENOTFOUND. Prefer the Supabase
 * pooler URL (IPv4) — see tests/README.md.
 */
export async function probeTestDatabaseReachability(): Promise<void> {
  if (!testUrl) return;

  const host = hostnameFromDatabaseUrl(testUrl);
  if (!host) {
    console.error(
      "[tests] DATABASE_URL_TEST is set but could not parse a hostname. Integration suites will skip."
    );
    hasTestDatabase = false;
    return;
  }

  try {
    await lookup(host);
  } catch (err) {
    const code =
      err && typeof err === "object" && "code" in err
        ? String((err as { code?: string }).code)
        : "unknown";
    const g = globalThis as unknown as { __crmcTestDbUnreachableLogged?: boolean };
    if (!g.__crmcTestDbUnreachableLogged) {
      g.__crmcTestDbUnreachableLogged = true;
      console.error(
        [
          `[tests] DATABASE_URL_TEST host “${host}” is unreachable (${code}).`,
          "Integration suites will skip so lint/typecheck/unit can still pass.",
          "Fix: in Supabase → Project Settings → Database, copy the **Session pooler**",
          "URI (host like *.pooler.supabase.com) into DATABASE_URL_TEST — direct",
          "db.*.supabase.co is often IPv6-only and fails on Windows Node.",
          "Then: npm run db:migrate:test && npm run test:integration",
        ].join("\n")
      );
    }
    hasTestDatabase = false;
    // Prevent getDb() from hammering a dead host if something imports it anyway.
    process.env.DATABASE_URL_TEST = "";
    if (process.env.DATABASE_URL === testUrl) {
      delete process.env.DATABASE_URL;
    }
  }
}

// Drop any cached Drizzle client so it reconnects with the test URL.
const g = globalThis as unknown as {
  __crmcDb?: unknown;
  __crmcPg?: { end?: (opts?: { timeout?: number }) => Promise<void> };
};
g.__crmcDb = undefined;
g.__crmcPg = undefined;

await probeTestDatabaseReachability();
