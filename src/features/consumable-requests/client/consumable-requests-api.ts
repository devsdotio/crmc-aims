import type { ConsumableRequestDTO } from "@/server/modules/consumable-requests/consumable-request.types";
import { appendIncludeSandbox } from "@/components/providers/sandbox-visibility-context";
import { fetchJson, type ApiResponse, type PaginatedResponse } from "@/features/shared/fetch-json";

export type ConsumableRequest = ConsumableRequestDTO;

export type CreateConsumableRequestPayload = {
  requesterName: string;
  requesterEmail: string;
  requesterPhone?: string;
  departmentId?: string;
  /** Free-text department when not selecting from catalog. */
  department?: string;
  projectId?: string;
  requestedByName?: string;
  /** Optional; derived from line purposes when omitted. */
  purpose?: string;
  notes?: string;
  requesterUserId?: string;
  /** Shared when the wizard submits more than one request type together. */
  submissionGroupId?: string;
  lines: Array<{
    consumableId: string;
    quantity: number;
    purpose: string;
    notes?: string;
  }>;
};

export type ReleaseConsumableRequestPayload = {
  receivedBy: string;
  note?: string;
  lines: Array<{
    lineId: string;
    allocations: Array<{
      lotId?: string;
      lotCode?: string;
      quantity: number;
    }>;
  }>;
};

export type UpdateConsumableRequestPayload = {
  requesterName?: string;
  requesterEmail?: string;
  requesterPhone?: string;
  departmentId?: string | null;
  department?: string;
  projectId?: string | null;
  requestedByName?: string | null;
  purpose?: string;
  notes?: string | null;
  lines?: Array<{
    consumableId: string;
    quantity: number;
    purpose: string;
    notes?: string;
  }>;
  editReason: string;
};

export type ApproveConsumableRequestPayload = {
  note?: string;
  lines?: Array<{
    lineId?: string;
    consumableId: string;
    quantity: number;
  }>;
};

export const consumableRequestsApi = {
  async list(params?: {
    status?: ConsumableRequest["status"];
    department?: string;
    search?: string;
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
    includeSandbox?: boolean;
  }): Promise<PaginatedResponse<ConsumableRequest[]>> {
    const sp = new URLSearchParams();
    if (params?.status) sp.set("status", params.status);
    if (params?.department) sp.set("department", params.department);
    if (params?.search) sp.set("search", params.search);
    if (params?.startDate) sp.set("startDate", params.startDate);
    if (params?.endDate) sp.set("endDate", params.endDate);
    if (params?.page) sp.set("page", params.page.toString());
    if (params?.limit) sp.set("limit", params.limit.toString());
    appendIncludeSandbox(sp, params?.includeSandbox);
    const qs = sp.toString();
    const res = await fetchJson<ApiResponse<PaginatedResponse<ConsumableRequest[]>>>(
      qs ? `/api/consumable-requests?${qs}` : "/api/consumable-requests"
    );
    return res.data;
  },

  async getById(id: string): Promise<ConsumableRequest> {
    const res = await fetchJson<ApiResponse<ConsumableRequest>>(
      `/api/consumable-requests/${id}`
    );
    return res.data;
  },

  async create(
    payload: CreateConsumableRequestPayload
  ): Promise<ConsumableRequest> {
    const res = await fetchJson<ApiResponse<ConsumableRequest>>(
      "/api/consumable-requests",
      { method: "POST", body: JSON.stringify(payload) }
    );
    return res.data;
  },

  async update(
    id: string,
    payload: UpdateConsumableRequestPayload
  ): Promise<ConsumableRequest> {
    const res = await fetchJson<ApiResponse<ConsumableRequest>>(
      `/api/consumable-requests/${id}`,
      { method: "PATCH", body: JSON.stringify(payload) }
    );
    return res.data;
  },

  async approve(
    id: string,
    payload?: ApproveConsumableRequestPayload | string
  ): Promise<ConsumableRequest> {
    const body =
      typeof payload === "string" ? { note: payload } : (payload ?? {});
    const res = await fetchJson<ApiResponse<ConsumableRequest>>(
      `/api/consumable-requests/${id}/approve`,
      { method: "POST", body: JSON.stringify(body) }
    );
    return res.data;
  },

  async reject(id: string, reason: string): Promise<ConsumableRequest> {
    const res = await fetchJson<ApiResponse<ConsumableRequest>>(
      `/api/consumable-requests/${id}/reject`,
      { method: "POST", body: JSON.stringify({ reason }) }
    );
    return res.data;
  },

  async undoApproval(id: string, note?: string): Promise<ConsumableRequest> {
    const res = await fetchJson<ApiResponse<ConsumableRequest>>(
      `/api/consumable-requests/${id}/undo-approval`,
      { method: "POST", body: JSON.stringify(note ? { note } : {}) }
    );
    return res.data;
  },

  async cancel(
    id: string,
    payload?: string | { reason?: string; note?: string }
  ): Promise<ConsumableRequest> {
    const body =
      typeof payload === "string"
        ? { note: payload }
        : payload
        ? payload
        : {};
    const res = await fetchJson<ApiResponse<ConsumableRequest>>(
      `/api/consumable-requests/${id}/cancel`,
      { method: "POST", body: JSON.stringify(body) }
    );
    return res.data;
  },

  async release(
    id: string,
    payload: ReleaseConsumableRequestPayload
  ): Promise<ConsumableRequest> {
    const res = await fetchJson<ApiResponse<ConsumableRequest>>(
      `/api/consumable-requests/${id}/release`,
      { method: "POST", body: JSON.stringify(payload) }
    );
    return res.data;
  },
};
