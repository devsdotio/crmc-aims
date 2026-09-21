"use client";

import { useEffect, useMemo, useState } from "react";
import { PackageMinus, X } from "lucide-react";
import type { Asset } from "@/types/assets";
import { useReleaseAssetMutation } from "@/features/assets/client/use-assets";
import { useDepartmentsQuery } from "@/features/departments/client";
import { useProjectsQuery } from "@/features/projects/client";
import { SearchableSelect } from "@/components/ui/searchable-select";

export interface IssueAssetDialogProps {
  asset: Asset | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (message: string) => void;
}

type DestinationKind = "department" | "project";

export function IssueAssetDialog({
  asset,
  isOpen,
  onClose,
  onSuccess,
}: IssueAssetDialogProps) {
  const releaseMutation = useReleaseAssetMutation();
  const { data: departments = [] } = useDepartmentsQuery();
  const { data: projects = [] } = useProjectsQuery();

  const [destinationKind, setDestinationKind] =
    useState<DestinationKind>("department");
  const [departmentId, setDepartmentId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [requestedByName, setRequestedByName] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const custodyKind = useMemo(() => {
    if (!asset) return "borrow" as const;
    return asset.assignmentType === "assignable" ? "assignment" : "borrow";
  }, [asset]);

  const departmentOptions = useMemo(
    () =>
      departments.map((d) => ({
        value: d.id,
        label: `${d.name} (${d.code})`,
        keywords: d.code,
      })),
    [departments]
  );

  const projectOptions = useMemo(
    () =>
      projects.map((p) => ({
        value: p.id,
        label: `${p.name} (${p.projectCode})`,
        keywords: p.projectCode,
      })),
    [projects]
  );

  useEffect(() => {
    if (!isOpen) return;
    setError("");
    setRequestedByName("");
    setNotes("");
    setDueDate("");
    setDepartmentId(departments[0]?.id ?? "");
    setProjectId(
      projects.find((p) => p.status !== "completed")?.id ?? projects[0]?.id ?? ""
    );
    setDestinationKind(asset?.assignmentType === "assignable" ? "project" : "department");
  }, [isOpen, asset, departments, projects]);

  if (!isOpen || !asset) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (destinationKind === "department" && !departmentId) {
      setError("Select a department.");
      return;
    }
    if (destinationKind === "project" && !projectId) {
      setError("Select a project.");
      return;
    }
    if (custodyKind === "borrow" && !dueDate) {
      setError("Due date is required for borrowable assets.");
      return;
    }

    try {
      await releaseMutation.mutateAsync({
        id: asset.id,
        payload: {
          custodyKind,
          departmentId:
            destinationKind === "department" ? departmentId : undefined,
          projectId: destinationKind === "project" ? projectId : undefined,
          expectedReturnDate: custodyKind === "borrow" ? dueDate : null,
          requestedByName: requestedByName.trim() || undefined,
          notes: notes.trim() || undefined,
        },
      });
      onSuccess?.(`${asset.assetCode} issued successfully.`);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Issue failed.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => !releaseMutation.isPending && onClose()}
      />
      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="relative z-10 w-full max-w-md rounded-xl border border-border bg-bg shadow-xl"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="text-sm font-bold text-text">Issue asset</h2>
            <p className="text-xs text-text-secondary mt-0.5 font-mono">
              {asset.assetCode} · {custodyKind === "borrow" ? "Borrow" : "Assign"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-bg-subtle text-text-secondary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-xs text-text-secondary">
            Manual issue from on-hand stock. Destination is exactly one department or project.
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setDestinationKind("department")}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg border ${
                destinationKind === "department"
                  ? "border-primary bg-primary/5 text-text"
                  : "border-border text-text-secondary"
              }`}
            >
              Department
            </button>
            <button
              type="button"
              onClick={() => setDestinationKind("project")}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg border ${
                destinationKind === "project"
                  ? "border-primary bg-primary/5 text-text"
                  : "border-border text-text-secondary"
              }`}
            >
              Project
            </button>
          </div>

          {destinationKind === "department" ? (
            <label className="block space-y-1">
              <span className="text-[11px] font-bold uppercase text-text-secondary">
                Department
              </span>
              <SearchableSelect
                id="issue-department"
                value={departmentId}
                onValueChange={setDepartmentId}
                options={departmentOptions}
                placeholder="Type to find a department…"
                emptyMessage="No departments available"
                inputClassName="text-sm font-normal"
              />
            </label>
          ) : (
            <label className="block space-y-1">
              <span className="text-[11px] font-bold uppercase text-text-secondary">
                Project
              </span>
              <SearchableSelect
                id="issue-project"
                value={projectId}
                onValueChange={setProjectId}
                options={projectOptions}
                placeholder="Type to find a project…"
                emptyMessage="No projects available"
                inputClassName="text-sm font-normal"
              />
            </label>
          )}

          {custodyKind === "borrow" && (
            <label className="block space-y-1">
              <span className="text-[11px] font-bold uppercase text-text-secondary">
                Due date
              </span>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full h-9 px-3 text-sm border border-border rounded-lg bg-bg"
                required
              />
            </label>
          )}

          <label className="block space-y-1">
            <span className="text-[11px] font-bold uppercase text-text-secondary">
              Requested by (optional)
            </span>
            <input
              value={requestedByName}
              onChange={(e) => setRequestedByName(e.target.value)}
              placeholder="Person on paper slip"
              className="w-full h-9 px-3 text-sm border border-border rounded-lg bg-bg"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-[11px] font-bold uppercase text-text-secondary">
              Notes
            </span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-bg resize-none"
            />
          </label>

          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}
        </div>

        <div className="px-5 py-4 border-t border-border flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={releaseMutation.isPending}
            className="px-4 py-2 text-xs font-semibold rounded-lg border border-border"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={
              releaseMutation.isPending ||
              asset.status !== "active" ||
              Boolean(asset.currentHolder)
            }
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-primary text-primary-foreground disabled:opacity-50"
          >
            <PackageMinus className="h-3.5 w-3.5" />
            {releaseMutation.isPending ? "Issuing…" : "Confirm issue"}
          </button>
        </div>
      </form>
    </div>
  );
}
