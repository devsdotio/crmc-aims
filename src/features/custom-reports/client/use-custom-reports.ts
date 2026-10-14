"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  CustomReportColumnKey,
  CustomReportDataset,
  CustomReportFilters,
  CustomReportLayoutBlock,
} from "@/types/custom-reports";
import {
  createCustomReportTemplate,
  deleteCustomReportTemplate,
  fetchCustomReportDatasets,
  fetchCustomReportTemplate,
  fetchCustomReportTemplates,
  runCustomReport,
  updateCustomReportTemplate,
} from "./custom-reports-api";

export const customReportKeys = {
  all: ["custom-reports"] as const,
  datasets: () => [...customReportKeys.all, "datasets"] as const,
  templates: () => [...customReportKeys.all, "templates"] as const,
  template: (id: string) => [...customReportKeys.all, "template", id] as const,
};

export function useCustomReportDatasetsQuery() {
  return useQuery({
    queryKey: customReportKeys.datasets(),
    queryFn: fetchCustomReportDatasets,
    staleTime: 60_000,
  });
}

export function useCustomReportTemplatesQuery() {
  return useQuery({
    queryKey: customReportKeys.templates(),
    queryFn: fetchCustomReportTemplates,
  });
}

export function useCustomReportTemplateQuery(id: string | undefined) {
  return useQuery({
    queryKey: customReportKeys.template(id ?? ""),
    queryFn: () => fetchCustomReportTemplate(id!),
    enabled: Boolean(id),
  });
}

export function useCreateCustomReportTemplateMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createCustomReportTemplate,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: customReportKeys.templates() });
    },
  });
}

export function useUpdateCustomReportTemplateMutation(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (
      body: Partial<{
        name: string;
        description: string | null;
        dataset: CustomReportDataset;
        columns: CustomReportColumnKey[];
        defaultFilters: CustomReportFilters;
        layout: CustomReportLayoutBlock[];
      }>
    ) => updateCustomReportTemplate(id, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: customReportKeys.templates() });
      void qc.invalidateQueries({ queryKey: customReportKeys.template(id) });
    },
  });
}

export function useDeleteCustomReportTemplateMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteCustomReportTemplate,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: customReportKeys.templates() });
    },
  });
}

export function useRunCustomReportMutation() {
  return useMutation({
    mutationFn: runCustomReport,
  });
}
