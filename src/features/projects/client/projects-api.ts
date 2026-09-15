import type {
  Project,
  ProjectAssetAssignment,
  ProjectExpenseCategory,
  ProjectExpenseLine,
  ProjectStatus,
} from "@/types/projects";
import { fetchJson, type ApiResponse } from "@/features/shared/fetch-json";

export type CreateProjectPayload = {
  name: string;
  description?: string | null;
  status?: ProjectStatus;
  location?: string | null;
  department?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  budget?: string | number | null;
  notes?: string | null;
};

export type UpdateProjectPayload = Partial<CreateProjectPayload>;

export type CreateProjectExpensePayload = {
  lineType?: "miscellaneous" | "adjustment" | "material";
  category?: ProjectExpenseCategory;
  /** Required when category is `other`. */
  categoryLabel?: string | null;
  description: string;
  amount: string | number;
  quantity?: string | number | null;
  unitCost?: string | number | null;
  incurredOn?: string;
  notes?: string | null;
};

export type UpdateProjectExpensePayload = Partial<CreateProjectExpensePayload>;

export type UseProjectMaterialPayload = {
  consumableId: string;
  quantity: number;
  purchaseLotId?: string;
  description?: string | null;
  incurredOn?: string;
  notes?: string | null;
};

export type AssignProjectAssetPayload = {
  assetId: string;
  notes?: string | null;
};

export type ReturnProjectAssetPayload = {
  notes?: string | null;
};

export type ReportProjectAssetDamagePayload = {
  mode: "maintenance" | "write_off";
  amount?: string | number | null;
  assetStatus?: "out_of_service" | "retired";
  description?: string | null;
  incurredOn?: string;
  notes: string;
};

export type ProjectAssetDamageReport = {
  assignment: ProjectAssetAssignment;
  mode: "maintenance" | "write_off";
  maintenanceLogCode: string;
  expenseId: string | null;
  expenseAmount: string | null;
};

export const projectsApi = {
  async list(params?: {
    search?: string;
    status?: ProjectStatus;
  }): Promise<Project[]> {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set("search", params.search);
    if (params?.status) searchParams.set("status", params.status);
    const qs = searchParams.toString();
    const path = qs ? `/api/projects?${qs}` : "/api/projects";
    const response = await fetchJson<ApiResponse<Project[]>>(path, {
      method: "GET",
    });
    return response.data;
  },

  async get(id: string): Promise<Project> {
    const response = await fetchJson<ApiResponse<Project>>(
      `/api/projects/${id}`,
      { method: "GET" }
    );
    return response.data;
  },

  async create(payload: CreateProjectPayload): Promise<Project> {
    const response = await fetchJson<ApiResponse<Project>>("/api/projects", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return response.data;
  },

  async update(id: string, payload: UpdateProjectPayload): Promise<Project> {
    const response = await fetchJson<ApiResponse<Project>>(
      `/api/projects/${id}`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      }
    );
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await fetchJson<void>(`/api/projects/${id}`, { method: "DELETE" });
  },

  async listExpenses(projectId: string): Promise<ProjectExpenseLine[]> {
    const response = await fetchJson<ApiResponse<ProjectExpenseLine[]>>(
      `/api/projects/${projectId}/expenses`,
      { method: "GET" }
    );
    return response.data;
  },

  async createExpense(
    projectId: string,
    payload: CreateProjectExpensePayload
  ): Promise<ProjectExpenseLine> {
    const response = await fetchJson<ApiResponse<ProjectExpenseLine>>(
      `/api/projects/${projectId}/expenses`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
    return response.data;
  },

  async useMaterial(
    projectId: string,
    payload: UseProjectMaterialPayload
  ): Promise<ProjectExpenseLine> {
    const response = await fetchJson<ApiResponse<ProjectExpenseLine>>(
      `/api/projects/${projectId}/materials`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
    return response.data;
  },

  async updateExpense(
    projectId: string,
    expenseId: string,
    payload: UpdateProjectExpensePayload
  ): Promise<ProjectExpenseLine> {
    const sp = new URLSearchParams({ expenseId });
    const response = await fetchJson<ApiResponse<ProjectExpenseLine>>(
      `/api/projects/${projectId}/expenses?${sp}`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      }
    );
    return response.data;
  },

  async deleteExpense(projectId: string, expenseId: string): Promise<void> {
    const sp = new URLSearchParams({ expenseId });
    await fetchJson<void>(`/api/projects/${projectId}/expenses?${sp}`, {
      method: "DELETE",
    });
  },

  async listAssets(
    projectId: string,
    status?: "assigned" | "returned" | "written_off" | "all"
  ): Promise<ProjectAssetAssignment[]> {
    const sp = new URLSearchParams();
    if (status) sp.set("status", status);
    const qs = sp.toString();
    const response = await fetchJson<ApiResponse<ProjectAssetAssignment[]>>(
      qs
        ? `/api/projects/${projectId}/assets?${qs}`
        : `/api/projects/${projectId}/assets`,
      { method: "GET" }
    );
    return response.data;
  },

  async assignAsset(
    projectId: string,
    payload: AssignProjectAssetPayload
  ): Promise<ProjectAssetAssignment> {
    const response = await fetchJson<ApiResponse<ProjectAssetAssignment>>(
      `/api/projects/${projectId}/assets`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
    return response.data;
  },

  async returnAsset(
    projectId: string,
    assignmentId: string,
    payload?: ReturnProjectAssetPayload
  ): Promise<ProjectAssetAssignment> {
    const response = await fetchJson<ApiResponse<ProjectAssetAssignment>>(
      `/api/projects/${projectId}/assets/${assignmentId}/return`,
      {
        method: "POST",
        body: JSON.stringify(payload ?? {}),
      }
    );
    return response.data;
  },

  async reportAssetDamage(
    projectId: string,
    assignmentId: string,
    payload: ReportProjectAssetDamagePayload
  ): Promise<ProjectAssetDamageReport> {
    const response = await fetchJson<ApiResponse<ProjectAssetDamageReport>>(
      `/api/projects/${projectId}/assets/${assignmentId}/damage`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
    return response.data;
  },
};
