import type { ProjectProgressIndicatorRow, NewProjectProgressIndicatorRow } from "@/server/db/schema";

export interface ProjectProgressIndicatorDTO {
  id: string;
  projectId: string;
  tenantId: string;
  title: string;
  description: string | null;
  targetDate: string | null;
  completedDate: string | null;
  isCompleted: boolean;
  orderIndex: number;
  completedByUserId: string | null;
  completedByName: string | null;
  createdByUserId: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectProgressSummaryDTO {
  totalIndicators: number;
  completedIndicators: number;
  pendingIndicators: number;
  progressPercentage: number;
  indicators: ProjectProgressIndicatorDTO[];
}

/** Lean counts for table rows — no indicator payloads. */
export interface ProjectProgressCountsDTO {
  projectId: string;
  totalIndicators: number;
  completedIndicators: number;
  pendingIndicators: number;
  progressPercentage: number;
}
