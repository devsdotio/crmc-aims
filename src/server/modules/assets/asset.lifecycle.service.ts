import type { AssetLifecycleEventRow } from "@/server/db/schema";

import { AssetLifecycleRepository } from "./asset.lifecycle.repository";
import type {
  AssetLifecycleEventDTO,
  ListLifecycleEventsFilters,
  RecordLifecycleEventInput,
} from "./asset.lifecycle.types";

function toLifecycleDTO(row: AssetLifecycleEventRow): AssetLifecycleEventDTO {
  return {
    id: row.id,
    assetId: row.assetId,
    assetCode: row.assetCode,
    eventType: row.eventType,
    actor: {
      userId: row.actorUserId,
      email: row.actorEmail,
      displayName: row.actorDisplayName,
    },
    fromStatus: row.fromStatus,
    toStatus: row.toStatus,
    fromHolder: row.fromHolder,
    toHolder: row.toHolder,
    payload: row.payload ?? {},
    createdAt: row.createdAt ? (row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt)) : new Date().toISOString(),
  };
}

/**
 * Owns append-only recording and reads of the asset lifecycle ledger.
 * Asset mutations go through AssetService, which calls `record`.
 */
export class AssetLifecycleService {
  constructor(
    private readonly lifecycleRepository: AssetLifecycleRepository = new AssetLifecycleRepository()
  ) {}

  async record(
    input: RecordLifecycleEventInput,
    session?: import("@/server/db/transaction").DbSession
  ): Promise<AssetLifecycleEventDTO> {
    const row = await this.lifecycleRepository.append(
      {
        assetId: input.assetId,
        assetCode: input.assetCode,
        eventType: input.eventType,
        actorUserId: input.actor.userId,
        actorEmail: input.actor.email,
        actorDisplayName: input.actor.displayName,
        fromStatus: input.fromStatus ?? null,
        toStatus: input.toStatus ?? null,
        fromHolder: input.fromHolder ?? null,
        toHolder: input.toHolder ?? null,
        payload: input.payload ?? {},
      },
      session
    );

    return toLifecycleDTO(row);
  }

  async listForAsset(
    assetId: string,
    limit = 100
  ): Promise<AssetLifecycleEventDTO[]> {
    const rows = await this.lifecycleRepository.findByAssetId(assetId, limit);
    return rows.map(toLifecycleDTO);
  }

  async list(filters: ListLifecycleEventsFilters = {}): Promise<AssetLifecycleEventDTO[]> {
    const rows = await this.lifecycleRepository.findMany(filters);
    return rows.map(toLifecycleDTO);
  }
}
