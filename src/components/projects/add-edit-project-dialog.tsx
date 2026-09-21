"use client";

import { useEffect, useMemo, useState } from "react";
import {
  X,
  FolderPlus,
  Pencil,
  FolderKanban,
  MapPin,
  Building2,
  Calendar,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Project, ProjectStatus } from "@/types/projects";
import { PROJECT_STATUS_LABELS } from "@/types/projects";
import { useDepartmentsQuery } from "@/features/departments/client";
import { SearchableSelect } from "@/components/ui/searchable-select";

export type ProjectFormInput = {
  name: string;
  description: string;
  status: ProjectStatus;
  location: string;
  department: string;
  startDate: string;
  endDate: string;
  notes: string;
};

export interface AddEditProjectDialogProps {
  isOpen: boolean;
  project: Project | null;
  onClose: () => void;
  onSubmit: (input: ProjectFormInput) => void | Promise<void>;
}

function emptyForm(): ProjectFormInput {
  return {
    name: "",
    description: "",
    status: "active",
    location: "",
    department: "",
    startDate: "",
    endDate: "",
    notes: "",
  };
}

function fromProject(project: Project): ProjectFormInput {
  return {
    name: project.name,
    description: project.description ?? "",
    status: project.status,
    location: project.location ?? "",
    department: project.department ?? "",
    startDate: project.startDate ?? "",
    endDate: project.endDate ?? "",
    notes: project.notes ?? "",
  };
}

const MUTABLE_STATUSES: ProjectStatus[] = [
  "draft",
  "active",
  "on_hold",
  "completed",
  "cancelled",
];

export function AddEditProjectDialog({
  isOpen,
  project,
  onClose,
  onSubmit,
}: AddEditProjectDialogProps) {
  const isEdit = Boolean(project);
  const [form, setForm] = useState<ProjectFormInput>(emptyForm);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data: departments = [] } = useDepartmentsQuery({ enabled: isOpen });

  const departmentOptions = useMemo(
    () =>
      departments.map((dept) => ({
        value: dept.name,
        label: `${dept.code} — ${dept.name}`,
        keywords: dept.code,
      })),
    [departments]
  );

  useEffect(() => {
    if (!isOpen) return;
    setForm(project ? fromProject(project) : emptyForm());
    setError("");
    setIsSubmitting(false);
  }, [isOpen, project]);

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !isSubmitting) onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const handleChange = <K extends keyof ProjectFormInput>(
    key: K,
    value: ProjectFormInput[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Project name is required.");
      return;
    }
    if (form.startDate && form.endDate && form.endDate < form.startDate) {
      setError("End date cannot be earlier than start date.");
      return;
    }

    setIsSubmitting(true);
    setError("");
    try {
      await onSubmit({
        ...form,
        name: form.name.trim(),
        description: form.description.trim(),
        location: form.location.trim(),
        department: form.department.trim(),
        notes: form.notes.trim(),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save project.");
      setIsSubmitting(false);
    }
  };

  const fieldClass = cn(
    "w-full h-9 px-3 text-xs bg-bg-subtle border border-border rounded-lg text-text",
    "focus:outline-none focus:ring-2 focus:ring-accent focus:bg-bg transition-colors"
  );

  const labelClass = "block text-[11px] font-bold text-text-secondary mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div
        className="absolute inset-0"
        onClick={isSubmitting ? undefined : onClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-form-heading"
        className="relative w-full max-w-lg bg-bg border border-border rounded-xl shadow-2xl z-10 overflow-hidden my-4 animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-bg-subtle/50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 text-accent shrink-0">
              {isEdit ? (
                <Pencil className="h-4 w-4" />
              ) : (
                <FolderPlus className="h-4 w-4" />
              )}
            </div>
            <div>
              <h2
                id="project-form-heading"
                className="text-sm font-bold text-text"
              >
                {isEdit ? "Edit Project" : "Add Project"}
              </h2>
              <p className="text-[11px] font-mono text-text-secondary">
                {isEdit
                  ? project?.projectCode
                  : "Auto-generated: PRJ-YYYY-XXXX"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close"
            className="p-1.5 rounded-lg text-text-secondary hover:text-text hover:bg-border transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Project Name */}
          <div>
            <label htmlFor="project-name" className={labelClass}>
              Project name <span className="text-accent">*</span>
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-text-secondary">
                <FolderKanban className="h-4 w-4" />
              </span>
              <input
                id="project-name"
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
                className={cn(fieldClass, "pl-9")}
                placeholder="e.g. Room 204 renovation"
                autoFocus
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="project-description" className={labelClass}>
              Description
            </label>
            <textarea
              id="project-description"
              value={form.description}
              onChange={(e) => handleChange("description", e.target.value)}
              rows={2}
              className={cn(fieldClass, "h-auto py-2 resize-y min-h-16")}
              placeholder="Brief scope of work or project objectives…"
            />
          </div>

          {/* Status Pill Toggle */}
          <div>
            <label className={labelClass}>Status</label>
            <div className="flex flex-wrap gap-1.5 p-1 rounded-lg bg-bg-subtle border border-border">
              {MUTABLE_STATUSES.map((status) => {
                const isSelected = form.status === status;
                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => handleChange("status", status)}
                    className={cn(
                      "inline-flex items-center justify-center h-7 px-3 rounded-md text-[11px] font-bold transition-all cursor-pointer",
                      isSelected
                        ? "bg-accent text-accent-foreground shadow-2xs"
                        : "text-text-secondary hover:text-text hover:bg-bg"
                    )}
                  >
                    {PROJECT_STATUS_LABELS[status]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Location */}
          <div>
            <label htmlFor="project-location" className={labelClass}>
              Location
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-text-secondary">
                <MapPin className="h-3.5 w-3.5" />
              </span>
              <input
                id="project-location"
                value={form.location}
                onChange={(e) => handleChange("location", e.target.value)}
                className={cn(fieldClass, "pl-8.5")}
                placeholder="Building / Room"
              />
            </div>
          </div>

          {/* Department (optional, from settings registry) */}
          <div>
            <label htmlFor="project-department" className={labelClass}>
              Department <span className="font-normal text-text-secondary">(optional)</span>
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-text-secondary z-10">
                <Building2 className="h-3.5 w-3.5" />
              </span>
              <SearchableSelect
                id="project-department"
                value={form.department}
                onValueChange={(next) => handleChange("department", next)}
                options={departmentOptions}
                clearLabel="No department"
                placeholder="Type to find a department…"
                inputClassName="pl-8.5"
              />
            </div>
          </div>

          {/* Start and End Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="project-start" className={labelClass}>
                Start date
              </label>
              <div className="relative">
                <input
                  id="project-start"
                  type="date"
                  value={form.startDate}
                  onChange={(e) => handleChange("startDate", e.target.value)}
                  className={fieldClass}
                />
              </div>
            </div>
            <div>
              <label htmlFor="project-end" className={labelClass}>
                End date
              </label>
              <div className="relative">
                <input
                  id="project-end"
                  type="date"
                  value={form.endDate}
                  onChange={(e) => handleChange("endDate", e.target.value)}
                  className={fieldClass}
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="project-notes" className={labelClass}>
              Notes
            </label>
            <textarea
              id="project-notes"
              value={form.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              rows={2}
              className={cn(fieldClass, "h-auto py-2 resize-y min-h-14")}
              placeholder="Internal project references or memo details…"
            />
          </div>

          {form.status === "completed" && (
            <div className="flex items-start gap-2 text-[11px] text-status-repair-text bg-status-repair-bg/15 border border-status-repair-bg/30 rounded-lg p-2.5">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>Marking as completed will make this project read-only.</span>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 text-xs text-status-outofservice-text bg-status-outofservice-bg/10 border border-status-outofservice-bg/30 rounded-lg p-2.5">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Dialog Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-9 px-4 text-xs font-bold rounded-lg border border-border bg-bg text-text hover:bg-bg-subtle transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 h-9 px-4 text-xs font-bold rounded-lg bg-accent text-accent-foreground hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 shadow-xs"
            >
              {isSubmitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : isEdit ? (
                <Pencil className="h-3.5 w-3.5" />
              ) : (
                <FolderPlus className="h-3.5 w-3.5" />
              )}
              {isSubmitting
                ? "Saving…"
                : isEdit
                  ? "Save changes"
                  : "Create project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
