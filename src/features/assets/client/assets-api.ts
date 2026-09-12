import type {
  Asset,
  AssetStatus,
  CreateAssetInput,
  ReturnAssetInput,
  UpdateAssetInput,
} from "@/types/assets";
import { appendIncludeSandbox } from "@/components/providers/sandbox-visibility-context";
import { fetchJson, type ApiResponse } from "@/features/shared/fetch-json";

export interface AssetFieldChange<T = unknown> {
  from: T;
  to: T;
}

export type AssetChangesMap = Record<string, AssetFieldChange>;

export interface AssetLifecycleEventPayload {
  changes?: AssetChangesMap;
  requestId?: string;
  expectedReturnDate?: string;
  borrowerDepartment?: string;
  borrowerEmail?: string;
  borrowerPhone?: string;
  condition?: string;
  description?: string;
  notes?: string;
  via?: string;
  reason?: string;
  snapshot?: Record<string, unknown>;
  [key: string]: unknown;
}

export type AssetLifecycleEvent = {
  id: string;
  assetId: string | null;
  assetCode: string;
  eventType:
    | "created"
    | "updated"
    | "status_changed"
    | "released"
    | "returned"
    | "flagged_maintenance"
    | "deleted";
  actor: {
    userId: string;
    email: string | null;
    displayName: string;
  };
  fromStatus: string | null;
  toStatus: string | null;
  fromHolder: string | null;
  toHolder: string | null;
  payload: AssetLifecycleEventPayload;
  createdAt: string;
};

export type ReleaseAssetInput = {
  custodyKind?: "borrow" | "assignment";
  departmentId?: string;
  projectId?: string;
  borrowerName?: string;
  borrowerDepartment?: string;
  borrowerEmail?: string;
  borrowerPhone?: string;
  notes?: string;
  expectedReturnDate?: string | null;
  requestedByName?: string;
  requestId?: string;
};

export type FlagMaintenanceInput = {
  description?: string;
  notes?: string;
};

export type ReportMissingInput = {
  reason: "lost" | "stolen" | "missing";
  notes: string;
};

export type ScanResolveResult = {
  kind: "asset";
  code: string;
  qrPayload: string;
  asset: Asset;
  suggestedAction: "release" | "return" | "project" | "blocked";
  reason?: string;
};

export const assetsApi = {
  async listAssets(
    status?: AssetStatus,
    filters?: {
      modelId?: string;
      category?: string;
      search?: string;
      availableOnly?: boolean;
      assignmentType?: "borrowable" | "assignable";
      includeSandbox?: boolean;
    }
  ): Promise<Asset[]> {
    const searchParams = new URLSearchParams();

    if (status) {
      searchParams.set("status", status);
    }
    if (filters?.modelId) searchParams.set("modelId", filters.modelId);
    if (filters?.category) searchParams.set("category", filters.category);
    if (filters?.search) searchParams.set("search", filters.search);
    if (filters?.availableOnly) searchParams.set("availableOnly", "true");
    if (filters?.assignmentType) searchParams.set("assignmentType", filters.assignmentType);
    appendIncludeSandbox(searchParams, filters?.includeSandbox);

    const queryString = searchParams.toString();
    const path =
      queryString.length > 0 ? `/api/assets?${queryString}` : "/api/assets";
    // Fail fast so the grid leaves skeleton state on hung DB/pool waits.
    const response = await fetchJson<ApiResponse<Asset[]>>(path, {
      method: "GET",
      timeoutMs: 15_000,
    });
    return response.data;
  },

  async getAssetById(id: string): Promise<Asset> {
    const response = await fetchJson<ApiResponse<Asset>>(`/api/assets/${id}`, {
      method: "GET",
    });
    return response.data;
  },

  async getAssetByCode(code: string): Promise<Asset> {
    const path = `/api/assets/by-code?code=${encodeURIComponent(code)}`;
    const response = await fetchJson<ApiResponse<Asset>>(path, { method: "GET" });
    return response.data;
  },

  async peekNextAssetCode(
    category: string
  ): Promise<{ assetCode: string; prefix: string }> {
    const path = `/api/assets/next-code?category=${encodeURIComponent(category)}`;
    const response = await fetchJson<
      ApiResponse<{ assetCode: string; prefix: string }>
    >(path, { method: "GET" });
    return response.data;
  },

  async createAsset(payload: CreateAssetInput): Promise<Asset> {
    const response = await fetchJson<ApiResponse<Asset>>("/api/assets", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    return response.data;
  },

  async bulkCreate(payload: Record<string, unknown>) {
    const response = await fetchJson<
      ApiResponse<{
        model: unknown;
        units: Asset[];
        createdCount: number;
      }>
    >("/api/assets/bulk", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return response.data;
  },

  async resolveScan(code: string): Promise<ScanResolveResult> {
    const response = await fetchJson<ApiResponse<ScanResolveResult>>(
      "/api/assets/scan/resolve",
      {
        method: "POST",
        body: JSON.stringify({ code }),
      }
    );
    return response.data;
  },

  async updateAsset(id: string, payload: UpdateAssetInput): Promise<Asset> {
    const response = await fetchJson<ApiResponse<Asset>>(`/api/assets/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });

    return response.data;
  },

  async deleteAsset(id: string): Promise<void> {
    await fetchJson<void>(`/api/assets/${id}`, { method: "DELETE" });
  },

  async releaseAsset(id: string, payload: ReleaseAssetInput): Promise<Asset> {
    const response = await fetchJson<ApiResponse<Asset>>(
      `/api/assets/${id}/release`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
    return response.data;
  },

  async scanRelease(
    payload: ReleaseAssetInput & { code: string }
  ): Promise<Asset> {
    const response = await fetchJson<ApiResponse<Asset>>(
      "/api/assets/scan/release",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
    return response.data;
  },

  async returnAsset(id: string, payload: ReturnAssetInput): Promise<Asset> {
    const response = await fetchJson<ApiResponse<Asset>>(
      `/api/assets/${id}/return`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
    return response.data;
  },

  async scanReturn(
    payload: ReturnAssetInput & { code: string }
  ): Promise<Asset> {
    const response = await fetchJson<ApiResponse<Asset>>(
      "/api/assets/scan/return",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
    return response.data;
  },

  async flagForMaintenance(
    id: string,
    payload: FlagMaintenanceInput = {}
  ): Promise<Asset> {
    const response = await fetchJson<ApiResponse<Asset>>(
      `/api/assets/${id}/flag-maintenance`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );

    return response.data;
  },

  async reportMissing(
    id: string,
    payload: ReportMissingInput
  ): Promise<Asset> {
    const response = await fetchJson<ApiResponse<Asset>>(
      `/api/assets/${id}/report-missing`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
    return response.data;
  },

  async listLifecycle(id: string, limit?: number): Promise<AssetLifecycleEvent[]> {
    const searchParams = new URLSearchParams();
    if (limit !== undefined) {
      searchParams.set("limit", String(limit));
    }
    const query = searchParams.toString();
    const path =
      query.length > 0
        ? `/api/assets/${id}/lifecycle?${query}`
        : `/api/assets/${id}/lifecycle`;
    const response = await fetchJson<ApiResponse<AssetLifecycleEvent[]>>(path, {
      method: "GET",
      timeoutMs: 15_000,
    });
    return response.data;
  },
};
