import { getCloudflareContext } from "@opennextjs/cloudflare";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

export type Database = PostgresJsDatabase<typeof schema>;

type HyperdriveBinding = { connectionString: string };

const globalForDb = globalThis as unknown as {
  __crmcDb?: Database;
  __crmcPg?: ReturnType<typeof postgres>;
};

function isCloudflareWorkersRuntime(): boolean {
  try {
    return globalThis.navigator?.userAgent === "Cloudflare-Workers";
  } catch {
    return false;
  }
}

function getWorkersEnv(): { HYPERDRIVE?: HyperdriveBinding } | null {
  if (!isCloudflareWorkersRuntime()) {
    // Node (`next dev`, scripts, next build) must not use Hyperdrive.
    return null;
  }

  try {
    return getCloudflareContext().env as { HYPERDRIVE?: HyperdriveBinding };
  } catch {
    return null;
  }
}

function createHyperdriveDb(connectionString: string): Database {
  // Hyperdrive pools upstream. Never reuse this client across requests —
  // Workers throw "Cannot perform I/O on behalf of a different request".
  const client = postgres(connectionString, {
    max: 1,
    fetch_types: false,
    prepare: false,
    connect_timeout: 30,
  });
  return drizzle(client, { schema });
}

/**
 * Lazy Drizzle client. Avoids crashing module evaluation during Next.js
 * builds that import route handlers without a live DATABASE_URL.
 *
 * On Cloudflare Workers, Hyperdrive is required (no shared/global Postgres client).
 * Locally, use DATABASE_URL with a shared process pool.
 */
export function getDb(): Database {
  const workersEnv = getWorkersEnv();

  if (workersEnv) {
    const connectionString = workersEnv.HYPERDRIVE?.connectionString;

    if (!connectionString) {
      throw new Error(
        "HYPERDRIVE binding is missing in the Workers runtime. Check wrangler.jsonc hyperdrive config and redeploy."
      );
    }

    // Fresh client per getDb() call — request-safe on Workers.
    return createHyperdriveDb(connectionString);
  }

  if (globalForDb.__crmcDb) {
    return globalForDb.__crmcDb;
  }

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Add it to your environment (.env / .env.local), or bind Hyperdrive on Cloudflare."
    );
  }

  /**
   * Shared process pool for Node (`next dev` / scripts) only.
   * Never used on Workers — a global pool causes cross-request I/O failures.
   */
  const client = postgres(connectionString, {
    max: process.env.NODE_ENV === "development" ? 20 : 25,
    idle_timeout: 30,
    connect_timeout: 30,
    max_lifetime: 60 * 30,
    prepare: false,
    ssl: "require",
    connection: {
      statement_timeout: 45000,
    },
  });
  const db = drizzle(client, { schema });

  globalForDb.__crmcPg = client;
  globalForDb.__crmcDb = db;

  return db;
}

/** Convenience re-export for modules that prefer a named `db` getter. */
export const db = {
  get client(): Database {
    return getDb();
  },
};

export { schema };
