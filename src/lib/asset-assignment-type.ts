import type { AssetAssignmentType } from "@/types/assets";

export type AssignmentTypeFilter = "all" | AssetAssignmentType;

export const ASSIGNMENT_TYPE_FILTER_OPTIONS: {
  id: AssignmentTypeFilter;
  label: string;
}[] = [
  { id: "all", label: "All" },
  { id: "borrowable", label: "Borrowable" },
  { id: "assignable", label: "Assignable" },
];

export function assignmentTypeLabel(type: AssetAssignmentType): string {
  return type === "assignable" ? "Assignable" : "Borrowable";
}

export function assignmentTypeShortLabel(type: AssetAssignmentType): string {
  return type === "assignable" ? "Assign" : "Borrow";
}

export const ASSIGNMENT_TYPE_BADGE_CLASS: Record<AssetAssignmentType, string> = {
  borrowable:
    "bg-status-retired-bg/15 text-status-retired-text border-status-retired-bg/25",
  assignable:
    "bg-status-repair-bg/15 text-status-repair-text border-status-repair-bg/30",
};
