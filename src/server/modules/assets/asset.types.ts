import type {
  Asset,
  AssetCategory,
  AssetStatus,
  CreateAssetInput,
  ReturnAssetInput,
  UpdateAssetInput,
} from "@/types/assets";
import type { AssetRow, NewAssetRow } from "@/server/db/schema";
import { encodeAssetQr } from "@/server/shared/qr";

export type {
  Asset,
  AssetCategory,
  AssetStatus,
  CreateAssetInput,
  ReturnAssetInput,
  UpdateAssetInput,
};

import type { PaginationParams } from "@/types/filters";

/**
 * List filters supported by GET /api/assets.
 */
export interface ListAssetsFilters extends PaginationParams {
  status?: AssetStatus;
  modelId?: string;
  category?: string;
  search?: string;
  assignmentType?: "borrowable" | "assignable";
  /** When true, only units with no current holder and no approved reservation. */
  availableOnly?: boolean;
  /** Request-wizard catalog: skip department custody scope for borrowers. */
  catalog?: boolean;
  /**
   * Open department custody only (borrow + assignment-to-dept, no projects).
   * Set from session for borrowers — never from client departmentId.
   */
  departmentHeldId?: string;
  /** Superadmin-only: include sandbox/testing catalog rows. */
  includeSandbox?: boolean;
}

/**
 * Asset API DTO with QR + model link for scanners and multi-unit catalog.
 */
export type AssetDTOWithMeta = Asset & {
  modelId?: string;
  qrPayload: string;
};

export function withAssetMeta(asset: Asset & { modelId?: string | null }): AssetDTOWithMeta {
  return {
    ...asset,
    modelId: asset.modelId ?? undefined,
    qrPayload: encodeAssetQr(asset.assetCode),
  };
}

/**
 * Persistence contract. The service depends only on this interface so
 * repositories can be swapped or mocked in tests.
 */
export interface IAssetRepository {
  getCategoryDistribution(
    session?: import("@/server/db/transaction").DbSession,
    tenantId?: string
  ): Promise<{ category: string; count: number }[]>;
  countAssigned(
    session?: import("@/server/db/transaction").DbSession,
    tenantId?: string
  ): Promise<number>;
  countByType(
    type: "borrowable" | "assignable",
    session?: import("@/server/db/transaction").DbSession,
    tenantId?: string
  ): Promise<number>;
  findMany(
    filters?: ListAssetsFilters,
    session?: import("@/server/db/transaction").DbSession,
    tenantId?: string
  ): Promise<AssetRow[]>;
  findById(
    id: string,
    session?: import("@/server/db/transaction").DbSession,
    tenantId?: string
  ): Promise<AssetRow | null>;
  findByIds(
    ids: string[],
    session?: import("@/server/db/transaction").DbSession,
    tenantId?: string
  ): Promise<AssetRow[]>;
  findByAssetCode(
    assetCode: string,
    session?: import("@/server/db/transaction").DbSession,
    tenantId?: string
  ): Promise<AssetRow | null>;
  findByModelId(
    modelId: string,
    session?: import("@/server/db/transaction").DbSession,
    tenantId?: string
  ): Promise<AssetRow[]>;
  create(
    data: Omit<NewAssetRow, "id" | "createdAt" | "updatedAt" | "lastUpdated"> &
      Partial<Pick<NewAssetRow, "lastUpdated">>,
    session?: import("@/server/db/transaction").DbSession
  ): Promise<AssetRow>;
  update(
    id: string,
    data: Partial<Omit<AssetRow, "id" | "createdAt">>,
    session?: import("@/server/db/transaction").DbSession,
    tenantId?: string
  ): Promise<AssetRow | null>;
  delete(
    id: string,
    session?: import("@/server/db/transaction").DbSession,
    tenantId?: string
  ): Promise<boolean>;
}
