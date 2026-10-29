import { WHATS_NEW_REGISTRY } from "./registry";

export const WHATS_NEW_SEEN_KEY = "crmc_whats_new_seen_v1";
export const WHATS_NEW_UPDATE_EVENT = "crmc:whats-new-update";

function notifyUpdate(): void {
  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(new CustomEvent(WHATS_NEW_UPDATE_EVENT));
    } catch {
      // Ignore in non-browser environments
    }
  }
}

export function getSeenFeatureIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(WHATS_NEW_SEEN_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

export function isFeatureSeen(featureId: string): boolean {
  const seen = getSeenFeatureIds();
  return seen.has(featureId);
}

export function markFeatureSeen(featureId: string): void {
  if (typeof window === "undefined") return;
  try {
    const seen = getSeenFeatureIds();
    seen.add(featureId);
    localStorage.setItem(WHATS_NEW_SEEN_KEY, JSON.stringify(Array.from(seen)));
    notifyUpdate();
  } catch {
    // Ignore localStorage errors
  }
}

export function markAllFeaturesSeen(): void {
  if (typeof window === "undefined") return;
  try {
    const allIds = WHATS_NEW_REGISTRY.map((f) => f.id);
    localStorage.setItem(WHATS_NEW_SEEN_KEY, JSON.stringify(allIds));
    notifyUpdate();
  } catch {
    // Ignore localStorage errors
  }
}

export function resetSeenFeatures(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(WHATS_NEW_SEEN_KEY);
    notifyUpdate();
  } catch {
    // Ignore localStorage errors
  }
}

/**
 * Returns count of unseen features.
 * When `onlyNew` is false (default for backwards compatibility with tests), counts all unseen features across registry.
 * When `onlyNew` is true, counts only features marked `isNew: true`.
 */
export function getUnseenFeaturesCount(onlyNew = false): number {
  const seen = getSeenFeatureIds();
  const list = onlyNew
    ? WHATS_NEW_REGISTRY.filter((f) => f.isNew)
    : WHATS_NEW_REGISTRY;
  return list.filter((f) => !seen.has(f.id)).length;
}

/**
 * Returns count of unviewed new platform features (isNew: true).
 */
export function getUnseenNewFeaturesCount(): number {
  return getUnseenFeaturesCount(true);
}

/**
 * Returns whether there are any new platform updates that the user has not yet viewed.
 * Returns false if all `isNew: true` features (or the latest release) have been marked seen.
 */
export function hasUnseenNewFeatures(): boolean {
  const seen = getSeenFeatureIds();
  const newFeatures = WHATS_NEW_REGISTRY.filter((f) => f.isNew);
  if (newFeatures.length === 0) {
    const latest = WHATS_NEW_REGISTRY[0];
    return latest ? !seen.has(latest.id) : false;
  }
  return newFeatures.some((f) => !seen.has(f.id));
}
