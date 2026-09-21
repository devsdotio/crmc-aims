/**
 * Consumables client data layer.
 */

export { consumablesApi } from "./consumables-api";
export type {
  ConsumableItem,
  CreateConsumablePayload,
  RestockPayload,
  StockAdjustPayload,
  StockMovementPayload,
  UpdateConsumablePayload,
} from "./consumables-api";
export { consumableQueryKeys } from "./query-keys";
export {
  useAdjustConsumableMutation,
  useConsumableQuery,
  useConsumablesQuery,
  useCreateConsumableMutation,
  useRestockConsumableMutation,
  useUpdateConsumableMutation,
} from "./use-consumables";
