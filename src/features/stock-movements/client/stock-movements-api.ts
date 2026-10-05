import type { StockMovementDTO } from "@/server/modules/stock-movements";
import { fetchJson, type ApiResponse } from "@/features/shared/fetch-json";

export type StockMovement = StockMovementDTO;

export type VoidStockMovementPayload = {
  reason?: string;
};

export const stockMovementsApi = {
  async list(params?: {
    reason?: StockMovement["reason"];
    limit?: number;
    offset?: number;
    departmentId?: string;
    classification?: "supply" | "material";
    fromDate?: string;
    excludeVoided?: boolean;
  }): Promise<StockMovement[]> {
    const sp = new URLSearchParams();
    if (params?.reason) sp.set("reason", params.reason);
    if (params?.limit) sp.set("limit", String(params.limit));
    if (params?.offset) sp.set("offset", String(params.offset));
    if (params?.departmentId) sp.set("departmentId", params.departmentId);
    if (params?.classification) sp.set("classification", params.classification);
    if (params?.fromDate) sp.set("fromDate", params.fromDate);
    if (params?.excludeVoided) sp.set("excludeVoided", "true");
    const qs = sp.toString();
    const res = await fetchJson<ApiResponse<StockMovement[]>>(
      qs ? `/api/stock-movements?${qs}` : "/api/stock-movements"
    );
    return res.data;
  },

  /** Page through department issues so older supplies are not cut off at 200. */
  async listAll(params?: {
    reason?: StockMovement["reason"];
    departmentId?: string;
    classification?: "supply" | "material";
    fromDate?: string;
    excludeVoided?: boolean;
  }): Promise<StockMovement[]> {
    const limit = 200;
    const rows: StockMovement[] = [];
    for (let page = 0; page < 25; page += 1) {
      const batch = await this.list({
        ...params,
        limit,
        offset: page * limit,
      });
      rows.push(...batch);
      if (batch.length < limit) break;
    }
    return rows;
  },

  async listByConsumable(id: string): Promise<StockMovement[]> {
    const res = await fetchJson<ApiResponse<StockMovement[]>>(
      `/api/consumables/${id}/movements`
    );
    return res.data;
  },

  async voidIssue(
    id: string,
    payload: VoidStockMovementPayload = {}
  ): Promise<StockMovement> {
    const res = await fetchJson<ApiResponse<StockMovement>>(
      `/api/stock-movements/${id}/void`,
      { method: "POST", body: JSON.stringify(payload) }
    );
    return res.data;
  },
};
