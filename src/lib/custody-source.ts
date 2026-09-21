/** Custody ledger source labels for UI (manual vs portal request vs project). */

export type CustodySource = "portal" | "admin_manual" | "project_legacy";

export function custodySourceLabel(source?: CustodySource | string | null): string {
  switch (source) {
    case "admin_manual":
      return "Manual Issue";
    case "project_legacy":
      return "Project Issue";
    case "portal":
      return "Portal Request";
    default:
      return "Custody Issue";
  }
}

export function custodyReturnSourceLabel(
  source?: CustodySource | string | null
): string {
  switch (source) {
    case "admin_manual":
      return "Manual Return";
    case "project_legacy":
      return "Project Return";
    case "portal":
      return "Request Return";
    default:
      return "Returned";
  }
}

export function isManualCustodySource(
  source?: CustodySource | string | null
): boolean {
  return source === "admin_manual";
}
