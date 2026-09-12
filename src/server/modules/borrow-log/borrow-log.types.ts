import type {
  BorrowTransactionRow,
} from "@/server/db/schema";
import type { AuditLogRow } from "@/server/db/schema/audit-logs";

export type BorrowLogDTO = {
  id: string;
  logCode: string;
  requestCode: string;
  custodyKind: "borrow" | "assignment";
  departmentId?: string | null;
  projectId?: string | null;
  source: "portal" | "admin_manual" | "project_legacy";
  requestedByName?: string;
  borrowerName: string;
  borrowerEmail: string;
  borrowerPhone: string;
  department: string;
  assetCode: string;
  assetName: string;
  category: string;
  releasedAt: string;
  dueDate?: string | null;
  returnedAt?: string;
  daysOverdue?: number;
  status: "active" | "overdue" | "returned" | "voided";
  conditionOnReturn?: "good" | "damaged" | "needs_repair" | "lost" | "stolen";
  conditionNotes?: string;
  releasedBy: string;
  receivedBy?: string;
  history: AuditLogRow[];
};

export type ListBorrowLogFilters = {
  status?: "active" | "overdue" | "returned" | "voided";
  department?: string;
  /** UUID — preferred over free-text department label. */
  departmentId?: string;
  search?: string;
  borrowerUserId?: string;
  borrowerEmail?: string;
  custodyKind?: "borrow" | "assignment" | "all";
  /** Currently held rows (DB status=active), including overdue. */
  heldOnly?: boolean;
  /** Exclude project-destination rows. */
  excludeProjects?: boolean;
  includeSandbox?: boolean;
};

export interface IBorrowLogRepository {
  findById(id: string): Promise<BorrowTransactionRow | null>;
  findActiveByAssetId(assetId: string): Promise<BorrowTransactionRow | null>;
  list(filters?: ListBorrowLogFilters): Promise<BorrowTransactionRow[]>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  countActive(session?: any, userId?: string): Promise<number>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  countOverdue(session?: any, userId?: string): Promise<number>;
  countYear(): Promise<number>;
  create(
    data: Omit<
      import("@/server/db/schema").NewBorrowTransactionRow,
      "id" | "createdAt" | "updatedAt"
    >
  ): Promise<BorrowTransactionRow>;
  update(
    id: string,
    data: Partial<Omit<BorrowTransactionRow, "id" | "createdAt" | "logCode">>
  ): Promise<BorrowTransactionRow | null>;
};
