/** Display labels for unified asset custody (department or project holders). */

export function departmentHolderLabel(
  code: string,
  name: string
): string {
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

/** Short badge: Available | On project | Assigned | Borrowed */
export function custodyBadgeLabel(
  holder?: string | null,
  custodyKind?: "borrow" | "assignment" | "borrowable" | "assignable" | null
): string {
  if (!holder) return "Available";
  if (isProjectCustody(holder)) {
    return "On project";
  }
  if (custodyKind === "assignment" || custodyKind === "assignable") {
    return "Assigned";
  }
  return "Borrowed";
}

/** Longer label for table/card footers. */
export function custodyDetailLabel(holder?: string | null): string {
  if (!holder) return "Available in stock";
  if (isProjectCustody(holder)) return `Project custody: ${holder}`;
  if (isDepartmentCustody(holder)) return `Department custody: ${holder}`;
  return `In custody: ${holder}`;
}
