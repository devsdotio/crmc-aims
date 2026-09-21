"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, QrCode, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useResolveScanMutation,
  useScanReleaseMutation,
  useScanReturnMutation,
} from "@/features/assets/client/use-assets";
import type { ScanResolveResult } from "@/features/assets/client/assets-api";
import { useDepartmentsQuery } from "@/features/departments/client";
import { useProjectsQuery } from "@/features/projects/client";
import { SearchableSelect } from "@/components/ui/searchable-select";

function nextWeek(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
}

type DestinationKind = "department" | "project";

export function ScanAssetDialog({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
}) {
  const [code, setCode] = useState("");
  const [resolved, setResolved] = useState<ScanResolveResult | null>(null);
  const [error, setError] = useState("");
  const [receivedBy, setReceivedBy] = useState("");
  const [destinationKind, setDestinationKind] =
    useState<DestinationKind>("department");
  const [departmentId, setDepartmentId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [expectedReturnDate, setExpectedReturnDate] = useState(nextWeek);
  const [condition, setCondition] = useState("good");
  const [flagMaintenance, setFlagMaintenance] = useState(false);

  const resolveMutation = useResolveScanMutation();
  const releaseMutation = useScanReleaseMutation();
  const returnMutation = useScanReturnMutation();
  const { data: departments = [] } = useDepartmentsQuery();
  const { data: projects = [] } = useProjectsQuery();

  const departmentOptions = useMemo(
    () =>
      departments.map((dept) => ({
        value: dept.id,
        label: dept.name,
        keywords: dept.code,
      })),
    [departments]
  );

  const projectOptions = useMemo(
    () =>
      projects.map((project) => ({
        value: project.id,
        label: `${project.projectCode} · ${project.name}`,
        keywords: project.projectCode,
      })),
    [projects]
  );

  const conditionOptions = useMemo(
    () => [
      { value: "good", label: "Good condition" },
      { value: "damaged", label: "Damaged" },
      { value: "needs_repair", label: "Needs repair" },
    ],
    []
  );

  const busy =
    resolveMutation.isPending ||
    releaseMutation.isPending ||
    returnMutation.isPending;

  const custodyKind = useMemo(() => {
    if (!resolved) return "borrow" as const;
    return resolved.asset.assignmentType === "assignable"
      ? ("assignment" as const)
      : ("borrow" as const);
  }, [resolved]);

  useEffect(() => {
    if (!isOpen) return;
    setCode("");
    setResolved(null);
    setError("");
    setReceivedBy("");
    setExpectedReturnDate(nextWeek());
    setCondition("good");
    setFlagMaintenance(false);
    setDepartmentId(departments[0]?.id ?? "");
    setProjectId(
      projects.find((p) => p.status !== "completed")?.id ?? projects[0]?.id ?? ""
    );
    setDestinationKind("department");
  }, [isOpen, departments, projects]);

  useEffect(() => {
    if (!resolved) return;
    setDestinationKind(
      resolved.asset.assignmentType === "assignable" ? "project" : "department"
    );
  }, [resolved]);

  if (!isOpen) return null;

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!code.trim()) {
      setError("Enter a QR payload or asset code.");
      return;
    }
    try {
      const result = await resolveMutation.mutateAsync(code.trim());
      setResolved(result);
    } catch (err) {
      setResolved(null);
      setError(err instanceof Error ? err.message : "Could not resolve that code.");
    }
  };

  const handleRelease = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolved) return;
    if (destinationKind === "department" && !departmentId) {
      setError("Select a department.");
      return;
    }
    if (destinationKind === "project" && !projectId) {
      setError("Select a project.");
      return;
    }
    if (custodyKind === "borrow" && !expectedReturnDate) {
      setError("Due date is required for borrowable assets.");
      return;
    }
    setError("");
    try {
      await releaseMutation.mutateAsync({
        code: resolved.code,
        custodyKind,
        departmentId:
          destinationKind === "department" ? departmentId : undefined,
        projectId: destinationKind === "project" ? projectId : undefined,
        borrowerName: receivedBy.trim() || undefined,
        expectedReturnDate:
          custodyKind === "borrow" ? expectedReturnDate : null,
      });
      onSuccess(`${resolved.asset.assetCode} released.`);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to release asset.");
    }
  };

  const handleReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolved) return;
    setError("");
    try {
      await returnMutation.mutateAsync({
        code: resolved.code,
        condition,
        flagMaintenance,
      });
      onSuccess(`${resolved.asset.assetCode} returned.`);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to return asset.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => !busy && onClose()}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="scan-asset-title"
        className="relative z-10 w-full max-w-md rounded-xl bg-bg border border-border shadow-xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <QrCode className="h-4 w-4 text-accent" />
            <h2 id="scan-asset-title" className="text-sm font-bold text-text">
              Scan asset code
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="p-1 rounded-md text-text-secondary hover:text-text hover:bg-bg-subtle"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <form onSubmit={handleResolve} className="space-y-2">
            <label htmlFor="scan-code" className="block text-xs font-bold text-text">
              QR payload or asset code
            </label>
            <div className="flex gap-2">
              <input
                id="scan-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="CRMC-AIMS:AST-0001"
                className="flex-1 h-9 px-3 text-xs bg-bg border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-accent font-mono"
              />
              <button
                type="submit"
                disabled={busy}
                className="inline-flex items-center gap-1.5 px-3 h-9 text-xs font-bold rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-60"
              >
                {resolveMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : null}
                Lookup
              </button>
            </div>
          </form>

          {error && (
            <p className="text-xs font-semibold text-status-outofservice-text">{error}</p>
          )}

          {resolved && (
            <div className="rounded-lg border border-border bg-bg-subtle p-3 space-y-3">
              <div>
                <p className="text-sm font-bold text-text">{resolved.asset.name}</p>
                <p className="text-xs font-mono text-text-secondary">{resolved.asset.assetCode}</p>
                <p className="text-[11px] text-text-secondary mt-1">
                  Suggested: <strong className="text-text">{resolved.suggestedAction}</strong>
                  {resolved.reason ? ` — ${resolved.reason}` : ""}
                </p>
              </div>

              {resolved.suggestedAction === "release" && (
                <form onSubmit={handleRelease} className="space-y-2">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setDestinationKind("department")}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border ${
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
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border ${
                        destinationKind === "project"
                          ? "border-primary bg-primary/5 text-text"
                          : "border-border text-text-secondary"
                      }`}
                    >
                      Project
                    </button>
                  </div>
                  {destinationKind === "department" ? (
                    <SearchableSelect
                      value={departmentId}
                      onValueChange={setDepartmentId}
                      options={departmentOptions}
                      placeholder="Type to find a department…"
                      emptyMessage="No departments available"
                    />
                  ) : (
                    <SearchableSelect
                      value={projectId}
                      onValueChange={setProjectId}
                      options={projectOptions}
                      placeholder="Type to find a project…"
                      emptyMessage="No projects available"
                    />
                  )}
                  <input
                    value={receivedBy}
                    onChange={(e) => setReceivedBy(e.target.value)}
                    placeholder="Received by (optional)"
                    className="w-full h-9 px-3 text-xs bg-bg border border-border rounded-lg"
                  />
                  {custodyKind === "borrow" && (
                    <input
                      type="date"
                      value={expectedReturnDate}
                      onChange={(e) => setExpectedReturnDate(e.target.value)}
                      className="w-full h-9 px-3 text-xs bg-bg border border-border rounded-lg"
                    />
                  )}
                  <button
                    type="submit"
                    disabled={busy}
                    className={cn(
                      "w-full h-9 text-xs font-bold rounded-lg bg-accent text-accent-foreground",
                      busy && "opacity-60"
                    )}
                  >
                    {releaseMutation.isPending ? "Releasing…" : "Release from scan"}
                  </button>
                </form>
              )}

              {resolved.suggestedAction === "return" && (
                <form onSubmit={handleReturn} className="space-y-2">
                  <SearchableSelect
                    value={condition}
                    onValueChange={setCondition}
                    options={conditionOptions}
                    placeholder="Type to find a condition…"
                  />
                  <label className="flex items-center gap-2 text-xs text-text">
                    <input
                      type="checkbox"
                      checked={flagMaintenance}
                      onChange={(e) => setFlagMaintenance(e.target.checked)}
                    />
                    Flag for maintenance
                  </label>
                  <button
                    type="submit"
                    disabled={busy}
                    className={cn(
                      "w-full h-9 text-xs font-bold rounded-lg bg-accent text-accent-foreground",
                      busy && "opacity-60"
                    )}
                  >
                    {returnMutation.isPending ? "Returning…" : "Return from scan"}
                  </button>
                </form>
              )}

              {(resolved.suggestedAction === "project" ||
                resolved.suggestedAction === "blocked") && (
                <p className="text-xs text-text-secondary">
                  This unit cannot be released or returned from the scanner. Use Projects or the asset record instead.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
