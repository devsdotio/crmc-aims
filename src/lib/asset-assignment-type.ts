import type { AssetAssignmentType } from "@/types/assets";

export type AssignmentTypeFilter = "all" | AssetAssignmentType;

export const ASSIGNMENT_TYPE_FILTER_OPTIONS: {
  id: AssignmentTypeFilter;
  label: string;
}[] = [
  { id: "all", label: "All" },
  { id: "borrowable", label: "Borrowable" },
  { id: "assignable", label: "Assignable" },
  { id: "fixed", label: "Fixed" },
];

export function assignmentTypeLabel(type: AssetAssignmentType): string {
  if (type === "assignable") return "Assignable";
  if (type === "fixed") return "Fixed";
  return "Borrowable";
}

export function assignmentTypeShortLabel(type: AssetAssignmentType): string {
  if (type === "assignable") return "Assign";
  if (type === "fixed") return "Fixed";
  return "Borrow";
}

export const ASSIGNMENT_TYPE_BADGE_CLASS: Record<AssetAssignmentType, string> = {
  borrowable:
    "bg-status-retired-bg/15 text-status-retired-text border-status-retired-bg/25",
  assignable:
    "bg-status-repair-bg/15 text-status-repair-text border-status-repair-bg/30",
  fixed: "bg-sky-500/15 text-sky-800 border-sky-500/30",
};
