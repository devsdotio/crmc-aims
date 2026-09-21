import type { Column, SQL } from "drizzle-orm";
import { z } from "zod";

import type { AppRole } from "@/server/shared/roles";

/** Query/body flag — kept for callers; sandbox filtering is disabled. */
export const includeSandboxQuerySchema = z
  .union([z.literal("true"), z.literal("false"), z.boolean()])
  .optional()
  .transform((v) => v === true || v === "true");

/**
 * Always returns true so list queries no longer hide sandbox rows.
 * Signature kept for existing controllers.
 */
export function parseIncludeSandbox(
  _raw: unknown,
  _actorRole?: AppRole | string | undefined | null
): boolean {
  return true;
}

/** No-op: sandbox rows are never excluded by list filters. */
export function sandboxExcluded(
  _column: Column,
  _includeSandbox: boolean
): SQL | undefined {
  return undefined;
}
