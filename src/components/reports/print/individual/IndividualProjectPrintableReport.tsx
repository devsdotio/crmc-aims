"use client";

import type { Project, ProjectAssetAssignment, ProjectExpenseLine } from "@/types/projects";
import {
  PrintMetricBar,
  PrintStatusBadge,
  PrintSignatories,
} from "../PrintCharts";

export interface IndividualProjectAsset {
  id: string;
  assetCode?: string | null;
  assetName?: string | null;
  name?: string | null;
  assignedAt?: string | null;
  assignedByName?: string | null;
  status?: string | null;
}

export interface IndividualProjectExpense {
  id: string;
  incurredOn?: string | null;
  description?: string | null;
  name?: string | null;
  consumableName?: string | null;
  category?: string | null;
  quantity?: number | string | null;
  unit?: string | null;
  consumableUnit?: string | null;
  amount?: number | string | null;
  totalCost?: number | string | null;
}

export interface IndividualProjectPrintableReportProps {
  project: {
    id: string;
    projectCode?: string;
    name?: string;
    projectName?: string;
    description?: string | null;
    status?: string;
    location?: string | null;
    department?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    budget?: string | number | null;
    totalSpent?: string | number | null;
    totalProjectCost?: string | number | null;
    createdByName?: string | null;
    managerName?: string | null;
    assignedAssets?: IndividualProjectAsset[];
    consumedSupplies?: IndividualProjectExpense[];
  };
  assignedAssets?: IndividualProjectAsset[];
  expenses?: IndividualProjectExpense[];
  generatedAt?: Date;
  canViewCosts?: boolean;
}

export function IndividualProjectPrintableReport({
  project,
  assignedAssets: propAssignedAssets,
  expenses: propExpenses,
  generatedAt = new Date(),
  canViewCosts = true,
}: IndividualProjectPrintableReportProps) {
  const formattedDate = generatedAt.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const formattedTime = generatedAt.toLocaleTimeString("en-PH", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const projectName = project.projectName || project.name || "Project";
  const projectCode = project.projectCode || `PRJ-${project.id.slice(0, 6)}`;
  const projectLead = project.managerName || project.createdByName || "Project Lead";

  const effectiveAssets: IndividualProjectAsset[] =
    propAssignedAssets ||
    project.assignedAssets?.map((a) => ({
      id: a.id,
      assetCode: a.assetCode || a.id,
      assetName: a.name || a.assetName || "Capital Equipment",
      assignedAt: a.assignedAt || null,
      assignedByName: a.assignedByName || "Admin",
      status: a.status || "active",
    })) ||
    [];

  const effectiveExpenses: IndividualProjectExpense[] =
    propExpenses ||
    project.consumedSupplies?.map((s) => ({
      id: s.id,
      incurredOn: s.incurredOn || null,
      description: s.name || s.description || "Consumable Supply",
      consumableName: s.name || s.description,
      category: s.category || "Consumable",
      quantity: s.quantity,
      consumableUnit: s.unit || s.consumableUnit,
      amount: s.totalCost ?? s.amount ?? 0,
    })) ||
    [];

  const totalBudget = Number(project.budget || 0);
  const totalExpenseSpend = effectiveExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const actualSpend = Number(project.totalProjectCost ?? project.totalSpent ?? (totalExpenseSpend > 0 ? totalExpenseSpend : 0));
  const budgetVariance = totalBudget > 0 ? totalBudget - actualSpend : 0;

  return (
    <div className="print-page mx-auto w-full max-w-[7.6in] bg-white text-text text-[11px] leading-normal font-sans space-y-3">
      {/* ─── Institutional Header ───────────────────────────────────────── */}
      <header className="avoid-break border-b-2 border-[#2A3260] pb-2.5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/CRMC%20LOGO.png"
              alt="CRMC Seal"
              className="h-11 w-11 object-contain shrink-0"
            />
            <div className="space-y-0.5">
              <h1 className="text-base font-extrabold tracking-tight text-[#2A3260] uppercase">
                CRMC-AIMS
              </h1>
              <div className="text-[11px] font-semibold text-neutral-700">
                Cebu Roosevelt Memorial Colleges, Inc. · Asset &amp; Inventory Management System
              </div>
              <div className="text-[9.5px] font-medium text-neutral-500">
                Upper Pandan, Bogo City, Cebu, Philippines · Capital Project Management &amp; Development
              </div>
            </div>
          </div>
          <div suppressHydrationWarning className="rounded-xs border border-neutral-200 bg-neutral-50/80 px-2.5 py-1 text-right font-mono text-[9.5px] space-y-0.5 shrink-0">
            <div>
              <span className="text-neutral-500">Generated:</span>{" "}
              <span className="font-semibold text-neutral-800">{formattedDate}, {formattedTime}</span>
            </div>
            <div>
              <span className="text-neutral-500">Doc ID:</span>{" "}
              <span className="font-bold text-neutral-800">
                PRJ-DOS-{projectCode}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-2 flex items-baseline justify-between border-t border-neutral-200 pt-1.5">
          <div>
            <h2 className="text-sm font-extrabold text-[#2A3260] tracking-tight uppercase">
              Individual Capital Project Dossier &amp; Material Ledger
            </h2>
            <div className="text-[10px] text-neutral-500 mt-0.5 font-mono">
              Project Code: <span className="font-bold text-neutral-800">{projectCode}</span> · Department: {project.department || "Institutional Infrastructure"}
            </div>
          </div>
          <span className="text-[9.5px] font-bold tracking-wider text-teal-800 uppercase bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-xs">
            Capital Project Dossier
          </span>
        </div>
      </header>

      {/* ─── Metric Bar ──────────────────────────────────────────────────── */}
      <section className="avoid-break">
        <PrintMetricBar
          metrics={[
            {
              label: "Allocated Budget",
              value: canViewCosts && totalBudget > 0 ? `₱${totalBudget.toLocaleString()}` : "—",
              delta: "Approved Allocation",
              deltaType: "neutral",
              subtext: "Capital fund line",
            },
            {
              label: "Actual Project Spend",
              value: canViewCosts && actualSpend > 0 ? `₱${actualSpend.toLocaleString()}` : "—",
              delta: canViewCosts && totalBudget > 0 ? (budgetVariance >= 0 ? `₱${budgetVariance.toLocaleString()} remaining` : "Over Budget") : "Recorded",
              deltaType: budgetVariance >= 0 ? "positive" : "warning",
              subtext: "Disbursed & Committed",
            },
            {
              label: "Allocated Assets",
              value: `${effectiveAssets.length} Units`,
              delta: "In Deployment",
              deltaType: "neutral",
              subtext: "Active site equipment",
            },
            {
              label: "Project Status",
              value: project.status?.toUpperCase() || "ACTIVE",
              delta: project.status === "active" ? "In Progress" : "Completed",
              deltaType: project.status === "completed" ? "positive" : "neutral",
              subtext: project.location || "On-Premises",
            },
          ]}
        />
      </section>

      {/* ─── Section 1: Project Overview & Metadata ─────────────────────── */}
      <section className="avoid-break">
        <div className="rounded-xs border border-neutral-200 bg-white overflow-hidden w-full">
          <div className="border-b border-neutral-200 bg-neutral-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-teal-800 flex items-center justify-between">
            <span>1. Capital Project Overview &amp; Site Allocation</span>
            <span className="text-[10px] text-neutral-500 font-mono">Code: {projectCode}</span>
          </div>
          <div className="p-3 grid grid-cols-12 gap-2.5 text-[11px]">
            <div className="col-span-5 space-y-1">
              <div className="text-[10px] font-bold uppercase text-neutral-500">Project Title / Name</div>
              <div className="font-bold text-[#2A3260] text-[12px]">{projectName}</div>
            </div>
            <div className="col-span-4 space-y-1">
              <div className="text-[10px] font-bold uppercase text-neutral-500">Lead Department</div>
              <div className="font-semibold text-neutral-800">{project.department || "Institutional Infrastructure"}</div>
            </div>
            <div className="col-span-3 space-y-1">
              <div className="text-[10px] font-bold uppercase text-neutral-500">Project Status</div>
              <div><PrintStatusBadge status={project.status || "active"} /></div>
            </div>

            <div className="col-span-4 space-y-1 border-t border-neutral-100 pt-1.5">
              <div className="text-[10px] font-bold uppercase text-neutral-500">Project Lead / Initiator</div>
              <div className="font-semibold text-neutral-800">{projectLead}</div>
            </div>
            <div className="col-span-4 space-y-1 border-t border-neutral-100 pt-1.5">
              <div className="text-[10px] font-bold uppercase text-neutral-500">Work Site / Location</div>
              <div className="text-neutral-700">{project.location || "CRMC Main Campus"}</div>
            </div>
            <div className="col-span-4 space-y-1 border-t border-neutral-100 pt-1.5">
              <div className="text-[10px] font-bold uppercase text-neutral-500">Implementation Timeline</div>
              <div className="font-mono text-neutral-700">
                {project.startDate || "Active"} → {project.endDate || "Ongoing"}
              </div>
            </div>

            {project.description && (
              <div className="col-span-12 border-t border-neutral-100 pt-1.5">
                <div className="text-[10px] font-bold uppercase text-neutral-500 mb-0.5">Project Scope &amp; Objectives</div>
                <div className="text-neutral-700 text-[10.5px] leading-relaxed bg-neutral-50 p-2 rounded-xs">
                  {project.description}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ─── Section 2: Allocated Capital Assets Table ──────────────────── */}
      <section className="avoid-break">
        <div className="rounded-xs border border-neutral-200 bg-white overflow-hidden w-full">
          <div className="border-b border-neutral-200 bg-neutral-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-teal-800 flex items-center justify-between">
            <span>2. Allocated Capital Equipment &amp; Assets</span>
            <span className="text-[10px] text-neutral-500 font-mono">
              {effectiveAssets.length} Units Assigned
            </span>
          </div>
          <table className="w-full border-collapse text-[11px] table-auto">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-[10.5px] font-bold uppercase tracking-wider text-neutral-600">
                <th className="py-1.5 px-3 text-left whitespace-nowrap w-24">Asset Tag</th>
                <th className="py-1.5 px-3 text-left">Equipment Name</th>
                <th className="py-1.5 px-3 text-left whitespace-nowrap">Assigned Date</th>
                <th className="py-1.5 px-3 text-left whitespace-nowrap">Assigned By</th>
                <th className="py-1.5 px-3 text-left whitespace-nowrap w-24">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-[11px] text-neutral-800">
              {effectiveAssets.map((item) => (
                <tr key={item.id}>
                  <td className="py-1.5 px-3 font-mono font-bold text-[#2A3260] whitespace-nowrap">
                    {item.assetCode || `AST-${item.id}`}
                  </td>
                  <td className="py-1.5 px-3 font-medium">
                    {item.assetName || item.name || "Capital Equipment"}
                  </td>
                  <td className="py-1.5 px-3 font-mono text-neutral-600 whitespace-nowrap">
                    {item.assignedAt ? new Date(item.assignedAt).toLocaleDateString("en-PH") : "—"}
                  </td>
                  <td className="py-1.5 px-3 text-neutral-600 whitespace-nowrap">
                    {item.assignedByName || "Admin"}
                  </td>
                  <td className="py-1.5 px-3 whitespace-nowrap">
                    <PrintStatusBadge status={item.status || "active"} />
                  </td>
                </tr>
              ))}
              {effectiveAssets.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-2.5 text-center text-neutral-400 italic text-[11px]">
                    No capital fleet equipment currently allocated to this project work site.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ─── Section 3: Project Material & Expense Ledger ────────────────── */}
      <section className="avoid-break">
        <div className="rounded-xs border border-neutral-200 bg-white overflow-hidden w-full">
          <div className="border-b border-neutral-200 bg-neutral-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-teal-800 flex items-center justify-between">
            <span>3. Bill of Materials &amp; Project Expense Ledger</span>
            <span className="text-[10px] text-neutral-500 font-mono">
              {effectiveExpenses.length} Expense / Material Lines
            </span>
          </div>
          <table className="w-full border-collapse text-[11px] table-auto">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-[10.5px] font-bold uppercase tracking-wider text-neutral-600">
                <th className="py-1.5 px-3 text-left whitespace-nowrap w-24">Date</th>
                <th className="py-1.5 px-3 text-left">Item / Expense Description</th>
                <th className="py-1.5 px-3 text-left whitespace-nowrap">Category</th>
                <th className="py-1.5 px-3 text-right whitespace-nowrap">Quantity</th>
                {canViewCosts && <th className="py-1.5 px-3 text-right whitespace-nowrap">Total Spend</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-[11px] text-neutral-800">
              {effectiveExpenses.map((line) => (
                <tr key={line.id}>
                  <td className="py-1.5 px-3 font-mono text-neutral-600 whitespace-nowrap">
                    {line.incurredOn || "Unrecorded"}
                  </td>
                  <td className="py-1.5 px-3 font-medium">
                    {line.consumableName || line.description || "Project material disbursement"}
                  </td>
                  <td className="py-1.5 px-3 text-neutral-600 capitalize whitespace-nowrap">
                    {line.category || "Materials"}
                  </td>
                  <td className="py-1.5 px-3 text-right font-mono text-neutral-800 whitespace-nowrap">
                    {line.quantity ? `${line.quantity} ${line.consumableUnit || "units"}` : "1 lot"}
                  </td>
                  {canViewCosts && (
                    <td className="py-1.5 px-3 text-right font-mono font-semibold text-neutral-900 whitespace-nowrap">
                      {line.amount != null ? `₱${Number(line.amount).toLocaleString()}` : "—"}
                    </td>
                  )}
                </tr>
              ))}
              {effectiveExpenses.length === 0 && (
                <tr>
                  <td colSpan={canViewCosts ? 5 : 4} className="py-2.5 text-center text-neutral-400 italic text-[11px]">
                    No material disbursements or expense lines logged for this project yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ─── Signatories Block ───────────────────────────────────────────── */}
      <section className="avoid-break pt-1">
        <PrintSignatories
          signers={[
            {
              role: "Project Head / Supervisor",
              name: projectLead,
              title: project.department || "CRMC Infrastructure Division",
            },
            {
              role: "Approved & Audited By",
              name: "VP of Administration / Auditor",
              title: "Office of the Vice President for Administration",
            },
          ]}
        />
      </section>

      {/* ─── Institutional Footer ───────────────────────────────────────── */}
      <footer className="avoid-break pt-2 border-t border-neutral-200">
        <div className="flex items-center justify-between text-[9.5px] text-neutral-500 font-mono">
          <div>Cebu Roosevelt Memorial Colleges, Inc. · CRMC-AIMS Individual Project Dossier</div>
          <div>Official Project Audit</div>
          <div suppressHydrationWarning>
            Verification Code: CRMC-PRJ-{projectCode}-{generatedAt.getTime().toString(36).toUpperCase()}
          </div>
        </div>
      </footer>
    </div>
  );
}
