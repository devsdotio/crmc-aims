"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";

import { fetchJson, type ApiResponse } from "@/features/shared/fetch-json";
import { userQueryKeys } from "@/features/users/client/query-keys";

import { departmentQueryKeys } from "./query-keys";

export type DepartmentDTO = {
  id: string;
  code: string;
  name: string;
  isSandbox: boolean;
  accountUserId: string | null;
  accountEmail: string | null;
  accountStatus: "active" | "deactivated" | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateDepartmentPayload = {
  code: string;
  name: string;
  isSandbox?: boolean;
};

export type UpdateDepartmentPayload = {
  code?: string;
  name?: string;
  isSandbox?: boolean;
};

async function fetchDepartments(): Promise<DepartmentDTO[]> {
  const result = await fetchJson<ApiResponse<DepartmentDTO[]>>(
    "/api/departments",
    {
      method: "GET",
      timeoutMs: 60_000,
    }
  );
  if (!result || !Array.isArray(result.data)) {
    throw new Error("Departments response was empty. Please retry.");
  }
  return result.data;
}

export function useDepartmentsQuery(options?: {
  enabled?: boolean;
}): UseQueryResult<DepartmentDTO[], Error> {
  return useQuery({
    queryKey: departmentQueryKeys.list(),
    queryFn: () => fetchDepartments(),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    // Remote DB + pool contention can stretch the first list call; one retry
    // is enough — multi-retry with a 60s client timeout looked like an empty dropdown.
    retry: 1,
    enabled: options?.enabled ?? true,
  });
}

export function useCreateDepartmentMutation(): UseMutationResult<
  DepartmentDTO,
  Error,
  CreateDepartmentPayload
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const result = await fetchJson<ApiResponse<DepartmentDTO>>(
        "/api/departments",
        { method: "POST", body: JSON.stringify(payload) }
      );
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: departmentQueryKeys.all });
    },
  });
}

export function useUpdateDepartmentMutation(): UseMutationResult<
  DepartmentDTO,
  Error,
  { id: string; payload: UpdateDepartmentPayload }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }) => {
      const result = await fetchJson<ApiResponse<DepartmentDTO>>(
        `/api/departments/${id}`,
        { method: "PATCH", body: JSON.stringify(payload) }
      );
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: departmentQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: userQueryKeys.all });
    },
  });
}

export function useDeleteDepartmentMutation(): UseMutationResult<
  void,
  Error,
  string
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      await fetchJson(`/api/departments/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: departmentQueryKeys.all });
    },
  });
}
