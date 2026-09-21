import type { AssetCategory } from './shared';
import type { AuditLogRow } from "@/server/db/schema/audit-logs";


export type { AssetCategory };
import type { BaseFilterState, DateRangeFilter } from "./filters";

export type LogStatus = "active" | "overdue" | "returned";

export type ReturnCondition = "good" | "damaged" | "needs_repair";

export type LogTabFilter = "active" | "overdue" | "returned" | "all";

export interface BorrowLogRecord {
  id: string;
  logCode: string;
  requestCode: string;
  borrowerName: string;
  borrowerEmail: string;
  borrowerPhone: string;
  department: string;
  assetCode: string;
  assetName: string;
  category: AssetCategory;
  releasedAt: string;
  dueDate?: string | null;
  returnedAt?: string;
  daysOverdue?: number;
  status: LogStatus;
  conditionOnReturn?: ReturnCondition;
  conditionNotes?: string;
  releasedBy: string;
  receivedBy?: string;
  history: AuditLogRow[];
}

export interface BorrowLogFilterState extends BaseFilterState, DateRangeFilter {
  department: string;
}
