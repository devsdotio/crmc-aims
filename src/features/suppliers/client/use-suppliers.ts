"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";

import type { Supplier } from "@/types/suppliers";
import {
  suppliersApi,
  type CreateSupplierPayload,
  type UpdateSupplierPayload,
} from "./suppliers-api";
import { supplierQueryKeys } from "./query-keys";

export function useSuppliersQuery(options?: {
  activeOnly?: boolean;
  /** When false, skip the request (e.g. until a dialog that needs suppliers opens). */
  enabled?: boolean;
}): UseQueryResult<Supplier[], Error> {
  return useQuery({
    queryKey: supplierQueryKeys.list({
      activeOnly: options?.activeOnly,
    }),
    queryFn: () =>
      suppliersApi.list({
        activeOnly: options?.activeOnly,
      }),
    enabled: options?.enabled ?? true,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useCreateSupplierMutation(): UseMutationResult<
  Supplier,
  Error,
  CreateSupplierPayload
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => suppliersApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: supplierQueryKeys.all });
    },
  });
}

export function useUpdateSupplierMutation(): UseMutationResult<
  Supplier,
  Error,
  { id: string; payload: UpdateSupplierPayload }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => suppliersApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: supplierQueryKeys.all });
    },
  });
}

export function useDeactivateSupplierMutation(): UseMutationResult<
  Supplier,
  Error,
  string
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => suppliersApi.deactivate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: supplierQueryKeys.all });
    },
  });
}
