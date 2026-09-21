"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";

import type { UserAccount } from "@/types/users";
import {
  toUserAccount,
  usersApi,
  type ChangePasswordPayload,
  type CreateUserPayload,
  type MeProfile,
  type UpdateMePayload,
  type UpdateUserPayload,
} from "@/features/users/client/users-api";
import { userQueryKeys } from "@/features/users/client/query-keys";

export function useMeQuery(options?: {
  enabled?: boolean;
}): UseQueryResult<MeProfile, Error> {
  return useQuery({
    queryKey: userQueryKeys.me(),
    queryFn: () => usersApi.getMe(),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: options?.enabled ?? true,
  });
}

export function useUpdateMeMutation(): UseMutationResult<
  MeProfile,
  Error,
  UpdateMePayload
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => usersApi.updateMe(payload),
    onSuccess: (updated) => {
      queryClient.setQueryData(userQueryKeys.me(), updated);
      queryClient.invalidateQueries({ queryKey: userQueryKeys.all });
    },
  });
}

export function useChangePasswordMutation(): UseMutationResult<
  void,
  Error,
  ChangePasswordPayload
> {
  return useMutation({
    mutationFn: (payload) => usersApi.changePassword(payload),
  });
}

export function useUsersQuery(filters?: { tenantId?: string }): UseQueryResult<UserAccount[], Error> {
  return useQuery({
    queryKey: filters?.tenantId ? [...userQueryKeys.list(), filters.tenantId] : userQueryKeys.list(),
    queryFn: async () => {
      const profiles = await usersApi.listUsers(filters);
      return profiles.map(toUserAccount);
    },
  });
}

export function useCreateUserMutation(): UseMutationResult<
  UserAccount,
  Error,
  CreateUserPayload
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload) => {
      const created = await usersApi.createUser(payload);
      return toUserAccount(created);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userQueryKeys.all });
    },
  });
}

export function useUpdateUserMutation(): UseMutationResult<
  UserAccount,
  Error,
  { id: string; payload: UpdateUserPayload }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }) => {
      const updated = await usersApi.updateUser(id, payload);
      return toUserAccount(updated);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userQueryKeys.all });
    },
  });
}

export function useDeactivateUserMutation(): UseMutationResult<
  UserAccount,
  Error,
  string
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      const updated = await usersApi.deactivateUser(id);
      return toUserAccount(updated);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userQueryKeys.all });
    },
  });
}

export function useReactivateUserMutation(): UseMutationResult<
  UserAccount,
  Error,
  string
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      const updated = await usersApi.reactivateUser(id);
      return toUserAccount(updated);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userQueryKeys.all });
    },
  });
}
