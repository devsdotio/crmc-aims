import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  WHATS_NEW_REGISTRY,
  getFeatureById,
  LATEST_FEATURE,
} from "@/features/whats-new/registry";
import {
  isFeatureSeen,
  markFeatureSeen,
  markAllFeaturesSeen,
  resetSeenFeatures,
  getUnseenFeaturesCount,
  WHATS_NEW_SEEN_KEY,
} from "@/features/whats-new/storage";

describe("WhatsNew Feature Registry", () => {
  it("contains registered platform updates", () => {
    expect(WHATS_NEW_REGISTRY.length).toBeGreaterThanOrEqual(1);
  });

  it("includes the asset sheet button layout feature", () => {
    const feature = getFeatureById("asset-sheet-button-layout");
    expect(feature).toBeDefined();
    expect(feature?.title).toContain("Sticky Action Bar");
    expect(feature?.steps.length).toBe(4);
  });

  it("returns undefined for non-existent feature IDs", () => {
    expect(getFeatureById("non-existent-feature-id")).toBeUndefined();
  });

  it("has valid steps with highlights for all registered features", () => {
    for (const feature of WHATS_NEW_REGISTRY) {
      expect(feature.id).toBeTruthy();
      expect(feature.title).toBeTruthy();
      expect(feature.steps.length).toBeGreaterThan(0);
      for (const step of feature.steps) {
        expect(step.title).toBeTruthy();
        expect(step.description).toBeTruthy();
        expect(step.highlights.length).toBeGreaterThan(0);
      }
    }
  });

  it("defines the latest feature", () => {
    expect(LATEST_FEATURE).toBe(WHATS_NEW_REGISTRY[0]);
  });
});

describe("WhatsNew Storage & Seen State", () => {
  const store: Record<string, string> = {};

  beforeEach(() => {
    for (const k in store) delete store[k];
    const mockStorage = {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
    };
    vi.stubGlobal("window", { localStorage: mockStorage });
    vi.stubGlobal("localStorage", mockStorage);
  });

  it("identifies unseen feature by default", () => {
    expect(isFeatureSeen("asset-sheet-button-layout")).toBe(false);
  });

  it("marks a feature as seen", () => {
    markFeatureSeen("asset-sheet-button-layout");
    expect(isFeatureSeen("asset-sheet-button-layout")).toBe(true);
  });

  it("calculates unseen feature count correctly", () => {
    const total = WHATS_NEW_REGISTRY.length;
    expect(getUnseenFeaturesCount()).toBe(total);

    markFeatureSeen("asset-sheet-button-layout");
    expect(getUnseenFeaturesCount()).toBe(total - 1);
  });

  it("marks all features as seen", () => {
    markAllFeaturesSeen();
    expect(getUnseenFeaturesCount()).toBe(0);
    for (const feature of WHATS_NEW_REGISTRY) {
      expect(isFeatureSeen(feature.id)).toBe(true);
    }
  });

  it("resets seen features properly", () => {
    markAllFeaturesSeen();
    expect(getUnseenFeaturesCount()).toBe(0);

    resetSeenFeatures();
    expect(getUnseenFeaturesCount()).toBe(WHATS_NEW_REGISTRY.length);
  });
});
