import type { AssetCategory } from './shared';


export type { AssetCategory };
import type { BaseFilterState, DateRangeFilter } from "./filters";

export type ConditionState = "good" | "needs_maintenance" | "damaged" | "resolved";

export type LogSource =
  | "return_checkout"
  | "manual_flag"
  | "project_assignment";

export type MaintenanceRepairPart = {
  name: string;
  cost: string | null;
};

export interface MaintenanceLogRecord {
  id: string;
  logCode: string;
  assetId?: string | null;
  assetCode: string;
  assetName: string;
  category: AssetCategory;
  condition: ConditionState;
  source: LogSource;
  dateLogged: string;
  loggedBy: string;
  notes: string;
  /** Progressive work-performed notes while the log is open. */
  workNotes?: string | null;
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
}

export interface MaintenanceLogFilterState extends BaseFilterState, DateRangeFilter {
  categories: AssetCategory[];
  conditions: ConditionState[];
  openItemsOnly: boolean;
  sortBy: "date_desc" | "date_asc" | "open_first";
}
