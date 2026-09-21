"use client";

import { useToast } from "@/components/providers/toast-context";
import { DepartmentsSection } from "@/components/settings/departments-section";
import { QueryErrorBanner } from "@/components/shared/query-error-banner";
import {
  useCreateDepartmentMutation,
  useDeleteDepartmentMutation,
  useDepartmentsQuery,
  useUpdateDepartmentMutation,
  type DepartmentDTO,
} from "@/features/departments/client";
import { Building2 } from "lucide-react";

export default function DepartmentsPage() {
  const {
    data: departments = [],
    isLoading: departmentsLoading,
    isError: departmentsError,
    error: departmentsErr,
    refetch: refetchDepartments,
  } = useDepartmentsQuery();

  const createDepartmentMutation = useCreateDepartmentMutation();
  const updateDepartmentMutation = useUpdateDepartmentMutation();
  const deleteDepartmentMutation = useDeleteDepartmentMutation();
  const toast = useToast();

  const handleSaveDepartment = async (input: {
    id?: string;
    code: string;
    name: string;
  }) => {
    if (input.id) {
      await updateDepartmentMutation.mutateAsync({
        id: input.id,
        payload: {
          code: input.code,
          name: input.name,
        },
      });
      toast.success("Department updated.");
    } else {
      await createDepartmentMutation.mutateAsync({
        code: input.code,
        name: input.name,
      });
      toast.success("Department created.");
    }
  };

  const handleDeleteDepartment = async (department: DepartmentDTO) => {
    if (department.accountUserId) return;
    if (!window.confirm(`Delete department “${department.name}”?`)) return;
    try {
      await deleteDepartmentMutation.mutateAsync(department.id);
      toast.success("Department deleted.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete department.",
      );
    }
  };

  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden bg-bg-subtle">
      {/* Top Header */}
      <div className="px-4 md:px-6 py-4 bg-bg shrink-0 border-b border-border flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-text">
                Departments
              </h1>
              <span className="px-2 py-0.5 text-xs font-bold bg-bg-subtle text-text-secondary rounded-full border border-border">
                {departmentsLoading
                  ? "Loading departments…"
                  : `${departments.length} department${departments.length === 1 ? "" : "s"}`}
              </span>
            </div>
            <p className="text-xs text-text-secondary mt-0.5">
              Create and manage offices that can receive issued items.
            </p>
          </div>
        </div>

      {/* Main Scoped Scroll Area */}
      <main className="flex-1 overflow-y-auto scrollbar-gutter-stable p-4 md:p-6 min-h-0">
        <div className="w-full space-y-6">
          {departmentsError ? (
            <QueryErrorBanner
              message={departmentsErr?.message || "Failed to load departments"}
              onRetry={() => void refetchDepartments()}
            />
          ) : null}

          {departmentsLoading ? (
            <div className="space-y-6 animate-pulse">
              <div className="h-96 rounded-2xl bg-bg border border-border" />
            </div>
          ) : (
            <DepartmentsSection
              departments={departments}
              onSave={handleSaveDepartment}
              onDelete={handleDeleteDepartment}
            />
          )}
        </div>
      </main>
    </div>
  );
}
