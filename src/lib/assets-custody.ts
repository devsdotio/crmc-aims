/**
 * Custody display helpers for assets held by departments vs projects.
 */

export function departmentHolderLabel(code: string, name: string): string {
  return `Dept: ${code} (${name})`;
}

export function projectHolderLabel(
  projectCode: string,
  projectName: string
): string {
  return `Project: ${projectCode} (${projectName})`;
}

export function isProjectCustody(holder?: string | null): boolean {
  return Boolean(holder?.startsWith("Project:"));
}

export function isDepartmentCustody(holder?: string | null): boolean {
  return Boolean(holder?.startsWith("Dept:"));
}

/** Short badge: Available | Reserved | On project | Assigned | Borrowed */
export function custodyBadgeLabel(
  holder?: string | null,
  custodyKind?: "borrow" | "assignment" | "borrowable" | "assignable" | null,
  reserved?: boolean
): string {
  if (holder) {
    if (isProjectCustody(holder)) return "On project";
    if (custodyKind === "assignment" || custodyKind === "assignable") {
      return "Assigned";
    }
    return "Borrowed";
  }
  if (reserved) return "Reserved";
  return "Available";
}

/** Longer label for table/card footers. */
export function custodyDetailLabel(
  holder?: string | null,
  reserved?: boolean
): string {
  if (holder) {
    if (isProjectCustody(holder)) return `Project custody: ${holder}`;
    if (isDepartmentCustody(holder)) return `Department custody: ${holder}`;
    return `In custody: ${holder}`;
  }
  if (reserved) return "Reserved for an approved request";
  return "Available in stock";
}

/** True when the unit can be requested or walk-up issued. */
export function isAssetAvailableForRequest(asset: {
  status: string;
  currentHolder?: string | null;
}): boolean {
  return asset.status === "active" && !asset.currentHolder;
}
