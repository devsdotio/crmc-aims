import { WHATS_NEW_REGISTRY } from "./registry";

export const WHATS_NEW_SEEN_KEY = "crmc_whats_new_seen_v1";

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
  } catch {
    // Ignore localStorage errors
  }
}

export function markAllFeaturesSeen(): void {
  if (typeof window === "undefined") return;
  try {
    const allIds = WHATS_NEW_REGISTRY.map((f) => f.id);
    localStorage.setItem(WHATS_NEW_SEEN_KEY, JSON.stringify(allIds));
  } catch {
    // Ignore localStorage errors
  }
}

export function resetSeenFeatures(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(WHATS_NEW_SEEN_KEY);
  } catch {
    // Ignore localStorage errors
  }
}

export function getUnseenFeaturesCount(): number {
  const seen = getSeenFeatureIds();
  return WHATS_NEW_REGISTRY.filter((f) => !seen.has(f.id)).length;
}
