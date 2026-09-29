/**
 * Snapshot who held an asset when a maintenance flag was opened.
 * Prefer the person on the open borrow/assignment log; fall back to the
 * asset custody label (Dept:/Project:). Combines both when they differ.
 */
export function maintenanceAssigneeSnapshot(opts: {
  borrowerName?: string | null;
  currentHolder?: string | null;
}): string | null {
  const person = opts.borrowerName?.trim() || null;
  const holder = opts.currentHolder?.trim() || null;
  if (person && holder && person !== holder) {
    return `${person} · ${holder}`;
  }
  return person || holder || null;
}
