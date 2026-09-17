import type {
  ConsumableRequestHistoryEntry,
  ConsumableRequestLineRow,
  ConsumableRequestReleaseAllocationRow,
  ConsumableRequestRow,
  NewConsumableRequestLineRow,
  NewConsumableRequestReleaseAllocationRow,
  NewConsumableRequestRow,
} from "@/server/db/schema";
import type { PaginationParams } from "@/types/filters";
import type { LinkedRequestSummary } from "@/server/shared/linked-requests";

export type ConsumableRequestLineDTO = {
  id: string;
  lineNo: number;
  consumableId: string;
  itemCode: string;
  itemName: string;
  category: string;
  unit: string;
  quantityRequested: number;
  purpose: string;
  notes?: string;
};

export type ConsumableRequestReleaseAllocationDTO = {
  id: string;
  requestLineId: string;
  consumableId: string;
  purchaseLotId: string | null;
  lotCode: string | null;
  supplierId: string | null;
  supplierName: string | null;
  quantity: number;
  unitCost: string;
  lineTotal: string;
  releasedAt: string;
  releasedByName: string;
};

export type ConsumableRequestDTO = {
  id: string;
  requestCode: string;
  requesterUserId?: string;
  requesterName: string;
  requesterEmail: string;
  requesterPhone: string;
  department: string;
  departmentId?: string | null;
  projectId?: string | null;
  source?: "portal" | "admin_manual";
  requestedByName?: string;
  /** Present when this row was submitted with other request types. */
  submissionGroupId?: string | null;
  relatedRequests?: LinkedRequestSummary[];
  purpose: string;
  status: ConsumableRequestRow["status"];
  notes?: string;
  rejectionReason?: string;
  cancellationReason?: string;
  receivedBy?: string;
  history: ConsumableRequestHistoryEntry[];
  lines: ConsumableRequestLineDTO[];
  allocations: ConsumableRequestReleaseAllocationDTO[];
  totalCost: string;
  approvedAt?: string;
  approvedByName?: string;
  releasedAt?: string;
  releasedByName?: string;
  requestedAt: string;
  relativeTime: string;
};

export type ListConsumableRequestFilters = PaginationParams & {
  status?: ConsumableRequestRow["status"];
  department?: string;
  search?: string;
  requesterUserId?: string;
  startDate?: string;
  endDate?: string;
  includeSandbox?: boolean;
};

export interface IConsumableRequestRepository {
  findById(id: string): Promise<ConsumableRequestRow | null>;
  list(filters?: ListConsumableRequestFilters): Promise<ConsumableRequestRow[]>;
  count(
    filters?: Omit<ListConsumableRequestFilters, "page" | "limit">
  ): Promise<number>;
  countByStatus(
    filters?: Omit<ListConsumableRequestFilters, "status" | "page" | "limit">
  ): Promise<Record<string, number>>;
  countPending(session?: unknown, userId?: string): Promise<number>;
  create(
    data: Omit<NewConsumableRequestRow, "id" | "createdAt" | "updatedAt">
  ): Promise<ConsumableRequestRow>;
  update(
    id: string,
    data: Partial<Omit<ConsumableRequestRow, "id" | "createdAt" | "requestCode">>
  ): Promise<ConsumableRequestRow | null>;
  createLines(
    rows: Omit<NewConsumableRequestLineRow, "id" | "createdAt" | "updatedAt">[]
  ): Promise<ConsumableRequestLineRow[]>;
  listLinesByRequestId(
    requestId: string
  ): Promise<ConsumableRequestLineRow[]>;
  updateLine(
    id: string,
    data: Partial<
      Omit<ConsumableRequestLineRow, "id" | "createdAt" | "requestId">
    >,
    session?: unknown
  ): Promise<ConsumableRequestLineRow | null>;
  createAllocations(
    rows: Omit<NewConsumableRequestReleaseAllocationRow, "id" | "createdAt">[]
  ): Promise<ConsumableRequestReleaseAllocationRow[]>;
  listAllocationsByRequestId(
    requestId: string
  ): Promise<ConsumableRequestReleaseAllocationRow[]>;
}
