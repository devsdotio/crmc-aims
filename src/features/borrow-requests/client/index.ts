/**
 * Borrow requests client data layer — prepared for UI integration, not wired yet.
 */

export { borrowRequestsApi } from "./borrow-requests-api";
export type {
  ApproveBorrowRequestPayload,
  BorrowRequest,
  CreateBorrowRequestPayload,
} from "./borrow-requests-api";
export { borrowRequestQueryKeys } from "./query-keys";
export {
  useApproveBorrowRequestMutation,
  useBorrowRequestQuery,
  useBorrowRequests,
  useCancelBorrowRequestMutation,
  useCreateBorrowRequestMutation,
  useRejectBorrowRequestMutation,
  useReleaseBorrowRequestMutation,
  useMarkUnreleasedBorrowRequestMutation,
  useUndoBorrowRequestApprovalMutation,
} from "./use-borrow-requests";
