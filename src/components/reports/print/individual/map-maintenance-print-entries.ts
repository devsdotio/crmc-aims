import type { AssetDrilldownReport } from "@/types/reports";
import type { IndividualAssetMaintenanceEntry } from "./IndividualAssetPrintableReport";

type DrilldownMaintenance = AssetDrilldownReport["maintenanceHistory"][number];

/** Map asset drill-down maintenance rows into the individual dossier print shape. */
export function mapMaintenanceHistoryToPrintEntries(
  history: DrilldownMaintenance[]
): IndividualAssetMaintenanceEntry[] {
  return history.map((m) => ({
    id: m.id,
    logCode: m.logCode,
    status: m.isResolved ? "resolved" : "open",
    date: m.dateLogged,
    resolutionDate: m.resolutionDate,
    type: m.condition,
    issue: m.notes || null,
    workNotes: m.workNotes ?? null,
    resolutionNotes: m.resolutionNotes ?? null,
    parts: (m.repairParts ?? []).map((p) => ({
      name: p.name,
      cost: p.cost,
    })),
    cost: m.totalCost ?? m.repairCost ?? null,
    description: m.notes || `Work Order ${m.logCode}`,
    technician:
      m.resolvedByName ||
      (m.serviceProvider && m.serviceProvider !== "—"
        ? m.serviceProvider
        : null) ||
      m.loggedByName ||
      "Internal Maintenance",
  }));
}
