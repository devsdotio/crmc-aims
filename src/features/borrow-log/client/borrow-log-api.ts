import type { BorrowLogDTO } from "@/server/modules/borrow-log/borrow-log.types";
import { appendIncludeSandbox } from "@/components/providers/sandbox-visibility-context";
import { fetchJson, type ApiResponse } from "@/features/shared/fetch-json";

export type BorrowLogRecord = BorrowLogDTO;

export type ReleaseBorrowPayload = {
  assetId: string;
  requestId?: string;
  requestCode?: string;
  borrowerName: string;
  borrowerEmail?: string;
  borrowerPhone?: string;
  department: string;
  dueDate: string;
  notes?: string;
  borrowerUserId?: string;
};

export type ReturnBorrowPayload = {
  condition: "good" | "damaged" | "needs_repair";
  conditionNotes?: string;
  flagMaintenance?: boolean;
};

export type VoidBorrowPayload = {
  reason?: string;
};

export const borrowLogApi = {
  async list(params?: {
    status?: BorrowLogRecord["status"];
    department?: string;
    search?: string;
    custodyKind?: "borrow" | "assignment" | "all";
    scope?: "department";
    includeSandbox?: boolean;
  }): Promise<BorrowLogRecord[]> {
    const sp = new URLSearchParams();
    if (params?.status) sp.set("status", params.status);
    if (params?.department) sp.set("department", params.department);
    if (params?.search) sp.set("search", params.search);
    if (params?.custodyKind) sp.set("custodyKind", params.custodyKind);
    if (params?.scope) sp.set("scope", params.scope);
    appendIncludeSandbox(sp, params?.includeSandbox);
    const qs = sp.toString();
    const res = await fetchJson<ApiResponse<BorrowLogRecord[]>>(
      qs ? `/api/borrow-log?${qs}` : "/api/borrow-log"
    );
    return res.data;
  },

  async getById(id: string): Promise<BorrowLogRecord> {
    const res = await fetchJson<ApiResponse<BorrowLogRecord>>(
      `/api/borrow-log/${id}`
    );
    return res.data;
  },

  async release(payload: ReleaseBorrowPayload): Promise<BorrowLogRecord> {
    const res = await fetchJson<ApiResponse<BorrowLogRecord>>("/api/borrow-log", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  async returnLog(
    id: string,
    payload: ReturnBorrowPayload
  ): Promise<BorrowLogRecord> {
    const res = await fetchJson<ApiResponse<BorrowLogRecord>>(
      `/api/borrow-log/${id}/return`,
      { method: "POST", body: JSON.stringify(payload) }
    );
    return res.data;
  },

  async voidLog(
    id: string,
    payload: VoidBorrowPayload = {}
  ): Promise<BorrowLogRecord> {
    const res = await fetchJson<ApiResponse<BorrowLogRecord>>(
      `/api/borrow-log/${id}/void`,
      { method: "POST", body: JSON.stringify(payload) }
    );
    return res.data;
  },

  async hardDelete(id: string): Promise<void> {
    await fetchJson<ApiResponse<null> | null>(`/api/borrow-log/${id}`, {
      method: "DELETE",
    });
  },
};
