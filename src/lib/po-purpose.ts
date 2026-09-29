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
  // Justification is required — never persist destination tags alone.
  if (!j) return "";
  const p = prefix.trim();
  if (!p) return j;
  return `${p} ${j}`;
}

/** True when purpose has a non-empty justification (destination tags alone do not count). */
export function hasPoJustification(
  purpose: string | null | undefined
): boolean {
  const raw = (purpose ?? "").trim();
  if (!raw) return false;
  let rest = raw;
  const projectMatch = rest.match(/^\[Project:\s*[^\]]*\]\s*/i);
  if (projectMatch) {
    rest = rest.slice(projectMatch[0].length).trim();
  }
  const tagMatch = rest.match(/^\[[^\]]*\]\s*/);
  if (tagMatch) {
    const after = rest.slice(tagMatch[0].length).trim();
    // Destination tag(s) peeled — only the trailing free text counts.
    return after.length > 0;
  }
  return rest.length > 0;
}

/**
 * Strip destination tags only — leave the justification intact.
 *
 * Destination forms: `[Project: …] [Dept…] justification` or `[Dept…] justification`.
 * Only removes an optional `[Project:…]` plus at most one following `[…]` dept tag.
 * Does **not** strip further bracket groups (e.g. `[Urgent] restock`) so those
 * justifications are not emptied into the "General" slip fallback.
 */
export function stripPoPurposePrefix(
  purpose: string | null | undefined
): string {
  let rest = (purpose ?? "").trim();
  if (!rest) return "";

  const projectMatch = rest.match(/^\[Project:\s*[^\]]*\]\s*/i);
  if (projectMatch) {
    rest = rest.slice(projectMatch[0].length).trim();
  }

  const deptMatch = rest.match(/^\[([^\]]*)\]\s*/);
  if (deptMatch) {
    const after = rest.slice(deptMatch[0].length).trim();
    // Consume as destination when justification remains, or when paired with Project.
    // Sole `[bracketed text]` with no Project tag is treated as the purpose itself.
    if (after || projectMatch) {
      rest = after;
    }
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
