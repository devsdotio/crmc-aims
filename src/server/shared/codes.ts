/**
 * Shared code generators and calendar helpers for operational modules.
 */

export function yearPrefix(prefix: string, now = new Date()): string {
  return `${prefix}-${now.getUTCFullYear()}-`;
}

/** Prefer `generateOperationalCode` under concurrency. */
export function formatSequentialCode(
  prefix: string,
  sequential: number,
  now = new Date()
): string {
  const n = String(Math.max(1, sequential)).padStart(4, "0");
  return `${prefix}-${now.getUTCFullYear()}-${n}`;
}

/**
 * Collision-resistant codes: PREFIX-YYYY-XXXXXXXX
 * DB unique constraints remain the final authority.
 */
export function generateOperationalCode(prefix: string, now = new Date()): string {
  const year = now.getUTCFullYear();
  const token = crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
  return `${prefix}-${year}-${token}`;
}

export function isoNow(): string {
  return new Date().toISOString();
}

export function todayDateString(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function dueDatePlusDays(days: number, now = new Date()): string {
  const d = new Date(now);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
