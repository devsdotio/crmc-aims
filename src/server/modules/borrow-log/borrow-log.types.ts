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
  findById(
    id: string,
    session?: import("@/server/db/transaction").DbSession,
    tenantId?: string
  ): Promise<BorrowTransactionRow | null>;
  findActiveByAssetId(
    assetId: string,
    session?: import("@/server/db/transaction").DbSession,
    tenantId?: string
  ): Promise<BorrowTransactionRow | null>;
  list(
    filters?: ListBorrowLogFilters,
    session?: import("@/server/db/transaction").DbSession,
    tenantId?: string
  ): Promise<BorrowTransactionRow[]>;
  countActive(
    session?: import("@/server/db/transaction").DbSession,
    userId?: string,
    custodyKind?: "borrow" | "assignment",
    tenantId?: string
  ): Promise<number>;
  countOverdue(
    session?: import("@/server/db/transaction").DbSession,
    userId?: string,
    tenantId?: string
  ): Promise<number>;
  countYear(
    session?: import("@/server/db/transaction").DbSession,
    tenantId?: string
  ): Promise<number>;
  create(
    data: Omit<
      import("@/server/db/schema").NewBorrowTransactionRow,
      "id" | "createdAt" | "updatedAt"
    >,
    session?: import("@/server/db/transaction").DbSession
  ): Promise<BorrowTransactionRow>;
  update(
    id: string,
    data: Partial<Omit<BorrowTransactionRow, "id" | "createdAt" | "logCode">>,
    session?: import("@/server/db/transaction").DbSession,
    tenantId?: string
  ): Promise<BorrowTransactionRow | null>;
}
