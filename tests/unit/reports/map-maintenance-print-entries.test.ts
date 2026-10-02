import { describe, expect, it } from "vitest";
import {
  mapMaintenanceHistoryToPrintEntries,
  printMoney,
} from "@/components/reports/print/individual/map-maintenance-print-entries";
import type { AssetDrilldownReport } from "@/types/reports";

type Row = AssetDrilldownReport["maintenanceHistory"][number];

function row(overrides: Partial<Row> = {}): Row {
  return {
    id: "log-1",
    logCode: "MNT-001",
    condition: "resolved",
    source: "manual_flag",
    dateLogged: "2026-09-01",
    isResolved: true,
    resolutionDate: "2026-09-02",
    repairCost: null,
    totalCost: null,
    serviceProvider: "—",
    loggedByName: "Clerk",
    resolvedByName: "Tech",
    notes: "Fan failed",
    workNotes: null,
    resolutionNotes: null,
    repairParts: [],
    ...overrides,
  };
}

describe("mapMaintenanceHistoryToPrintEntries", () => {
  it("keeps a numeric repair cost", () => {
    const [entry] = mapMaintenanceHistoryToPrintEntries([
      row({ repairCost: 1500, totalCost: 1500 }),
    ]);
    expect(entry?.cost).toBe(1500);
  });

  it("reads a numeric string cost from the database", () => {
    const [entry] = mapMaintenanceHistoryToPrintEntries([
      row({ repairCost: "2400.50" as unknown as number, totalCost: null }),
    ]);
    expect(entry?.cost).toBe(2400.5);
    expect(printMoney("2400.50")).toBe(2400.5);
  });

  it("sums part costs when the header cost is blank", () => {
    const [entry] = mapMaintenanceHistoryToPrintEntries([
      row({
        repairParts: [
          { name: "Belt", cost: "350.00" },
          { name: "Filter", cost: "150" },
        ],
      }),
    ]);
    expect(entry?.cost).toBe(500);
  });

  it("uses the part-line sum when a stored overall cost disagrees", () => {
    const [entry] = mapMaintenanceHistoryToPrintEntries([
      row({
        repairCost: 12334,
        totalCost: 12334,
        repairParts: [
          { name: "asasas", cost: "4542300.00" },
          { name: "axx", cost: "112336.00" },
        ],
      }),
    ]);
    expect(entry?.cost).toBe(4654636);
  });

  it("keeps a zero cost instead of treating it as missing", () => {
    const [entry] = mapMaintenanceHistoryToPrintEntries([
      row({ repairCost: 0, totalCost: 0 }),
    ]);
    expect(entry?.cost).toBe(0);
  });
});
