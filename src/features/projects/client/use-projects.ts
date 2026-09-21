"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";

import type {
  Project,
  ProjectAssetAssignment,
  ProjectExpenseLine,
  ProjectProgressIndicator,
  ProjectProgressSummary,
} from "@/types/projects";
import {
  projectsApi,
  type AssignProjectAssetPayload,
  type BatchManualMaterialsPayload,
  type CreateIndicatorPayload,
  type CreateProjectExpensePayload,
  type CreateProjectPayload,
  type ReportProjectAssetDamagePayload,
  type ReturnProjectAssetPayload,
  type UpdateIndicatorPayload,
  type UpdateProjectExpensePayload,
  type UpdateProjectPayload,
  type UseProjectMaterialPayload,
} from "./projects-api";

import { projectQueryKeys } from "./query-keys";
import {
  CUSTODY_DOMAINS,
  STOCK_DOMAINS,
  invalidateDomains,
  type CacheDomain,
} from "@/features/shared/cache-invalidation";
import type { ProjectAssetDamageReport } from "./projects-api";

/** Plain project/expense bookkeeping that touches no other domain. */
const PROJECT_DOMAINS = [
  "projects",
  "auditLogs",
] as const satisfies readonly CacheDomain[];

/** Drawing or reversing materials moves consumable stock and lots. */
const PROJECT_MATERIAL_DOMAINS = [
  ...PROJECT_DOMAINS,
  ...STOCK_DOMAINS,
] as const satisfies readonly CacheDomain[];

/** Writing an asset off also opens a maintenance log and an expense line. */
const PROJECT_DAMAGE_DOMAINS = [
  ...PROJECT_DOMAINS,
  "assets",
  "maintenance",
  "dashboard",
] as const satisfies readonly CacheDomain[];

export function useProjectsQuery(options?: {
  enabled?: boolean;
}): UseQueryResult<Project[], Error> {
  return useQuery({
    queryKey: projectQueryKeys.list(),
    queryFn: () => projectsApi.list(),
    enabled: options?.enabled ?? true,
  });
}

export function useProjectExpensesQuery(
  projectId: string | null | undefined
): UseQueryResult<ProjectExpenseLine[], Error> {
  return useQuery({
    queryKey: projectQueryKeys.expenses(projectId ?? ""),
    queryFn: () => projectsApi.listExpenses(projectId!),
    enabled: Boolean(projectId),
  });
}

export function useCreateProjectMutation(): UseMutationResult<
  Project,
  Error,
  CreateProjectPayload
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => projectsApi.create(payload),
    onSettled: () => {
      void invalidateDomains(queryClient, PROJECT_DOMAINS);
    },
  });
}

export function useUpdateProjectMutation(): UseMutationResult<
  Project,
  Error,
  { id: string; payload: UpdateProjectPayload }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }) => projectsApi.update(id, payload),
    onSettled: () => {
      void invalidateDomains(queryClient, PROJECT_DOMAINS);
    },
  });
}

export function useDeleteProjectMutation(): UseMutationResult<
  void,
  Error,
  string
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => projectsApi.delete(id),
    onSettled: () => {
      void invalidateDomains(queryClient, PROJECT_DOMAINS);
    },
  });
}

export function useCreateProjectExpenseMutation(): UseMutationResult<
  ProjectExpenseLine,
  Error,
  { projectId: string; payload: CreateProjectExpensePayload }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, payload }) =>
      projectsApi.createExpense(projectId, payload),
    onSettled: () => {
      void invalidateDomains(queryClient, PROJECT_DOMAINS);
    },
  });
}

export function useProjectMaterialMutation(): UseMutationResult<
  ProjectExpenseLine,
  Error,
  { projectId: string; payload: UseProjectMaterialPayload }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, payload }) =>
      projectsApi.useMaterial(projectId, payload),
    onSettled: () => {
      void invalidateDomains(queryClient, PROJECT_MATERIAL_DOMAINS);
    },
  });
}

export function useUpdateProjectExpenseMutation(): UseMutationResult<
  ProjectExpenseLine,
  Error,
  {
    projectId: string;
    expenseId: string;
    payload: UpdateProjectExpensePayload;
  }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, expenseId, payload }) =>
      projectsApi.updateExpense(projectId, expenseId, payload),
    onSettled: () => {
      void invalidateDomains(queryClient, PROJECT_DOMAINS);
    },
  });
}

export function useDeleteProjectExpenseMutation(): UseMutationResult<
  void,
  Error,
  { projectId: string; expenseId: string }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, expenseId }) =>
      projectsApi.deleteExpense(projectId, expenseId),
    onMutate: async ({ projectId, expenseId }) => {
      const key = projectQueryKeys.expenses(projectId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<ProjectExpenseLine[]>(key);
      if (previous) {
        queryClient.setQueryData<ProjectExpenseLine[]>(
          key,
          previous.filter((line) => line.id !== expenseId)
        );
      }
      return { previous, projectId };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          projectQueryKeys.expenses(context.projectId),
          context.previous
        );
      }
    },
    onSettled: () => {
      void invalidateDomains(queryClient, PROJECT_MATERIAL_DOMAINS);
    },
  });
}

export function useProjectAssetsQuery(
  projectId: string | null | undefined,
  status?: "assigned" | "returned" | "written_off" | "all"
): UseQueryResult<ProjectAssetAssignment[], Error> {
  return useQuery({
    queryKey: projectQueryKeys.assets(projectId ?? "", status),
    queryFn: () => projectsApi.listAssets(projectId!, status),
    enabled: Boolean(projectId),
  });
}

export function useAssignProjectAssetMutation(): UseMutationResult<
  ProjectAssetAssignment,
  Error,
  { projectId: string } & AssignProjectAssetPayload
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, ...payload }) =>
      projectsApi.assignAsset(projectId, payload),
    onSettled: () => {
      void invalidateDomains(queryClient, CUSTODY_DOMAINS);
    },
  });
}

export function useReturnProjectAssetMutation(): UseMutationResult<
  ProjectAssetAssignment,
  Error,
  { projectId: string; assignmentId: string } & ReturnProjectAssetPayload
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, assignmentId, notes }) =>
      projectsApi.returnAsset(projectId, assignmentId, { notes }),
    onSettled: () => {
      void invalidateDomains(queryClient, CUSTODY_DOMAINS);
    },
  });
}

export function useReportProjectAssetDamageMutation(): UseMutationResult<
  ProjectAssetDamageReport,
  Error,
  {
    projectId: string;
    assignmentId: string;
  } & ReportProjectAssetDamagePayload
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, assignmentId, ...payload }) =>
      projectsApi.reportAssetDamage(projectId, assignmentId, payload),
    onSettled: () => {
      void invalidateDomains(queryClient, PROJECT_DAMAGE_DOMAINS);
    },
  });
}

export function useCreateBatchManualMaterialsMutation(): UseMutationResult<
  ProjectExpenseLine[],
  Error,
  { projectId: string; payload: BatchManualMaterialsPayload }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, payload }) =>
      projectsApi.createBatchMaterials(projectId, payload),
    onSettled: () => {
      void invalidateDomains(queryClient, PROJECT_DOMAINS);
    },
  });
}

export function useProjectProgressQuery(
  projectId: string | null | undefined
): UseQueryResult<ProjectProgressSummary, Error> {
  return useQuery({
    queryKey: projectQueryKeys.progress(projectId ?? ""),
    queryFn: () => projectsApi.getProgress(projectId!),
    enabled: Boolean(projectId),
  });
}

export function useCreateIndicatorMutation(): UseMutationResult<
  ProjectProgressIndicator,
  Error,
  { projectId: string; payload: CreateIndicatorPayload }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, payload }) =>
      projectsApi.createIndicator(projectId, payload),
    onSettled: (_data, _err, { projectId }) => {
      void queryClient.invalidateQueries({
        queryKey: projectQueryKeys.progress(projectId),
      });
      void invalidateDomains(queryClient, PROJECT_DOMAINS);
    },
  });
}

export function useUpdateIndicatorMutation(): UseMutationResult<
  ProjectProgressIndicator,
  Error,
  {
    projectId: string;
    indicatorId: string;
    payload: UpdateIndicatorPayload;
  }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, indicatorId, payload }) =>
      projectsApi.updateIndicator(projectId, indicatorId, payload),
    onSettled: (_data, _err, { projectId }) => {
      void queryClient.invalidateQueries({
        queryKey: projectQueryKeys.progress(projectId),
      });
      void invalidateDomains(queryClient, PROJECT_DOMAINS);
    },
  });
}

export function useToggleIndicatorMutation(): UseMutationResult<
  ProjectProgressIndicator,
  Error,
  {
    projectId: string;
    indicatorId: string;
    isCompleted: boolean;
  }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, indicatorId, isCompleted }) =>
      projectsApi.toggleIndicator(projectId, indicatorId, isCompleted),
    onSettled: (_data, _err, { projectId }) => {
      void queryClient.invalidateQueries({
        queryKey: projectQueryKeys.progress(projectId),
      });
      void invalidateDomains(queryClient, PROJECT_DOMAINS);
    },
  });
}

export function useDeleteIndicatorMutation(): UseMutationResult<
  void,
  Error,
  {
    projectId: string;
    indicatorId: string;
  }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, indicatorId }) =>
      projectsApi.deleteIndicator(projectId, indicatorId),
    onSettled: (_data, _err, { projectId }) => {
      void queryClient.invalidateQueries({
        queryKey: projectQueryKeys.progress(projectId),
      });
      void invalidateDomains(queryClient, PROJECT_DOMAINS);
    },
  });
}

