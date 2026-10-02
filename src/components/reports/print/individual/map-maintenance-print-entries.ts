import type { AssetDrilldownReport } from "@/types/reports";
import { effectiveRepairAmount } from "@/lib/repair-cost";
import type { IndividualAssetMaintenanceEntry } from "./IndividualAssetPrintableReport";

type DrilldownMaintenance = AssetDrilldownReport["maintenanceHistory"][number];

/** Coerce money from numeric columns, which may arrive as numbers or numeric strings. */
export function printMoney(value: unknown): number | null {
  if (value == null || value === "") return null;
  const amount = typeof value === "number" ? value : Number(value);
  return Number.isFinite(amount) ? amount : null;
}

/** Map asset drill-down maintenance rows into the individual dossier print shape. */
export function mapMaintenanceHistoryToPrintEntries(
  history: DrilldownMaintenance[]
): IndividualAssetMaintenanceEntry[] {
  return history.map((m) => {
    const parts = (m.repairParts ?? []).map((p) => ({
      name: p.name,
      cost: p.cost,
    }));
    return {
      id: m.id,
      logCode: m.logCode,
      status: m.isResolved ? "resolved" : "open",
      date: m.dateLogged,
      resolutionDate: m.resolutionDate,
      type: m.condition,
      issue: m.notes || null,
      workNotes: m.workNotes ?? null,
      resolutionNotes: m.resolutionNotes ?? null,
      parts,
      cost: effectiveRepairAmount(m.repairCost ?? m.totalCost, parts),
      description: m.notes || `Work Order ${m.logCode}`,
      technician:
        m.resolvedByName ||
        (m.serviceProvider && m.serviceProvider !== "—"
          ? m.serviceProvider
          : null) ||
        m.loggedByName ||
        "Internal Maintenance",
    };
  });
}
