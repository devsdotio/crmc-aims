import type { MaintenanceLogRow, MaintenanceRepairPart } from "@/server/db/schema";

export type MaintenanceLogDTO = {
  id: string;
  logCode: string;
  assetCode: string;
  assetName: string;
  category: string;
  condition: "good" | "needs_maintenance" | "damaged" | "resolved";
  source: "return_checkout" | "manual_flag" | "project_assignment";
  dateLogged: string;
  loggedBy: string;
  notes: string;
  isResolved: boolean;
  resolutionDate?: string;
  resolutionNotes?: string;
  resolvedBy?: string;
  /** Optional PHP amount recorded at resolve time (null/omit = not recorded). */
  repairCost?: string | null;
  /** Itemized parts recorded at resolve time. */
  repairParts?: MaintenanceRepairPart[];
  relatedBorrowLogCode?: string;
  scheduledDate?: string;
};

export type ListMaintenanceFilters = {
  openOnly?: boolean;
  search?: string;
  condition?: MaintenanceLogDTO["condition"];
  includeSandbox?: boolean;
};

export interface IMaintenanceRepository {
  findById(
    id: string,
    session?: import("@/server/db/transaction").DbSession,
    tenantId?: string
  ): Promise<MaintenanceLogRow | null>;
  list(
    filters?: ListMaintenanceFilters,
    session?: import("@/server/db/transaction").DbSession,
    tenantId?: string
  ): Promise<MaintenanceLogRow[]>;
  countOpen(
    session?: import("@/server/db/transaction").DbSession,
    tenantId?: string
  ): Promise<number>;
  countOpenByAssetId(
    assetId: string,
    session?: import("@/server/db/transaction").DbSession,
    tenantId?: string
  ): Promise<number>;
  listByAssetId(
    assetId: string,
    session?: import("@/server/db/transaction").DbSession,
    tenantId?: string
  ): Promise<MaintenanceLogRow[]>;
  countYear(
    session?: import("@/server/db/transaction").DbSession,
    tenantId?: string
  ): Promise<number>;
  create(
    data: Omit<
      import("@/server/db/schema").NewMaintenanceLogRow,
      "id" | "createdAt" | "updatedAt"
    >,
    session?: import("@/server/db/transaction").DbSession
  ): Promise<MaintenanceLogRow>;
  update(
    id: string,
    data: Partial<Omit<MaintenanceLogRow, "id" | "createdAt" | "logCode">>,
    session?: import("@/server/db/transaction").DbSession,
    tenantId?: string
  ): Promise<MaintenanceLogRow | null>;
}
