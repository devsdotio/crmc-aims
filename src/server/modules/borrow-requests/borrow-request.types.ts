import type {
  BorrowRequestRow,
  BorrowRequestHistoryEntry,
} from "@/server/db/schema";
import type { LinkedRequestSummary } from "@/server/shared/linked-requests";

export type BorrowRequestDTO = {
  id: string;
  requestCode: string;
  requesterName: string;
  requesterEmail: string;
  requesterPhone: string;
  department: string;
  departmentId?: string | null;
  requestType?: "borrowable" | "assignable" | null;
  requestedByName?: string;
  /** Present when this row was submitted with other request types. */
  submissionGroupId?: string | null;
  relatedRequests?: LinkedRequestSummary[];
  items: {
    itemDescription: string;
    assetId?: string;
    assetCode?: string;
    consumableId?: string;
    category: string;
    quantity: number;
    itemType: "asset" | "consumable";
    /** Per-line purpose; falls back to header purpose for legacy rows. */
    purpose?: string;
  }[];
  purpose: string;
  requestedAt: string;
  relativeTime: string;
  expectedReturnDate?: string | null;
  status: "pending" | "approved" | "rejected" | "released" | "unreleased" | "returned" | "cancelled";
  notes?: string;
  rejectionReason?: string;
  cancellationReason?: string;
  pickedUpBy?: string;
  history: BorrowRequestHistoryEntry[];
};

export type ListBorrowRequestFilters = {
  status?: BorrowRequestDTO["status"];
  department?: string;
  search?: string;
  requesterUserId?: string;
  requestType?: "borrowable" | "assignable";
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  assetId?: string;
  includeSandbox?: boolean;
};

export interface IBorrowRequestRepository {
  findById(
    id: string,
    session?: import("@/server/db/transaction").DbSession,
    tenantId?: string
  ): Promise<BorrowRequestRow | null>;
  list(
    filters?: ListBorrowRequestFilters,
    session?: import("@/server/db/transaction").DbSession,
    tenantId?: string
  ): Promise<BorrowRequestRow[]>;
  count(
    filters?: Omit<ListBorrowRequestFilters, "page" | "limit">,
    session?: import("@/server/db/transaction").DbSession,
    tenantId?: string
  ): Promise<number>;
  countByStatus(
    filters?: Omit<ListBorrowRequestFilters, "status" | "page" | "limit">,
    session?: import("@/server/db/transaction").DbSession,
    tenantId?: string
  ): Promise<Record<string, number>>;
  countAll(
    session?: import("@/server/db/transaction").DbSession,
    tenantId?: string
  ): Promise<number>;
  create(
    data: Omit<
      import("@/server/db/schema").NewBorrowRequestRow,
      "id" | "createdAt" | "updatedAt"
    >,
    session?: import("@/server/db/transaction").DbSession
  ): Promise<BorrowRequestRow>;
  update(
    id: string,
    data: Partial<
      Omit<BorrowRequestRow, "id" | "createdAt" | "requestCode">
    >,
    session?: import("@/server/db/transaction").DbSession,
    tenantId?: string
  ): Promise<BorrowRequestRow | null>;
  countPending(
    session?: import("@/server/db/transaction").DbSession,
    userId?: string,
    tenantId?: string
  ): Promise<number>;
}
