"use client";

import { MoreHorizontal, Pencil, Trash2, Eye, Loader2, MapPin, Building2 } from "lucide-react";
import type { Project } from "@/types/projects";
import type { ProjectProgressCounts } from "@/features/projects/client/use-projects";
import { ProjectStatusBadge } from "./project-status-badge";
import { formatPhp } from "./format-money";

export interface ProjectTableRowProps {
  project: Project;
  progress?: ProjectProgressCounts | null;
  deleting?: boolean;
  onSelect: (project: Project) => void;
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
}

export function ProjectTableRow({
  project,
  progress,
  deleting = false,
  onSelect,
  onEdit,
  onDelete,
}: ProjectTableRowProps) {
  const canDelete =
    project.isMutable &&
    (project.status === "draft" || project.status === "cancelled");

  const totalInd = progress?.totalIndicators ?? 0;
  const doneInd = progress?.completedIndicators ?? 0;
  const progressPct = progress?.progressPercentage ?? 0;

  return (
    <tr
      className="border-b border-border bg-bg hover:bg-bg-subtle/70 transition-colors cursor-pointer group"
      onClick={() => onSelect(project)}
    >
      <td className="px-5 py-3.5">
        <div className="font-bold text-sm text-text leading-tight group-hover:text-accent transition-colors">
          {project.name}
        </div>
        <div className="text-[11px] font-mono text-text-secondary mt-0.5">
          {project.projectCode}
        </div>
      </td>
      <td className="px-3 py-3.5">
        <ProjectStatusBadge status={project.status} />
      </td>
      <td className="px-3 py-3.5 text-xs text-text-secondary hidden md:table-cell">
        {project.location ? (
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3 w-3 text-text-secondary shrink-0" />
            <span className="truncate max-w-32">{project.location}</span>
          </span>
        ) : (
          "—"
        )}
      </td>
      <td className="px-3 py-3.5 text-xs text-text-secondary hidden lg:table-cell">
        {project.department ? (
          <span className="inline-flex items-center gap-1">
            <Building2 className="h-3 w-3 text-text-secondary shrink-0" />
            <span className="truncate max-w-32">{project.department}</span>
          </span>
        ) : (
          "—"
        )}
      </td>
      <td className="px-3 py-3.5 text-xs font-mono tabular-nums text-text-secondary hidden sm:table-cell">
        {formatPhp(project.totalSpent)}
      </td>
      <td className="px-3 py-3.5 hidden xl:table-cell">
        {totalInd > 0 ? (
          <div className="space-y-1 w-28">
            <div className="flex items-center justify-between text-[10px] font-bold text-text">
              <span className="text-teal-700 dark:text-teal-400">{progressPct}%</span>
              <span className="text-text-secondary font-normal font-mono">
                {doneInd}/{totalInd}
              </span>
            </div>
            <div className="w-full bg-border rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-teal-600 dark:bg-teal-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        ) : (
          <span className="text-[10px] text-text-secondary/70 italic">No indicators</span>
        )}
      </td>
      <td className="px-5 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-end items-center gap-1.5">
          <button
            type="button"
            onClick={() => onSelect(project)}
            className="inline-flex items-center gap-1 h-7 px-2.5 text-[11px] font-bold rounded-lg border border-border bg-bg-subtle text-text hover:bg-border/70 hover:text-text transition-colors cursor-pointer"
            title="View Details"
          >
            <Eye className="h-3.5 w-3.5" />
            View
          </button>
          {project.isMutable && (
            <button
              type="button"
              onClick={() => onEdit(project)}
              className="inline-flex items-center gap-1 h-7 px-2.5 text-[11px] font-bold rounded-lg border border-border bg-bg text-text hover:bg-bg-subtle transition-colors cursor-pointer"
              title="Edit Project"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              onClick={() => onDelete(project)}
              disabled={deleting}
              className="inline-flex items-center justify-center h-7 w-7 rounded-lg border border-border text-status-outofservice-text hover:bg-status-outofservice-bg/15 hover:border-status-outofservice-bg/30 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
              title="Delete Project"
              aria-label="Delete project"
            >
              {deleting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
            </button>
          )}
          {!project.isMutable && (
            <span className="inline-flex items-center h-7 px-2 text-[10px] font-bold text-text-secondary opacity-40">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </span>
          )}
        </div>
      </td>
    </tr>
  );
}
