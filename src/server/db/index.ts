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

/** Per-request only — keyed by Workers ExecutionContext (not shared across invocations). */
const hyperdriveDbByCtx = new WeakMap<object, Database>();

function getHyperdriveConnectionString(): string | undefined {
  try {
    const { env } = getCloudflareContext();
    const hyperdrive = (env as { HYPERDRIVE?: HyperdriveBinding }).HYPERDRIVE;
    return hyperdrive?.connectionString;
  } catch {
    // Outside the Workers runtime (local `next dev`, scripts, build).
    return undefined;
  }
}

function createHyperdriveDb(connectionString: string): Database {
  // Hyperdrive pools upstream. Do not reuse this client across requests —
  // Workers throw "Cannot perform I/O on behalf of a different request".
  // Do not use React.cache() — Workers lack asyncLocalStorage.enterWith().
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
 * On Cloudflare Workers, prefer Hyperdrive (required for reliable Postgres TCP).
 * Locally, use DATABASE_URL with a shared process pool.
 */
export function getDb(): Database {
  const hyperdriveUrl = getHyperdriveConnectionString();

  if (hyperdriveUrl) {
    try {
      const { ctx } = getCloudflareContext();
      if (ctx) {
        const existing = hyperdriveDbByCtx.get(ctx);
        if (existing) return existing;
        const db = createHyperdriveDb(hyperdriveUrl);
        hyperdriveDbByCtx.set(ctx, db);
        return db;
      }
    } catch {
      // Fall through to one-off client.
    }
    return createHyperdriveDb(hyperdriveUrl);
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
   * Shared process pool. Slow remote DB + many parallel APIs exhaust small pools
   * and leave list pages spinning on skeletons.
   *
   * `options` sets Postgres GUCs for every session (statement_timeout aborts
   * hung statements so pool slots free up).
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
