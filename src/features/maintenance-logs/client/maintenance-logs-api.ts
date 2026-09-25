import type { MaintenanceLogDTO } from "@/server/modules/maintenance/maintenance.types";
import { fetchJson, type ApiResponse } from "@/features/shared/fetch-json";

export type MaintenanceLog = MaintenanceLogDTO;

export type CreateMaintenancePayload = {
  assetId?: string;
  assetCode: string;
  assetName: string;
  category: MaintenanceLog["category"];
  condition?: MaintenanceLog["condition"];
  source?: MaintenanceLog["source"];
  notes: string;
  scheduledDate?: string;
  relatedBorrowLogCode?: string;
};

export type UpdateOpenMaintenancePayload = {
  workNotes?: string;
  repairCost?: string | number | null;
  repairParts?: Array<{ name: string; cost?: string | number | null }>;
  scheduledDate?: string | null;
};

export type ResolveMaintenancePayload = {
  resolutionNotes: string;
  repairCost?: string | number | null;
  repairParts?: Array<{ name: string; cost?: string | number | null }>;
  noPartsUsed?: boolean;
  resolutionDate?: string;
  technician: string;
};

export const maintenanceLogsApi = {
  async list(params?: {
    openOnly?: boolean;
    search?: string;
    condition?: MaintenanceLog["condition"];
    assetId?: string;
  }): Promise<MaintenanceLog[]> {
    const sp = new URLSearchParams();
    if (params?.openOnly) sp.set("openOnly", "true");
    if (params?.search) sp.set("search", params.search);
    if (params?.condition) sp.set("condition", params.condition);
    if (params?.assetId) sp.set("assetId", params.assetId);
    const qs = sp.toString();
    const res = await fetchJson<ApiResponse<MaintenanceLog[]>>(
      qs ? `/api/maintenance-logs?${qs}` : "/api/maintenance-logs"
    );
    return res.data;
  },

  async syncOrphans(): Promise<{ created: number }> {
    const res = await fetchJson<ApiResponse<{ created: number }>>(
      "/api/maintenance-logs/sync-orphans",
      { method: "POST" }
    );
    return res.data;
  },

  async getById(id: string): Promise<MaintenanceLog> {
    const res = await fetchJson<ApiResponse<MaintenanceLog>>(
      `/api/maintenance-logs/${id}`
    );
    return res.data;
  },

  async create(payload: CreateMaintenancePayload): Promise<MaintenanceLog> {
    const res = await fetchJson<ApiResponse<MaintenanceLog>>(
      "/api/maintenance-logs",
      { method: "POST", body: JSON.stringify(payload) }
    );
    return res.data;
  },

  async updateOpen(
    id: string,
    payload: UpdateOpenMaintenancePayload
  ): Promise<MaintenanceLog> {
    const res = await fetchJson<ApiResponse<MaintenanceLog>>(
      `/api/maintenance-logs/${id}`,
      { method: "PATCH", body: JSON.stringify(payload) }
    );
    return res.data;
  },

  async resolve(
    id: string,
    payload: ResolveMaintenancePayload
  ): Promise<MaintenanceLog> {
    const res = await fetchJson<ApiResponse<MaintenanceLog>>(
      `/api/maintenance-logs/${id}/resolve`,
      { method: "POST", body: JSON.stringify(payload) }
    );
    return res.data;
  },
};
