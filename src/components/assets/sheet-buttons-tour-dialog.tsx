/**
 * Backwards compatibility re-exports.
 * What's New has been elevated to a permanent, reusable system in `@/features/whats-new`.
 */
export {
  WhatsNewDialog as SheetButtonsTourDialog,
  isFeatureSeen as hasSeenSheetTour,
  markFeatureSeen as markSheetTourSeen,
  resetSeenFeatures as resetSheetTour,
  useWhatsNew,
  WhatsNewProvider,
} from "@/features/whats-new";
