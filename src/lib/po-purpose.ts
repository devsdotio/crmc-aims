/**
 * PO purpose encoding: destination tags + free-text justification.
 * Format: `[Project: …] [Dept…] justification` or `[Dept…] justification`.
 *
 * Line-level purpose lives on each purchase lot's notes JSON.
 * Use `@/lib/request-purpose` for summarize / groupByPurpose / purposePreviewLabel.
 */

/** Build shared destination prefix (no trailing space). */
export function buildPoPurposePrefix(opts: {
  departmentLabel: string;
  projectLabel?: string | null;
}): string {
  const dept = opts.departmentLabel.trim();
  const project = (opts.projectLabel ?? "").trim();
  if (!dept) return "";
  if (project) return `[Project: ${project}] [${dept}]`;
  return `[${dept}]`;
}

/** Stamp prefix + justification into the stored purpose string. */
export function stampPoPurpose(
  prefix: string,
  justification: string
): string {
  const j = justification.trim();
  const p = prefix.trim();
  if (!p) return j;
  if (!j) return p;
  return `${p} ${j}`;
}

/**
 * Strip leading `[…]` tags (Project and/or Dept) to leave the justification.
 * Handles both `[Project:…] [Dept…] text` and `[Dept…] text`.
 */
export function stripPoPurposePrefix(
  purpose: string | null | undefined
): string {
  let rest = (purpose ?? "").trim();
  if (!rest) return "";
  // Strip successive leading bracket tags
  while (true) {
    const match = rest.match(/^\[([^\]]*)\]\s*/);
    if (!match) break;
    rest = rest.slice(match[0].length).trim();
  }
  return rest;
}

/**
 * Justifications only (prefix stripped) for chips / summarize uniqueness.
 * Pass these into `purposePreviewLabel` / `summarizePurposes`.
 */
export function poJustificationPurposes(
  purposes: Array<string | null | undefined>
): string[] {
  return purposes.map((p) => stripPoPurposePrefix(p)).filter(Boolean);
}

/** True when the string already starts with a destination tag. */
export function hasPoPurposePrefix(
  purpose: string | null | undefined
): boolean {
  return /^\[[^\]]*\]/.test((purpose ?? "").trim());
}
