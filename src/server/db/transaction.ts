import type { ExtractTablesWithRelations } from "drizzle-orm";
import type { PgTransaction } from "drizzle-orm/pg-core";
import type { PostgresJsQueryResultHKT } from "drizzle-orm/postgres-js";

import { getDb, type Database, schema } from "@/server/db";

/**
 * Transaction client (same query surface as Database for our insert/update/select usage).
 */
export type DbSession =
  | Database
  | PgTransaction<
      PostgresJsQueryResultHKT,
      typeof schema,
      ExtractTablesWithRelations<typeof schema>
    >;

/**
 * Runs work in a single Postgres transaction.
 * On throw: full rollback — critical for custody + ledger integrity.
 */
export async function withTransaction<T>(
  work: (tx: DbSession) => Promise<T>
): Promise<T> {
  return getDb().transaction(async (tx) => work(tx));
}

export function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    String((error as { code: unknown }).code) === "23505"
  );
}
