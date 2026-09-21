import type { BorrowRequestDTO } from "@/server/modules/borrow-requests/borrow-request.types";
import { fetchJson, type ApiResponse, type PaginatedResponse } from "@/features/shared/fetch-json";

export type BorrowRequest = BorrowRequestDTO;

export type CreateBorrowRequestPayload = {
  requesterName: string;
  requesterEmail: string;
  requesterPhone?: string;
  departmentId?: string;
  /** Free-text department when not selecting from catalog. */
  department?: string;
  requestType?: "borrowable" | "assignable";
  requestedByName?: string;
  items: {
    itemDescription: string;
    assetId?: string;
    assetCode?: string;
    category: BorrowRequest["items"][number]["category"];
    quantity: number;
    itemType: "asset";
    purpose: string;
  }[];
  /** Optional; derived from item purposes when omitted. */
  purpose?: string;
  expectedReturnDate?: string;
  notes?: string;
  requesterUserId?: string;
  /** Shared when the wizard submits more than one request type together. */
  submissionGroupId?: string;
};

export type ApproveBorrowRequestPayload = {
  note?: string;
  items?: {
    itemDescription: string;
    category: BorrowRequest["items"][number]["category"];
    quantity: number;
    itemType: "asset";
  }[];
};

export type ReleaseBorrowRequestPayload = {
  pickedUpBy: string;
  note?: string;
  lineAllocations: {
    lineIndex: number;
    assetIds: string[];
  }[];
};

export type UpdateBorrowRequestPayload = {
  requesterName?: string;
  requesterEmail?: string;
  requesterPhone?: string;
  departmentId?: string;
  department?: string;
  requestType?: "borrowable" | "assignable";
  requestedByName?: string;
  items?: {
    itemDescription: string;
    assetId?: string;
    assetCode?: string;
    category: BorrowRequest["items"][number]["category"];
    quantity: number;
    itemType: "asset";
    purpose?: string;
  }[];
  purpose?: string;
  expectedReturnDate?: string | null;
  notes?: string | null;
  editReason: string;
};

export const borrowRequestsApi = {
  async list(params?: {
    status?: BorrowRequest["status"];
    department?: string;
    search?: string;
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
    assetId?: string;
    requestType?: "borrowable" | "assignable";
  }): Promise<PaginatedResponse<BorrowRequest[]>> {
    const sp = new URLSearchParams();
    if (params?.status) sp.set("status", params.status);
    if (params?.department) sp.set("department", params.department);
    if (params?.search) sp.set("search", params.search);
    if (params?.startDate) sp.set("startDate", params.startDate);
    if (params?.endDate) sp.set("endDate", params.endDate);
    if (params?.page) sp.set("page", params.page.toString());
    if (params?.limit) sp.set("limit", params.limit.toString());
    if (params?.assetId) sp.set("assetId", params.assetId);
    if (params?.requestType) sp.set("requestType", params.requestType);
    const qs = sp.toString();
    const res = await fetchJson<ApiResponse<PaginatedResponse<BorrowRequest[]>>>(
      qs ? `/api/requests?${qs}` : "/api/requests"
    );
    return res.data;
  },

  async getById(id: string): Promise<BorrowRequest> {
    const res = await fetchJson<ApiResponse<BorrowRequest>>(
      `/api/requests/${id}`
    );
    return res.data;
  },

  async create(payload: CreateBorrowRequestPayload): Promise<BorrowRequest> {
    const res = await fetchJson<ApiResponse<BorrowRequest>>(
      "/api/requests",
      { method: "POST", body: JSON.stringify(payload) }
    );
    return res.data;
  },

  async update(
    id: string,
    payload: UpdateBorrowRequestPayload
  ): Promise<BorrowRequest> {
    const res = await fetchJson<ApiResponse<BorrowRequest>>(
      `/api/requests/${id}`,
      { method: "PATCH", body: JSON.stringify(payload) }
    );
    return res.data;
  },

  async approve(
    id: string,
    payload?: ApproveBorrowRequestPayload
  ): Promise<BorrowRequest> {
    const res = await fetchJson<ApiResponse<BorrowRequest>>(
      `/api/requests/${id}/approve`,
      { method: "POST", body: JSON.stringify(payload ?? {}) }
    );
    return res.data;
  },

  async reject(id: string, reason: string): Promise<BorrowRequest> {
    const res = await fetchJson<ApiResponse<BorrowRequest>>(
      `/api/requests/${id}/reject`,
      { method: "POST", body: JSON.stringify({ reason }) }
    );
    return res.data;
  },

  async undoApproval(id: string, note?: string): Promise<BorrowRequest> {
    const res = await fetchJson<ApiResponse<BorrowRequest>>(
      `/api/requests/${id}/undo-approval`,
      { method: "POST", body: JSON.stringify(note ? { note } : {}) }
    );
    return res.data;
  },

  async cancel(
    id: string,
    payload?: string | { reason?: string; note?: string }
  ): Promise<BorrowRequest> {
    const body =
      typeof payload === "string"
        ? { note: payload }
        : payload
        ? payload
        : {};
    const res = await fetchJson<ApiResponse<BorrowRequest>>(
      `/api/requests/${id}/cancel`,
      { method: "POST", body: JSON.stringify(body) }
    );
    return res.data;
  },

  async release(id: string, payload: ReleaseBorrowRequestPayload): Promise<BorrowRequest> {
    const res = await fetchJson<ApiResponse<BorrowRequest>>(
      `/api/requests/${id}/release`,
      { method: "POST", body: JSON.stringify(payload ?? {}) }
    );
    return res.data;
  },

  async markUnreleased(id: string, payload?: { note?: string }): Promise<BorrowRequest> {
    const res = await fetchJson<ApiResponse<BorrowRequest>>(
      `/api/requests/${id}/unrelease`,
      { method: "POST", body: JSON.stringify(payload ?? {}) }
    );
    return res.data;
  },

  async markReturned(id: string, payload: { returnedBy: string; note?: string }): Promise<BorrowRequest> {
    const res = await fetchJson<ApiResponse<BorrowRequest>>(
      `/api/requests/${id}/return`,
      { method: "POST", body: JSON.stringify(payload ?? {}) }
    );
    return res.data;
  },
};
