"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  FolderKanban,
  X,
  Pencil,
  MapPin,
  Building2,
  Calendar,
  Wallet,
  User,
  FileText,
  Package,
  PackageCheck,
  Receipt,
  Plus,
  Trash2,
  Lock,
  AlertTriangle,
  Boxes,
  Undo2,
  Wrench,
  PackagePlus,
  Printer,
  Flag,
  CheckCircle2,
  Clock,
  Check,
} from "lucide-react";
import { IndividualProjectPrintableReport } from "@/components/reports/print/individual/IndividualProjectPrintableReport";
import { cn } from "@/lib/utils";
import { LoadingState } from "@/components/providers/loading-context";
import type {
  Project,
  ProjectAssetAssignment,
  ProjectExpenseLine,
} from "@/types/projects";
import {
  expenseCategoryDisplay,
} from "@/types/projects";
import { ProjectStatusBadge } from "./project-status-badge";
import { formatPhp } from "./format-money";
import {
  useAssignProjectAssetMutation,
  useCreateBatchManualMaterialsMutation,
  useCreateIndicatorMutation,
  useCreateProjectExpenseMutation,
  useDeleteIndicatorMutation,
  useDeleteProjectExpenseMutation,
  useProjectAssetsQuery,
  useProjectExpensesQuery,
  useProjectMaterialMutation,
  useProjectProgressQuery,
  useReportProjectAssetDamageMutation,
  useReturnProjectAssetMutation,
  useToggleIndicatorMutation,
  useUpdateProjectExpenseMutation,
  type ManualMaterialItemPayload,
} from "@/features/projects/client";
import { useConsumablesQuery } from "@/features/consumables/client";
import { useAssetsQuery } from "@/features/assets/client";
import {
  AddEditExpenseDialog,
  type ExpenseFormInput,
} from "./add-edit-expense-dialog";
import {
  AddMaterialDialog,
  type MaterialFormInput,
} from "./add-material-dialog";
import {
  AddManualMaterialDialog,
} from "./add-manual-material-dialog";
import { ProjectExpensePrintDialog } from "./project-expense-print-dialog";
import { ProjectProgressPrintDialog } from "./project-progress-print-dialog";
import {
  AssignAssetDialog,
  type AssignAssetFormInput,
} from "./assign-asset-dialog";
import {
  ReportDamageDialog,
  type ReportDamageFormInput,
} from "./report-damage-dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useToast } from "@/components/providers/toast-context";


export interface ProjectDetailPanelProps {
  project: Project | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (project: Project) => void;
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <dt className="text-[10px] font-bold uppercase tracking-wider text-text-secondary mb-0.5">
        {label}
      </dt>
      <dd className="text-sm text-text">{children}</dd>
    </div>
  );
}

export function ProjectDetailPanel({
  project,
  isOpen,
  onClose,
  onEdit,
}: ProjectDetailPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const {
    data: expenses = [],
    isLoading: expensesLoading,
  } = useProjectExpensesQuery(isOpen && project ? project.id : null);

  const {
    data: consumablesPage,
    isLoading: consumablesLoading,
  } = useConsumablesQuery({ limit: 100 });
  const consumables = consumablesPage?.data ?? [];
  const {
    data: assets = [],
    isLoading: assetsLoading,
  } = useAssetsQuery("active");
  const {
    data: allAssets = [],
  } = useAssetsQuery();
  const {
    data: assignments = [],
    isLoading: assignmentsLoading,
  } = useProjectAssetsQuery(isOpen && project ? project.id : null, "all");
  const {
    data: progressSummary,
    isLoading: progressLoading,
  } = useProjectProgressQuery(isOpen && project ? project.id : null);

  const createExpense = useCreateProjectExpenseMutation();
  const updateExpense = useUpdateProjectExpenseMutation();
  const deleteExpense = useDeleteProjectExpenseMutation();
  const createBatchManualMaterials = useCreateBatchManualMaterialsMutation();
  const useMaterial = useProjectMaterialMutation();
  const assignAsset = useAssignProjectAssetMutation();
  const returnAsset = useReturnProjectAssetMutation();
  const reportDamage = useReportProjectAssetDamageMutation();
  const createIndicator = useCreateIndicatorMutation();
  const toggleIndicator = useToggleIndicatorMutation();
  const deleteIndicator = useDeleteIndicatorMutation();


  const [editExpense, setEditExpense] = useState<
    ProjectExpenseLine | null | undefined
  >(undefined);
  const [materialOpen, setMaterialOpen] = useState(false);
  const [manualMaterialOpen, setManualMaterialOpen] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [progressPrintOpen, setProgressPrintOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [damageTarget, setDamageTarget] =
    useState<ProjectAssetAssignment | null>(null);
  const [returnTarget, setReturnTarget] =
    useState<ProjectAssetAssignment | null>(null);
  const [deleteExpenseTarget, setDeleteExpenseTarget] =
    useState<ProjectExpenseLine | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Progress indicator state
  const [addIndicatorOpen, setAddIndicatorOpen] = useState(false);
  const [newIndicatorTitle, setNewIndicatorTitle] = useState("");
  const [newIndicatorDate, setNewIndicatorDate] = useState("");
  const [newIndicatorDesc, setNewIndicatorDesc] = useState("");
  const [indicatorSubmitting, setIndicatorSubmitting] = useState(false);
  const [indicatorError, setIndicatorError] = useState<string | null>(null);

  const toast = useToast();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (
        e.key === "Escape" &&
        isOpen &&
        editExpense === undefined &&
        !materialOpen &&
        !manualMaterialOpen &&
        !printOpen &&
        !progressPrintOpen &&
        !assignOpen &&
        !damageTarget &&
        !returnTarget &&
        !deleteExpenseTarget &&
        !addIndicatorOpen
      )
        onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    isOpen,
    onClose,
    editExpense,
    materialOpen,
    manualMaterialOpen,
    printOpen,
    progressPrintOpen,
    assignOpen,
    damageTarget,
    returnTarget,
    deleteExpenseTarget,
    addIndicatorOpen,
  ]);

  useEffect(() => {
    if (!isOpen) {
      setEditExpense(undefined);
      setMaterialOpen(false);
      setManualMaterialOpen(false);
      setPrintOpen(false);
      setProgressPrintOpen(false);
      setAssignOpen(false);
      setDamageTarget(null);
      setReturnTarget(null);
      setDeleteExpenseTarget(null);
      setActionError(null);
      setAddIndicatorOpen(false);
      setNewIndicatorTitle("");
      setNewIndicatorDate("");
      setNewIndicatorDesc("");
      setIndicatorError(null);
    }
  }, [isOpen]);

  if (!isOpen || !project) return null;

  const budgetCap = project.budget ? Number(project.budget) : 0;
  const spent = Number(project.totalSpent) || 0;
  const overBudget =
    project.budgetRemaining != null && Number(project.budgetRemaining) < 0;

  const handleExpenseSubmit = async (input: ExpenseFormInput) => {
    setActionError(null);
    const payload = {
      lineType: input.lineType,
      category: input.category,
      categoryLabel:
        input.category === "other" ? input.categoryLabel || null : null,
      description: input.description,
      amount: input.amount,
      incurredOn: input.incurredOn || undefined,
      notes: input.notes || null,
    };
    try {
      if (editExpense) {
        await updateExpense.mutateAsync({
          projectId: project.id,
          expenseId: editExpense.id,
          payload,
        });
        toast.success("Expense updated.");
      } else {
        await createExpense.mutateAsync({
          projectId: project.id,
          payload,
        });
        toast.success("Expense added.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save expense.");
      throw err;
    }
  };

  const handleManualMaterialSubmit = async (items: ManualMaterialItemPayload[]) => {
    setActionError(null);
    try {
      await createBatchManualMaterials.mutateAsync({
        projectId: project.id,
        payload: { items },
      });
      toast.success(
        `${items.length} manual material${items.length === 1 ? "" : "s"} charged to project.`
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to record manual materials."
      );
      throw err;
    }
  };

  const handleCreateIndicator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIndicatorTitle.trim()) {
      setIndicatorError("Milestone title is required.");
      return;
    }
    setIndicatorSubmitting(true);
    setIndicatorError(null);
    try {
      await createIndicator.mutateAsync({
        projectId: project.id,
        payload: {
          title: newIndicatorTitle.trim(),
          targetDate: newIndicatorDate || undefined,
          description: newIndicatorDesc.trim() || undefined,
        },
      });
      setNewIndicatorTitle("");
      setNewIndicatorDate("");
      setNewIndicatorDesc("");
      setAddIndicatorOpen(false);
      toast.success("Milestone indicator added.");
    } catch (err) {
      setIndicatorError(
        err instanceof Error ? err.message : "Failed to add milestone indicator."
      );
    } finally {
      setIndicatorSubmitting(false);
    }
  };

  const handleToggleIndicator = async (
    indicatorId: string,
    currentStatus: boolean
  ) => {
    try {
      await toggleIndicator.mutateAsync({
        projectId: project.id,
        indicatorId,
        isCompleted: !currentStatus,
      });
      toast.success(
        !currentStatus
          ? "Milestone marked as completed."
          : "Milestone marked as pending."
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update milestone status."
      );
    }
  };

  const handleDeleteIndicator = async (indicatorId: string) => {
    try {
      await deleteIndicator.mutateAsync({
        projectId: project.id,
        indicatorId,
      });
      toast.success("Milestone indicator removed.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete milestone indicator."
      );
    }
  };


  const handleMaterialSubmit = async (input: MaterialFormInput) => {
    setActionError(null);
    try {
      await useMaterial.mutateAsync({
        projectId: project.id,
        payload: {
          consumableId: input.consumableId,
          purchaseLotId: input.purchaseLotId,
          quantity: input.quantity,
          notes: input.notes || null,
        },
      });
      toast.success("Material usage recorded.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to record material.");
      throw err;
    }
  };

  const handleAssignAsset = async (input: AssignAssetFormInput) => {
    setActionError(null);
    try {
      await assignAsset.mutateAsync({
        projectId: project.id,
        assetId: input.assetId,
        notes: input.notes || null,
      });
      toast.success("Asset assigned to project.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to assign asset.");
      throw err;
    }
  };

  const handleReturnAsset = (row: ProjectAssetAssignment) => {
    setReturnTarget(row);
  };

  const handleConfirmReturn = async () => {
    if (!returnTarget) return;
    setActionError(null);
    try {
      await returnAsset.mutateAsync({
        projectId: project.id,
        assignmentId: returnTarget.id,
      });
      toast.success(`${returnTarget.assetName} returned from project.`);
      setReturnTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to return asset.");
    }
  };

  const handleDamageSubmit = async (input: ReportDamageFormInput) => {
    if (!damageTarget) return;
    setActionError(null);
    try {
      await reportDamage.mutateAsync({
        projectId: project.id,
        assignmentId: damageTarget.id,
        mode: input.mode,
        amount:
          input.mode === "write_off" && input.amount
            ? input.amount
            : undefined,
        assetStatus:
          input.mode === "write_off" ? input.assetStatus : undefined,
        notes: input.notes,
      });
      toast.success("Damage report submitted.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to report damage.");
      throw err;
    }
  };

  const damageDefaultValue = (() => {
    if (!damageTarget) return null;
    const match = allAssets.find((a) => a.id === damageTarget.assetId);
    return match?.value ?? null;
  })();

  const handleDeleteExpense = (line: ProjectExpenseLine) => {
    setDeleteExpenseTarget(line);
  };

  const handleConfirmDeleteExpense = async () => {
    if (!deleteExpenseTarget) return;
    setActionError(null);
    try {
      await deleteExpense.mutateAsync({
        projectId: project.id,
        expenseId: deleteExpenseTarget.id,
      });
      toast.success("Expense deleted.");
      setDeleteExpenseTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete expense.");
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity duration-200 print:hidden">
        <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

        <aside
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="project-detail-heading"
          className={cn(
            "relative flex flex-col w-full max-w-lg h-full bg-bg border-l border-border shadow-2xl z-10 overflow-hidden",
            "animate-in slide-in-from-right duration-250 ease-in-out"
          )}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-bg-subtle/50 shrink-0">
            <div className="min-w-0 flex-1 pr-3">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="inline-flex items-center gap-1.5 font-mono text-sm font-bold tracking-tight px-2.5 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/25">
                  <FolderKanban className="h-3.5 w-3.5" />
                  {project.projectCode}
                </span>
                <ProjectStatusBadge status={project.status} />
                {!project.isMutable && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-bg-subtle border border-border text-text-secondary">
                    <Lock className="h-3 w-3" />
                    Read-only
                  </span>
                )}
              </div>
              <p className="text-xs text-text-secondary font-medium mt-1 truncate">
                Project Workspace • <strong className="text-text font-semibold">{project.name}</strong>
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setProgressPrintOpen(true)}
                className="inline-flex items-center gap-1.5 h-8 px-2.5 text-[11px] font-bold rounded-lg border border-border bg-bg text-text hover:bg-bg-subtle cursor-pointer shadow-xs"
                title="Export progress report"
              >
                <Flag className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                Progress
              </button>

              <button
                type="button"
                onClick={() => setPrintOpen(true)}
                className="inline-flex items-center gap-1.5 h-8 px-2.5 text-[11px] font-bold rounded-lg border border-border bg-bg text-text hover:bg-bg-subtle cursor-pointer shadow-xs"
                title="Export expense report"
              >
                <Printer className="h-3.5 w-3.5" />
                Expenses
              </button>

              <button
                type="button"
                onClick={() => window.print()}

                aria-label="Print Project Dossier Report"
                className="relative group inline-flex items-center justify-center p-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white transition-colors cursor-pointer shadow-xs shrink-0"
              >
                <Printer className="h-4 w-4" />
                <span
                  role="tooltip"
                  className="pointer-events-none absolute top-full mt-1.5 right-0 z-50 whitespace-nowrap rounded-md bg-neutral-900/95 dark:bg-neutral-800/95 backdrop-blur-xs text-white px-2 py-0.5 text-[10px] font-semibold tracking-wide shadow-md border border-white/10 opacity-0 group-hover:opacity-100 translate-y-0.5 group-hover:translate-y-0 scale-95 group-hover:scale-100 transition-all duration-150 origin-top-right"
                >
                  Print Report (PDF)
                </span>
              </button>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close project detail"
                className="p-1.5 rounded-lg text-text-secondary hover:text-text hover:bg-border transition-colors cursor-pointer shrink-0"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <section className="grid grid-cols-2 gap-3">
            <div className="col-span-2 p-3.5 rounded-xl border border-border bg-bg-subtle/40 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                  <Wallet className="h-3.5 w-3.5 text-accent" />
                  Budget & Spend Overview
                </span>
                {overBudget ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-status-outofservice-text px-2 py-0.5 rounded-full bg-status-outofservice-bg/15 border border-status-outofservice-bg/25">
                    <AlertTriangle className="h-3 w-3" />
                    Over budget
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-status-active-text px-2 py-0.5 rounded-full bg-status-active-bg/15 border border-status-active-bg/25">
                    {budgetCap > 0 ? `${Math.round((spent / budgetCap) * 100)}% utilized` : "Active"}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2.5 rounded-lg bg-bg border border-border/70">
                  <div className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">
                    Budget Cap
                  </div>
                  <div className="text-sm font-bold font-mono tabular-nums text-text mt-0.5">
                    {project.budget ? formatPhp(project.budget) : "—"}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-bg border border-border/70">
                  <div className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">
                    Total Spent
                  </div>
                  <div className="text-sm font-bold font-mono tabular-nums text-accent mt-0.5">
                    {formatPhp(project.totalSpent)}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-bg border border-border/70">
                  <div className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">
                    Remaining
                  </div>
                  <div
                    className={cn(
                      "text-sm font-bold font-mono tabular-nums mt-0.5",
                      overBudget
                        ? "text-status-outofservice-text font-black"
                        : "text-status-active-text"
                    )}
                  >
                    {project.budgetRemaining != null
                      ? formatPhp(project.budgetRemaining)
                      : "—"}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-lg border border-border bg-bg-subtle/40 flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-category-transport-bg/15 text-category-transport-bg shrink-0">
                <MapPin className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                  Location
                </div>
                <div className="font-semibold text-text text-xs truncate">
                  {project.location || "—"}
                </div>
              </div>
            </div>

            <div className="p-3 rounded-lg border border-border bg-bg-subtle/40 flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-category-computing-bg/15 text-category-computing-bg shrink-0">
                <Building2 className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                  Department
                </div>
                <div className="font-semibold text-text text-xs truncate">
                  {project.department || "—"}
                </div>
              </div>
            </div>

            <div className="p-3 rounded-lg border border-border bg-bg-subtle/40 flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent/10 text-accent shrink-0">
                <Calendar className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                  Duration
                </div>
                <div className="font-medium text-text text-[11px] truncate">
                  {project.startDate || "—"} → {project.endDate || "Ongoing"}
                </div>
              </div>
            </div>

            <div className="p-3 rounded-lg border border-border bg-bg-subtle/40 flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent/10 text-accent shrink-0">
                <User className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                  Lead / Created By
                </div>
                <div className="font-semibold text-text text-xs truncate">
                  {project.createdByName}
                </div>
              </div>
            </div>
          </section>

          {project.description && (
            <section>
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5 mb-2">
                <FileText className="h-3.5 w-3.5" />
                Description
              </h3>
              <p className="text-xs text-text leading-relaxed whitespace-pre-wrap">
                {project.description}
              </p>
            </section>
          )}

          {project.notes && (
            <section>
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-2">
                Notes
              </h3>
              <p className="text-xs text-text leading-relaxed whitespace-pre-wrap">
                {project.notes}
              </p>
            </section>
          )}

          <section className="space-y-3 p-4 rounded-xl border border-border bg-bg-subtle/30">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-teal-500/15 text-teal-600 dark:text-teal-400">
                  <Flag className="h-3.5 w-3.5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-text">
                    Progress &amp; Milestones
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/25">
                  {progressSummary?.progressPercentage ?? 0}% Complete ({progressSummary?.completedIndicators ?? 0}/{progressSummary?.totalIndicators ?? 0})
                </span>
                {project.isMutable && !addIndicatorOpen && (
                  <button
                    type="button"
                    onClick={() => setAddIndicatorOpen(true)}
                    className="inline-flex items-center gap-1 h-6 px-2 text-[10px] font-bold rounded-md bg-accent text-accent-foreground cursor-pointer shadow-2xs"
                  >
                    <Plus className="h-3 w-3" />
                    Add
                  </button>
                )}
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-border rounded-full h-2 overflow-hidden">
              <div
                className="bg-teal-600 dark:bg-teal-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${progressSummary?.progressPercentage ?? 0}%` }}
              />
            </div>

            {/* Add indicator form */}
            {addIndicatorOpen && (
              <form onSubmit={handleCreateIndicator} className="p-3 rounded-lg border border-border bg-bg space-y-2.5 animate-in fade-in zoom-in-95 duration-150">
                <div className="text-[11px] font-bold text-text">New Progress Indicator / Milestone</div>
                <div>
                  <input
                    value={newIndicatorTitle}
                    onChange={(e) => setNewIndicatorTitle(e.target.value)}
                    placeholder="Milestone title (e.g. Foundation & Excavation, Floor Tiling)"
                    className="w-full h-7 px-2 text-xs bg-bg-subtle border border-border rounded-md text-text focus:outline-none focus:ring-1 focus:ring-accent"
                    autoFocus
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9px] font-bold uppercase text-text-secondary mb-0.5">Target Date</label>
                    <input
                      type="date"
                      value={newIndicatorDate}
                      onChange={(e) => setNewIndicatorDate(e.target.value)}
                      className="w-full h-7 px-2 text-xs bg-bg-subtle border border-border rounded-md text-text"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold uppercase text-text-secondary mb-0.5">Details (Optional)</label>
                    <input
                      value={newIndicatorDesc}
                      onChange={(e) => setNewIndicatorDesc(e.target.value)}
                      placeholder="Notes or deliverables"
                      className="w-full h-7 px-2 text-xs bg-bg-subtle border border-border rounded-md text-text"
                    />
                  </div>
                </div>
                {indicatorError && (
                  <p className="text-[10px] text-destructive">{indicatorError}</p>
                )}
                <div className="flex items-center justify-end gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setAddIndicatorOpen(false);
                      setIndicatorError(null);
                    }}
                    disabled={indicatorSubmitting}
                    className="h-6 px-2.5 text-[10px] font-bold rounded border border-border bg-bg text-text hover:bg-bg-subtle cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={indicatorSubmitting}
                    className="inline-flex items-center gap-1 h-6 px-2.5 text-[10px] font-bold rounded bg-accent text-accent-foreground cursor-pointer disabled:opacity-50"
                  >
                    {indicatorSubmitting ? "Saving…" : "Save Milestone"}
                  </button>
                </div>
              </form>
            )}

            {/* Indicator items */}
            {progressLoading ? (
              <div className="py-2 text-center text-xs text-text-secondary">Loading indicators…</div>
            ) : (progressSummary?.indicators.length ?? 0) === 0 ? (
              <div className="p-3 text-center rounded-lg border border-dashed border-border bg-bg/50 text-[11px] text-text-secondary">
                No progress indicators added yet. Add indicators to establish the progress baseline for this project.
              </div>
            ) : (
              <ul className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {progressSummary?.indicators.map((item) => (
                  <li
                    key={item.id}
                    className={cn(
                      "p-2 rounded-lg border border-border flex items-start justify-between gap-2 text-xs transition-colors",
                      item.isCompleted ? "bg-bg/40 opacity-80" : "bg-bg"
                    )}
                  >
                    <div className="flex items-start gap-2 min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => void handleToggleIndicator(item.id, item.isCompleted)}
                        className={cn(
                          "mt-0.5 h-4 w-4 rounded flex items-center justify-center border transition-colors cursor-pointer shrink-0",
                          item.isCompleted
                            ? "bg-teal-600 border-teal-600 text-white"
                            : "border-border hover:border-accent bg-bg"
                        )}
                        aria-label={`Toggle ${item.title}`}
                      >
                        {item.isCompleted && <Check className="h-3 w-3 stroke-3" />}

                      </button>
                      <div className="min-w-0 flex-1">
                        <div className={cn("font-semibold text-[11px] truncate text-text", item.isCompleted && "line-through text-text-secondary")}>
                          {item.title}
                        </div>
                        <div className="flex items-center gap-2 text-[9.5px] text-text-secondary flex-wrap mt-0.5">
                          {item.targetDate && <span>Target: {item.targetDate}</span>}
                          {item.isCompleted && item.completedDate && (
                            <span className="text-teal-600 dark:text-teal-400 font-medium">
                              Done: {item.completedDate}
                            </span>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-[10px] text-text-secondary mt-0.5 truncate">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {project.isMutable && (
                      <button
                        type="button"
                        onClick={() => void handleDeleteIndicator(item.id)}
                        className="p-1 text-text-secondary hover:text-destructive rounded transition-colors cursor-pointer shrink-0"
                        aria-label={`Delete ${item.title}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-2">

            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                Expenses & materials
              </h3>
              {project.isMutable && (
                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                  <button
                    type="button"
                    onClick={() => setMaterialOpen(true)}
                    className="inline-flex items-center gap-1 h-7 px-2.5 text-[11px] font-bold rounded-md border border-border bg-bg text-text hover:bg-bg-subtle cursor-pointer"
                    title="Issue from inventory stock"
                  >
                    <Boxes className="h-3.5 w-3.5" />
                    Inventory
                  </button>
                  <button
                    type="button"
                    onClick={() => setManualMaterialOpen(true)}
                    className="inline-flex items-center gap-1 h-7 px-2.5 text-[11px] font-bold rounded-md border border-border bg-bg text-text hover:bg-bg-subtle cursor-pointer"
                    title="Add material not in inventory"
                  >
                    <PackagePlus className="h-3.5 w-3.5" />
                    Manual
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditExpense(null)}
                    className="inline-flex items-center gap-1 h-7 px-2.5 text-[11px] font-bold rounded-md bg-accent text-accent-foreground cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Misc
                  </button>
                </div>
              )}
            </div>

            {actionError && (
              <p className="text-[11px] text-status-outofservice-text">
                {actionError}
              </p>
            )}

            {expensesLoading ? (
              <LoadingState
                variant="card"
                icon="project"
                message="Loading project expenses..."
                subtitle="Retrieving material costs, item write-offs, and expenditures"
              />
            ) : expenses.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-6 text-center rounded-xl border border-dashed border-border/80 bg-bg-subtle/30 space-y-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
                  <Receipt className="h-5 w-5" />
                </div>
                <div className="space-y-1 max-w-xs">
                  <h4 className="text-xs font-bold text-text">No project expenses yet</h4>
                  <p className="text-[11px] text-text-secondary leading-relaxed">
                    Issue from inventory, charge manual materials not in stock, or log travel, meals, fees, and credits.
                  </p>
                </div>
                {project.isMutable && (
                  <div className="flex items-center gap-2 pt-1 flex-wrap justify-center">
                    <button
                      type="button"
                      onClick={() => setMaterialOpen(true)}
                      className="inline-flex items-center gap-1.5 h-7 px-3 text-[11px] font-bold rounded-lg border border-border bg-bg text-text hover:bg-bg-subtle transition-colors cursor-pointer shadow-2xs"
                    >
                      <Boxes className="h-3 w-3" />
                      Inventory
                    </button>
                    <button
                      type="button"
                      onClick={() => setManualMaterialOpen(true)}
                      className="inline-flex items-center gap-1.5 h-7 px-3 text-[11px] font-bold rounded-lg border border-border bg-bg text-text hover:bg-bg-subtle transition-colors cursor-pointer shadow-2xs"
                    >
                      <PackagePlus className="h-3 w-3" />
                      Manual material
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditExpense(null)}
                      className="inline-flex items-center gap-1.5 h-7 px-3 text-[11px] font-bold rounded-lg bg-accent text-accent-foreground hover:opacity-90 transition-opacity cursor-pointer shadow-2xs"
                    >
                      <Plus className="h-3 w-3" />
                      Add Expense
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <ul className="space-y-2">
                {expenses.map((line) => {
                  const amount = Number(line.amount);
                  const isCredit = amount < 0;
                  const isInventory = line.lineType === "consumable";
                  const isManualMaterial = line.lineType === "material";
                  const isWriteOff = line.lineType === "asset_writeoff";
                  return (
                    <li
                      key={line.id}
                      className="rounded-xl border border-border bg-bg-subtle/40 p-3 text-xs hover:bg-bg-subtle/70 transition-colors space-y-1.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-text truncate">
                              {line.description}
                            </span>
                            {isInventory && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-category-furniture-bg/15 text-category-furniture-bg border border-category-furniture-bg/30">
                                <Boxes className="h-3 w-3" />
                                Inventory Stock
                              </span>
                            )}
                            {isManualMaterial && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-accent/10 text-accent border border-accent/25">
                                <PackagePlus className="h-3 w-3" />
                                Manual material
                              </span>
                            )}
                            {isWriteOff && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-destructive/15 text-destructive border border-destructive/25">
                                <AlertTriangle className="h-3 w-3" />
                                Write-off
                              </span>
                            )}
                            {line.lineType === "adjustment" && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-status-active-bg/15 text-status-active-text border border-status-active-bg/25">
                                Credit Adjustment
                              </span>
                            )}
                            {line.lineType === "miscellaneous" && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-bg-subtle text-text-secondary border border-border">
                                {expenseCategoryDisplay(
                                  line.category,
                                  line.categoryLabel
                                )}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-text-secondary mt-1 flex items-center gap-1.5 flex-wrap">
                            {isInventory || isManualMaterial
                              ? [
                                  line.quantity != null
                                    ? `qty ${Number(line.quantity)}`
                                    : null,
                                  line.unitCost != null
                                    ? `@ ${formatPhp(line.unitCost)}`
                                    : null,
                                  line.incurredOn,
                                ]
                                  .filter(Boolean)
                                  .join(" · ")
                              : line.incurredOn}
                            {line.recordedByName
                              ? ` · logged by ${line.recordedByName}`
                              : ""}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={cn(
                              "font-mono font-bold tabular-nums text-sm",
                              isCredit
                                ? "text-status-active-text"
                                : "text-text"
                            )}
                          >
                            {formatPhp(line.amount)}
                          </span>
                          {project.isMutable &&
                            (line.lineType === "miscellaneous" ||
                              line.lineType === "adjustment") && (
                              <button
                                type="button"
                                onClick={() => setEditExpense(line)}
                                className="p-1 rounded-md border border-border hover:bg-bg cursor-pointer text-text-secondary hover:text-text"
                                aria-label="Edit expense"
                              >
                                <Pencil className="h-3 w-3" />
                              </button>
                            )}
                          {project.isMutable &&
                            (line.lineType === "miscellaneous" ||
                              line.lineType === "adjustment" ||
                              line.lineType === "material" ||
                              line.lineType === "consumable") && (
                              <button
                                type="button"
                                onClick={() => {
                                  void handleDeleteExpense(line);
                                }}
                                className="p-1 rounded-md border border-border text-status-outofservice-text hover:bg-status-outofservice-bg/10 cursor-pointer"
                                aria-label="Delete expense"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                Assigned assets
              </h3>
              {project.isMutable && (
                <button
                  type="button"
                  onClick={() => setAssignOpen(true)}
                  className="inline-flex items-center gap-1 h-7 px-2.5 text-[11px] font-bold rounded-md bg-accent text-accent-foreground cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Assign
                </button>
              )}
            </div>
            <p className="text-[10px] text-text-secondary">
              Custody only until write-off. Report damage to flag repair or charge
              a write-off expense + maintenance log.
            </p>

            {assignmentsLoading ? (
              <LoadingState
                variant="card"
                icon="package"
                message="Loading assigned assets..."
                subtitle="Retrieving hardware assignments and custody records"
              />
            ) : assignments.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-6 text-center rounded-xl border border-dashed border-border/80 bg-bg-subtle/30 space-y-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
                  <PackageCheck className="h-5 w-5" />
                </div>
                <div className="space-y-1 max-w-xs">
                  <h4 className="text-xs font-bold text-text">No assets assigned</h4>
                  <p className="text-[11px] text-text-secondary leading-relaxed">
                    Assign available hardware and equipment to this project workspace for active custodian tracking.
                  </p>
                </div>
                {project.isMutable && (
                  <button
                    type="button"
                    onClick={() => setAssignOpen(true)}
                    className="inline-flex items-center gap-1.5 h-7 px-3 text-[11px] font-bold rounded-lg bg-accent text-accent-foreground hover:opacity-90 transition-opacity cursor-pointer shadow-2xs"
                  >
                    <Plus className="h-3 w-3" />
                    Assign Asset
                  </button>
                )}
              </div>
            ) : (
              <ul className="space-y-2">
                {assignments.map((row) => {
                  const isOpenAssignment = row.status === "assigned";
                  return (
                    <li
                      key={row.id}
                      className="rounded-xl border border-border bg-bg-subtle/40 p-3 text-xs hover:bg-bg-subtle/70 transition-colors space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-text truncate">
                              {row.assetName}
                            </span>
                            <span className="inline-flex items-center font-mono font-bold text-[10px] px-2 py-0.5 rounded-md bg-category-computing-bg/15 text-category-computing-bg border border-category-computing-bg/25">
                              {row.assetCode}
                            </span>
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border",
                                isOpenAssignment
                                  ? "bg-status-active-bg/15 text-status-active-text border-status-active-bg/25"
                                  : row.status === "written_off"
                                    ? "bg-destructive/15 text-destructive border-destructive/25"
                                    : "bg-status-retired-bg/15 text-status-retired-text border-status-retired-bg/25"
                              )}
                            >
                              <span
                                className={cn(
                                  "h-1.5 w-1.5 rounded-full",
                                  isOpenAssignment
                                    ? "bg-status-active-bg"
                                    : row.status === "written_off"
                                      ? "bg-destructive"
                                      : "bg-status-retired-bg"
                                )}
                              />
                              {row.status.replace("_", " ")}
                            </span>
                          </div>
                          <div className="text-[10px] text-text-secondary mt-1">
                            assigned{" "}
                            {new Date(row.assignedAt).toLocaleDateString()}
                            {row.assignedByName
                              ? ` · by ${row.assignedByName}`
                              : ""}
                            {row.returnedAt
                              ? ` · returned ${new Date(row.returnedAt).toLocaleDateString()}`
                              : ""}
                          </div>
                          {row.notes && (
                            <p className="text-[10px] text-text-secondary mt-1">
                              {row.notes}
                            </p>
                          )}
                        </div>
                        {project.isMutable && isOpenAssignment && (
                          <div className="flex flex-col gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                void handleReturnAsset(row);
                              }}
                              disabled={returnAsset.isPending}
                              className="inline-flex items-center gap-1 h-7 px-2 text-[10px] font-bold rounded-md border border-border bg-bg hover:bg-bg-subtle cursor-pointer disabled:opacity-50"
                              aria-label={`Return ${row.assetName}`}
                            >
                              <Undo2 className="h-3 w-3" />
                              Return
                            </button>
                            <button
                              type="button"
                              onClick={() => setDamageTarget(row)}
                              disabled={reportDamage.isPending}
                              className="inline-flex items-center gap-1 h-7 px-2 text-[10px] font-bold rounded-md border border-border bg-bg hover:bg-bg-subtle cursor-pointer disabled:opacity-50"
                              aria-label={`Report damage for ${row.assetName}`}
                            >
                              <Wrench className="h-3 w-3" />
                              Damage
                            </button>
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        <div className="px-6 py-4 border-t border-border bg-bg-subtle/40 shrink-0 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-4 text-xs font-bold rounded-lg border border-border bg-bg text-text hover:bg-bg-subtle transition-colors cursor-pointer"
          >
            Close
          </button>
          {project.isMutable && (
            <button
              type="button"
              onClick={() => onEdit(project)}
              className="inline-flex items-center gap-1.5 h-9 px-4 text-xs font-bold rounded-lg bg-accent text-accent-foreground hover:opacity-90 transition-opacity cursor-pointer"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit project
            </button>
          )}
        </div>
      </aside>

      <AddEditExpenseDialog
        isOpen={editExpense !== undefined}
        expense={editExpense ?? null}
        onClose={() => setEditExpense(undefined)}
        onSubmit={handleExpenseSubmit}
      />

      <AddMaterialDialog
        isOpen={materialOpen}
        items={consumables}
        loadingItems={consumablesLoading}
        onClose={() => setMaterialOpen(false)}
        onSubmit={handleMaterialSubmit}
      />

      <AddManualMaterialDialog
        isOpen={manualMaterialOpen}
        onClose={() => setManualMaterialOpen(false)}
        onSubmit={handleManualMaterialSubmit}
      />

      <ProjectExpensePrintDialog
        project={project}
        expenses={expenses}
        isOpen={printOpen}
        onClose={() => setPrintOpen(false)}
      />

      <ProjectProgressPrintDialog
        project={project}
        progress={progressSummary ?? null}
        isOpen={progressPrintOpen}
        onClose={() => setProgressPrintOpen(false)}
      />


      <AssignAssetDialog
        isOpen={assignOpen}
        assets={assets}
        loadingAssets={assetsLoading}
        onClose={() => setAssignOpen(false)}
        onSubmit={handleAssignAsset}
      />

      <ReportDamageDialog
        isOpen={Boolean(damageTarget)}
        assignment={damageTarget}
        defaultValue={damageDefaultValue}
        onClose={() => setDamageTarget(null)}
        onSubmit={handleDamageSubmit}
      />

      <ConfirmDialog
        isOpen={Boolean(returnTarget)}
        title="Return Assigned Asset"
        description={
          returnTarget
            ? `Return "${returnTarget.assetName}" (${returnTarget.assetCode}) from this project back to general custody?`
            : ""
        }
        confirmLabel="Return Asset"
        variant="warning"
        isLoading={returnAsset.isPending}
        onConfirm={handleConfirmReturn}
        onClose={() => setReturnTarget(null)}
      />

      <ConfirmDialog
        isOpen={Boolean(deleteExpenseTarget)}
        title={
          deleteExpenseTarget?.lineType === "consumable"
            ? "Remove Material Usage"
            : "Delete Expense Line"
        }
        description={
          deleteExpenseTarget?.lineType === "consumable"
            ? `Remove material charge "${deleteExpenseTarget.description}"? Deducted stock and purchase lots will be restored.`
            : `Permanently remove expense line "${deleteExpenseTarget?.description}"?`
        }
        confirmLabel="Delete"
        variant="destructive"
        isLoading={deleteExpense.isPending}
        onConfirm={handleConfirmDeleteExpense}
        onClose={() => setDeleteExpenseTarget(null)}
      />
    </div>

    <div className="hidden print:block">
      <IndividualProjectPrintableReport
        project={project}
        assignedAssets={assignments}
        expenses={expenses}
      />
    </div>
    </>
  );
}
