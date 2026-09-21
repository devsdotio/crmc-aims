import { fetchJson, type ApiResponse } from "@/features/shared/fetch-json";
import type { AuditLogRow } from "@/server/db/schema/audit-logs";

export type AuditLogRecord = AuditLogRow;

export type FlattenedLog = {
  id: string;
  requestId?: string;
  requestCode: string;
  department: string;
  action: string;
  actor: string;
  timestamp: string;
  note?: string;
};

export const auditLogsApi = {
  async list(params?: {
    entityType?: string;
    entityId?: string;
    actorUserId?: string;
    action?: string;
  }): Promise<AuditLogRecord[]> {
    const sp = new URLSearchParams();
    if (params?.entityType) sp.set("entityType", params.entityType);
    if (params?.entityId) sp.set("entityId", params.entityId);
    if (params?.actorUserId) sp.set("actorUserId", params.actorUserId);
    if (params?.action) sp.set("action", params.action);
    
    const qs = sp.toString();
    const res = await fetchJson<ApiResponse<AuditLogRecord[]>>(
      qs ? `/api/audit-logs?${qs}` : "/api/audit-logs"
    );
    return res.data;
  },
  
  async listBorrowRequests(): Promise<FlattenedLog[]> {
    const res = await fetchJson<ApiResponse<FlattenedLog[]>>("/api/audit-logs/borrow-requests");
    return res.data;
  },

  async listRequisitions(): Promise<FlattenedLog[]> {
    const res = await fetchJson<ApiResponse<FlattenedLog[]>>("/api/audit-logs/requisitions");
    return res.data;
  },

  async listConsumableRequests(): Promise<import("@/server/modules/consumable-requests/consumable-request.types").ConsumableRequestDTO[]> {
    const res = await fetchJson<{ data: import("@/server/modules/consumable-requests/consumable-request.types").ConsumableRequestDTO[] }>(
      "/api/consumable-requests?limit=1000"
    );
    return res.data;
  },

  async listPurchaseOrders(): Promise<FlattenedLog[]> {
    const res = await fetchJson<ApiResponse<FlattenedLog[]>>("/api/audit-logs/purchase-orders");
    return res.data;
  },
};
