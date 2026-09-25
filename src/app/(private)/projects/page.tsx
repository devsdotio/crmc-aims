"use client";

import { useMemo, useState } from "react";
import { FolderPlus, AlertCircle } from "lucide-react";
import type { Project, ProjectFilterState } from "@/types/projects";
import { ProjectFilters } from "@/components/projects/project-filters";
import { ProjectTable } from "@/components/projects/project-table";
import { ProjectDetailPanel } from "@/components/projects/project-detail-panel";
import {
  AddEditProjectDialog,
  type ProjectFormInput,
} from "@/components/projects/add-edit-project-dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useMeQuery } from "@/features/users/client";
import {
  useCreateProjectMutation,
  useDeleteProjectMutation,
  useProjectsProgressSummariesQuery,
  useProjectsQuery,
  useUpdateProjectMutation,
} from "@/features/projects/client";
import { useToast } from "@/components/providers/toast-context";

export default function ProjectsPage() {
  const { data: me, error: meError } = useMeQuery();
  const {
    data: projects = [],
    isLoading: projectsLoading,
    error: projectsError,
    isFetching,
  } = useProjectsQuery();
  const { data: progressRows = [] } = useProjectsProgressSummariesQuery({
    enabled: !projectsLoading,
  });
  const progressByProjectId = useMemo(() => {
    const map: Record<
      string,
      (typeof progressRows)[number]
    > = {};
    for (const row of progressRows) {
      map[row.projectId] = row;
    }
    return map;
  }, [progressRows]);

  const createProject = useCreateProjectMutation();
  const updateProject = useUpdateProjectMutation();
  const deleteProject = useDeleteProjectMutation();
  const toast = useToast();

  const isManager = me?.role === "superadmin" || me?.role === "admin";
  const isLoading = projectsLoading;

  const [filters, setFilters] = useState<ProjectFilterState>({
    searchQuery: "",
    status: "all",
  });
  const [selected, setSelected] = useState<Project | null>(null);
  const [editTarget, setEditTarget] = useState<Project | null | undefined>(
    undefined
  );
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      if (filters.searchQuery?.trim()) {
        const q = filters.searchQuery.toLowerCase();
        const hay = [
          p.name,
          p.projectCode,
          p.location ?? "",
          p.department ?? "",
          p.description ?? "",
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filters.status && filters.status !== "all" && p.status !== filters.status) {
        return false;
      }
      return true;
    });
  }, [projects, filters]);

  const selectedSynced = useMemo(() => {
    if (!selected) return null;
    return projects.find((p) => p.id === selected.id) ?? selected;
  }, [projects, selected]);

  const dialogOpen = editTarget !== undefined;
  const dialogProject = editTarget ?? null;

  const loadError =
    meError?.message ||
    projectsError?.message ||
    pageError ||
    (me && !isManager
      ? "Only admins can manage projects."
      : null);

  const handleFilterChange = (updated: Partial<ProjectFilterState>) => {
    setFilters((prev) => ({ ...prev, ...updated }));
  };

  const handleResetFilters = () => {
    setFilters({ searchQuery: "", status: "all" });
  };

  const handleSubmit = async (input: ProjectFormInput) => {
    setPageError(null);
    const payload = {
      name: input.name,
      description: input.description || null,
      status: input.status,
      location: input.location || null,
      department: input.department || null,
      startDate: input.startDate || null,
      endDate: input.endDate || null,
      notes: input.notes || null,
    };

    try {
      if (dialogProject) {
        const saved = await updateProject.mutateAsync({
          id: dialogProject.id,
          payload,
        });
        setSelected((prev) => (prev?.id === saved.id ? saved : prev));
        toast.success("Project updated successfully.");
      } else {
        await createProject.mutateAsync(payload);
        toast.success("Project created successfully.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save project.");
      throw err;
    }
  };

  const handleDelete = (project: Project) => {
    setDeleteTarget(project);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setPageError(null);
    try {
      await deleteProject.mutateAsync(deleteTarget.id);
      setSelected((prev) => (prev?.id === deleteTarget.id ? null : prev));
      toast.success(`Project "${deleteTarget.name}" deleted.`);
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete project.");
    }
  };

  return (
    <div
      className="h-full flex flex-col min-h-0 overflow-hidden bg-bg-subtle rounded-md print:h-auto print:overflow-visible print:bg-white"
      data-theme="light"
    >
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden print:hidden">
        <div className="px-4 md:px-6 pt-5 pb-3 bg-bg shrink-0 flex flex-wrap items-center justify-between gap-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-text">
              Projects
            </h1>
            <span className="px-2 py-0.5 text-xs font-bold bg-bg-subtle text-text-secondary rounded-full border border-border">
              {isLoading
                ? "Loading projects…"
                : `${filtered.length} of ${projects.length}`}
              {isFetching && !isLoading ? " · updating…" : ""}
            </span>
          </div>
          <p className="text-xs text-text-secondary mt-0.5">
            Track work units, charge materials from inventory, assign assets, and log expenses.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setEditTarget(null)}
            disabled={Boolean(loadError) || !isManager}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FolderPlus className="h-4 w-4" strokeWidth={2.5} />
            Add Project
          </button>
        </div>
      </div>

      {loadError && (
        <div className="mx-4 md:mx-6 mt-3 flex items-start gap-2 rounded-lg border border-status-outofservice-bg/40 bg-status-outofservice-bg/10 px-3 py-2 text-xs text-status-outofservice-text">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{loadError}</span>
        </div>
      )}

      <ProjectFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        onResetFilters={handleResetFilters}
      />

      <main className="flex-1 overflow-y-auto min-h-0 bg-bg">
        <ProjectTable
          projects={filtered}
          progressByProjectId={progressByProjectId}
          loading={isLoading && !projectsError}
          deletingProjectId={
            deleteProject.isPending ? deleteProject.variables : null
          }
          onSelect={setSelected}
          onEdit={(p) => setEditTarget(p)}
          onDelete={handleDelete}
        />
      </main>
      </div>

      <ProjectDetailPanel
        project={selectedSynced}
        isOpen={Boolean(selectedSynced)}
        onClose={() => setSelected(null)}
        onEdit={(p) => {
          setSelected(null);
          setEditTarget(p);
        }}
      />

      <AddEditProjectDialog
        isOpen={dialogOpen}
        project={dialogProject}
        onClose={() => setEditTarget(undefined)}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Delete Project?"
        description={
          deleteTarget
            ? `Are you sure you want to delete project "${deleteTarget.name}" (${deleteTarget.projectCode})? This action cannot be undone.`
            : ""
        }
        confirmLabel="Delete Project"
        variant="destructive"
        isLoading={deleteProject.isPending}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
