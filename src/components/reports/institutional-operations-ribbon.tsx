"use client";

import Link from "next/link";
import { FolderKanban, Building2, ArrowRight, Layers, ShieldCheck } from "lucide-react";

interface InstitutionalOperationsRibbonProps {
  isLoading?: boolean;
  canViewCosts?: boolean;
  projects?: {
    totalProjects: number;
    activeProjects: number;
    completedProjects: number;
    totalProjectSpend: number;
    totalAssetsAssigned: number;
    totalSuppliesConsumed?: number;
    totalMaterialsConsumed?: number;
  };
  departments?: {
    totalDepartments: number;
    totalAssetsDeployed: number;
    totalAssetsValue: number;
    totalConsumablesValue: number;
    totalSuppliesValue?: number;
    totalMaterialsValue?: number;
    mostActiveByAssets: string | null;
    totalSuppliesConsumed?: number;
    totalMaterialsConsumed?: number;
  };
}

export function InstitutionalOperationsRibbon({
  isLoading = false,
  canViewCosts = true,
  projects,
  departments,
}: InstitutionalOperationsRibbonProps) {
  const activeProjects = projects?.activeProjects || 0;
  const totalProjects = projects?.totalProjects || 0;
  const projectSpend = projects?.totalProjectSpend || 0;
  const assignedAssets = projects?.totalAssetsAssigned || 0;

  const totalDepts = departments?.totalDepartments || 0;
  const deployedAssets = departments?.totalAssetsDeployed || 0;
  const deptsFleetValue = departments?.totalAssetsValue || 0;
  const topDept = departments?.mostActiveByAssets || "Campus Wide";

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {/* ── 1. Projects & Initiatives Summary Strip ───────────────────── */}
      <Link
        href="/reports/projects"
        className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-border/80 bg-card p-4 hover:border-purple-500/50 hover:shadow-xs transition-all cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
            <FolderKanban className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-text group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                Institutional Projects &amp; Ventures
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                {activeProjects} Active
              </span>
            </div>
            <div className="text-[11px] text-text-secondary mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span>{totalProjects} total initiatives</span>
              <span>·</span>
              <span>{assignedAssets} equipment units assigned</span>
              {canViewCosts && (
                <>
                  <span>·</span>
                  <span className="font-mono font-semibold text-text">
                    ₱{projectSpend.toLocaleString()} billed
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
            View Projects <ArrowRight className="h-3 w-3" />
          </span>
        </div>
      </Link>

      {/* ── 2. Department Operating Units Strip ───────────────────────── */}
      <Link
        href="/reports/departments"
        className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-border/80 bg-card p-4 hover:border-sky-500/50 hover:shadow-xs transition-all cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-text group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                Department Units &amp; Governance
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                {totalDepts} Operating Units
              </span>
            </div>
            <div className="text-[11px] text-text-secondary mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span>{deployedAssets} deployed fleet units</span>
              <span>·</span>
              <span className="font-medium text-text">Top: {topDept}</span>
              {canViewCosts && deptsFleetValue > 0 && (
                <>
                  <span>·</span>
                  <span className="font-mono font-semibold text-text">
                    ₱{deptsFleetValue.toLocaleString()}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <span className="text-[11px] font-bold text-sky-600 dark:text-sky-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
            View Departments <ArrowRight className="h-3 w-3" />
          </span>
        </div>
      </Link>
    </div>
  );
}

