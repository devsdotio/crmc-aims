"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  Check,
  Edit3,
  Mail,
  Plus,
  Printer,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserX,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { DepartmentDTO } from "@/features/departments/client";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { SandboxBadge } from "@/components/shared/sandbox-badge";
import { IndividualDepartmentPrintableReport } from "@/components/reports/print/individual/IndividualDepartmentPrintableReport";

export interface DepartmentsSectionProps {
  departments: DepartmentDTO[];
  onSave: (input: {
    id?: string;
    code: string;
    name: string;
    isSandbox?: boolean;
  }) => Promise<void>;
  onDelete: (department: DepartmentDTO) => Promise<void>;
}

type AccountFilter = "all" | "has_account" | "no_account";

export function DepartmentsSection({
  departments,
  onSave,
  onDelete,
}: DepartmentsSectionProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<DepartmentDTO | null>(null);
  const [printDepartment, setPrintDepartment] = useState<DepartmentDTO | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [accountFilter, setAccountFilter] = useState<AccountFilter>("all");

  const handlePrintDossier = (dept: DepartmentDTO) => {
    setPrintDepartment(dept);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  // Metric summaries
  const totalCount = departments.length;
  const withAccountCount = useMemo(
    () => departments.filter((d) => Boolean(d.accountUserId)).length,
    [departments],
  );
  const noAccountCount = totalCount - withAccountCount;
  const activeAccountCount = useMemo(
    () =>
      departments.filter(
        (d) => Boolean(d.accountUserId) && d.accountStatus === "active",
      ).length,
    [departments],
  );

  // Filtered List
  const filteredDepartments = useMemo(() => {
    return departments.filter((dept) => {
      const hasAccount = Boolean(dept.accountUserId);
      if (accountFilter === "has_account" && !hasAccount) return false;
      if (accountFilter === "no_account" && hasAccount) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = dept.name.toLowerCase().includes(q);
        const matchCode = dept.code.toLowerCase().includes(q);
        const matchEmail = dept.accountEmail?.toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchEmail) return false;
      }

      return true;
    });
  }, [departments, accountFilter, searchQuery]);

  return (
    <>
      <div className="w-full space-y-6 print:hidden">
      {/* ── KPI Metric Cards ────────────────────────────────────────── */}
      <StatCardGrid>
        <StatCard
          title="Total Departments"
          sublabel="OFFICES // UNITS"
          value={totalCount}
          icon={Building2}
          tone="blue"
          badge={{ text: "Campuses & Units", pulse: true }}
          subtitle="Academic & administrative departments"
        />

        <StatCard
          title="Linked Logins"
          sublabel="SECURITY // CREDENTIALS"
          value={withAccountCount}
          icon={UserCheck}
          tone="emerald"
          toneValue={true}
          badge={
            totalCount > 0
              ? `${Math.round((withAccountCount / totalCount) * 100)}% equipped`
              : "0%"
          }
          subtitle="Offices equipped with portal access"
          progress={{
            value: withAccountCount,
            max: totalCount || 1,
          }}
        />

        <StatCard
          title="Pending Setup"
          sublabel="ACCESS // SETUP"
          value={noAccountCount}
          icon={UserX}
          tone="amber"
          toneValue={noAccountCount > 0}
          badge={noAccountCount > 0 ? "Setup Required" : "All Assigned"}
          subtitle="Offices waiting for borrower logins"
        />

        <StatCard
          title="Active In Circulation"
          sublabel="CIRCULATION // LOANS"
          value={activeAccountCount}
          icon={ShieldCheck}
          tone="purple"
          toneValue={true}
          badge="Eligible"
          subtitle="Offices permitted to borrow assets"
        />
      </StatCardGrid>

      {/* ── Control Bar (Search, Filter Tabs, Add Button) ─────────── */}
      <div className="p-4 rounded-2xl border border-border bg-bg shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, code, or email..."
            className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-border bg-bg text-text placeholder:text-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-bg-subtle text-text-secondary cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Tab Filter & Add Action */}
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-between md:justify-end shrink-0">
          <div className="flex items-center p-1 rounded-xl bg-bg-subtle border border-border text-xs font-medium">
            <button
              type="button"
              onClick={() => setAccountFilter("all")}
              className={cn(
                "px-3 py-1.5 rounded-lg transition-colors duration-150 cursor-pointer text-xs font-semibold whitespace-nowrap",
                accountFilter === "all"
                  ? "bg-bg text-text shadow-2xs"
                  : "text-text-secondary hover:text-text",
              )}
            >
              All ({totalCount})
            </button>
            <button
              type="button"
              onClick={() => setAccountFilter("has_account")}
              className={cn(
                "px-3 py-1.5 rounded-lg transition-colors duration-150 cursor-pointer text-xs font-semibold whitespace-nowrap",
                accountFilter === "has_account"
                  ? "bg-bg text-text shadow-2xs"
                  : "text-text-secondary hover:text-text",
              )}
            >
              With Login ({withAccountCount})
            </button>
            <button
              type="button"
              onClick={() => setAccountFilter("no_account")}
              className={cn(
                "px-3 py-1.5 rounded-lg transition-colors duration-150 cursor-pointer text-xs font-semibold whitespace-nowrap",
                accountFilter === "no_account"
                  ? "bg-bg text-text shadow-2xs"
                  : "text-text-secondary hover:text-text",
              )}
            >
              No Login ({noAccountCount})
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setEditTarget(null);
              setDialogOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:opacity-90 active:scale-95 transition-opacity cursor-pointer shadow-xs shrink-0 whitespace-nowrap"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            <span>Add Department</span>
          </button>
        </div>
      </div>

      {/* ── Departments Cards Grid ────────────────────────────────── */}
      {filteredDepartments.length === 0 ? (
        <div className="p-12 text-center bg-bg rounded-2xl border border-dashed border-border flex flex-col items-center justify-center">
          <div className="h-12 w-12 rounded-2xl bg-bg-subtle flex items-center justify-center text-text-secondary mb-3">
            <Building2 className="h-6 w-6" />
          </div>
          <p className="text-sm font-bold text-text">No departments found</p>
          <p className="text-xs text-text-secondary mt-1 max-w-sm">
            {searchQuery
              ? `No departments match "${searchQuery}". Try a different keyword.`
              : "No departments registered yet."}
          </p>
          <button
            type="button"
            onClick={() => {
              setEditTarget(null);
              setDialogOpen(true);
            }}
            className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            Create Department
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
          {filteredDepartments.map((dept) => {
            const hasAccount = Boolean(dept.accountUserId);
            const isDeactivated = dept.accountStatus === "deactivated";

            return (
              <div
                key={dept.id}
                className="group relative flex flex-col justify-between gap-3 p-4 bg-bg rounded-xl border border-border transition-colors hover:border-primary/40 hover:shadow-xs"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/5 text-primary shrink-0 transition-transform duration-150 group-hover:scale-105">
                      <Building2 className="h-5 w-5" />
                    </span>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-text truncate">
                          {dept.name}
                        </span>
                        {dept.isSandbox && <SandboxBadge />}
                        <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-bg-subtle text-text-secondary border border-border shrink-0">
                          {dept.code}
                        </span>
                      </div>

                      {/* Login Status */}
                      <div className="mt-1.5 flex items-center gap-1.5">
                        {hasAccount ? (
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md truncate",
                              isDeactivated
                                ? "bg-red-50 text-red-700 border border-red-200"
                                : "bg-emerald-50 text-emerald-700 border border-emerald-200",
                            )}
                          >
                            <Mail className="h-3 w-3 shrink-0" />
                            <span className="truncate">{dept.accountEmail}</span>
                            {isDeactivated && (
                              <span className="text-[10px] text-red-500 font-bold ml-0.5">
                                (deactivated)
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-[11px] font-medium text-text-secondary/70 bg-bg-subtle px-2 py-0.5 rounded-md">
                            No department login linked
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => handlePrintDossier(dept)}
                      aria-label={`Print dossier for ${dept.name}`}
                      title="Print Department Dossier (PDF)"
                      className="p-2 rounded-lg border border-border bg-bg text-text-secondary hover:text-text hover:border-primary/50 hover:bg-bg-subtle transition-all cursor-pointer shadow-2xs"
                    >
                      <Printer className="h-3.5 w-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setEditTarget(dept);
                        setDialogOpen(true);
                      }}
                      aria-label={`Edit ${dept.name}`}
                      title="Edit department"
                      className="p-2 rounded-lg border border-border bg-bg text-text-secondary hover:text-text hover:border-primary/50 hover:bg-bg-subtle transition-all cursor-pointer shadow-2xs"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => void onDelete(dept)}
                      disabled={hasAccount}
                      title={
                        hasAccount
                          ? "Deactivate or reassign the department account before deleting."
                          : `Delete ${dept.name}`
                      }
                      aria-label={`Delete ${dept.name}`}
                      className="p-2 rounded-lg border border-border bg-bg text-text-secondary hover:border-status-retired-bg hover:text-status-retired-text hover:bg-red-50/50 transition-all cursor-pointer shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Footer status line */}
                <div className="flex items-center justify-between pt-2 border-t border-border/60 text-xs">
                  <span className="text-text-secondary text-[11px] font-medium">
                    Account Status
                  </span>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 font-semibold text-xs",
                      hasAccount
                        ? isDeactivated
                          ? "text-red-600"
                          : "text-emerald-600"
                        : "text-amber-600",
                    )}
                  >
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        hasAccount
                          ? isDeactivated
                            ? "bg-red-500"
                            : "bg-emerald-500"
                          : "bg-amber-500",
                      )}
                    />
                    <span>
                      {hasAccount
                        ? isDeactivated
                          ? "Deactivated"
                          : "Active Custodian"
                        : "Pending Account"}
                    </span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Add / Edit Modal Dialog ───────────────────────────────── */}
      <DepartmentDialog
        isOpen={dialogOpen}
        department={editTarget}
        onClose={() => {
          setDialogOpen(false);
          setEditTarget(null);
        }}
        onSave={onSave}
      />
    </div>

    {printDepartment && (
      <div className="hidden print:block">
        <IndividualDepartmentPrintableReport department={printDepartment} />
      </div>
    )}
  </>
  );
}

function DepartmentDialog({
  isOpen,
  department,
  onClose,
  onSave,
}: {
  isOpen: boolean;
  department: DepartmentDTO | null;
  onClose: () => void;
  onSave: (input: { id?: string; code: string; name: string; isSandbox?: boolean }) => Promise<void>;
}) {
  const isEditing = Boolean(department);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [isSandbox, setIsSandbox] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setCode(department?.code ?? "");
    setName(department?.name ?? "");
    setIsSandbox(department?.isSandbox ?? false);
    setError("");
    setIsSubmitting(false);
  }, [isOpen, department]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen && !isSubmitting) onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Department name is required.");
      return;
    }
    if (!code.trim()) {
      setError("Department code is required.");
      return;
    }
    setIsSubmitting(true);
    setError("");
    try {
      await onSave({
        id: department?.id,
        code: code.trim().toUpperCase(),
        name: name.trim(),
        isSandbox,
      });
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save department.",
      );
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="absolute inset-0"
        onClick={isSubmitting ? undefined : onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="department-dialog-title"
        className="relative w-full max-w-md rounded-2xl border border-border bg-bg p-6 shadow-2xl z-10 space-y-5"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-primary/5 text-primary">
              <Building2 className="h-5 w-5" />
            </span>
            <div>
              <h3
                id="department-dialog-title"
                className="text-base font-bold text-text"
              >
                {isEditing ? "Edit Department" : "Add Department"}
              </h3>
              <p className="text-xs text-text-secondary mt-0.5">
                Define the office name and short unique code
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close"
            className="p-1.5 rounded-lg text-text-secondary hover:text-text hover:bg-bg-subtle cursor-pointer disabled:opacity-50 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="dept-name"
              className="block text-xs font-semibold text-text"
            >
              Department Name <span className="text-primary font-bold">*</span>
            </label>
            <input
              id="dept-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Information Technology Services"
              className="w-full h-10 px-3.5 text-xs bg-bg border border-border rounded-xl text-text placeholder:text-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="dept-code"
                className="block text-xs font-semibold text-text"
              >
                Department Code{" "}
                <span className="text-primary font-bold">*</span>
              </label>
              {code && (
                <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-bg-subtle text-text border border-border">
                  Preview: {code.toUpperCase()}
                </span>
              )}
            </div>
            <input
              id="dept-code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. ITS"
              maxLength={12}
              className="w-full h-10 px-3.5 text-xs bg-bg border border-border rounded-xl text-text font-mono font-semibold tracking-wider placeholder:text-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
            <p className="text-[11px] text-text-secondary">
              Short abbreviation used in requisition numbers and asset logs.
            </p>
          </div>

          <label className="flex items-start gap-2.5 rounded-xl border border-border bg-bg-subtle/50 p-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isSandbox}
              onChange={(e) => setIsSandbox(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-border"
            />
            <span>
              <span className="block text-xs font-semibold text-text">
                Sandbox (testing only)
              </span>
              <span className="block text-[11px] text-text-secondary mt-0.5">
                Hidden from normal users. Only visible to superadmin when “Show sandbox data” is on.
              </span>
            </span>
          </label>

          {error && (
            <p className="text-xs font-bold text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2.5 pt-2 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-text-secondary hover:text-text border border-border hover:bg-bg-subtle rounded-xl cursor-pointer disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:opacity-90 active:scale-95 cursor-pointer disabled:opacity-50 transition-all shadow-xs"
            >
              <Check className="h-3.5 w-3.5" />
              <span>
                {isSubmitting ? "Saving…" : isEditing ? "Save Changes" : "Create Department"}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
