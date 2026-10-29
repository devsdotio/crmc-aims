"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { WhatsNewContextValue } from "./types";
import { WHATS_NEW_REGISTRY, getFeatureById } from "./registry";
import {
  isFeatureSeen,
  markFeatureSeen,
  markAllFeaturesSeen,
  getUnseenFeaturesCount,
} from "./storage";
import { WhatsNewDialog } from "./whats-new-dialog";

const WhatsNewContext = createContext<WhatsNewContextValue | null>(null);

export function WhatsNewProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeFeatureId, setActiveFeatureId] = useState<string | null>(null);
  const [unseenCount, setUnseenCount] = useState(0);

  // Sync unseen count on client mount
  const refreshUnseenCount = useCallback(() => {
    setUnseenCount(getUnseenFeaturesCount());
  }, []);

  useEffect(() => {
    refreshUnseenCount();
  }, [refreshUnseenCount]);

  const openWhatsNew = useCallback(
    (featureId?: string) => {
      setActiveFeatureId(featureId || null);
      setIsOpen(true);
    },
    []
  );

  const closeWhatsNew = useCallback(() => {
    setIsOpen(false);
    refreshUnseenCount();
  }, [refreshUnseenCount]);

  const handleMarkSeen = useCallback(
    (featureId: string) => {
      markFeatureSeen(featureId);
      refreshUnseenCount();
    },
    [refreshUnseenCount]
  );

  const handleMarkAllSeen = useCallback(() => {
    markAllFeaturesSeen();
    refreshUnseenCount();
  }, [refreshUnseenCount]);

  const activeFeature = activeFeatureId
    ? getFeatureById(activeFeatureId) ?? null
    : null;

  const value: WhatsNewContextValue = {
    isOpen,
    activeFeature,
    activeFeatureId,
    allFeatures: WHATS_NEW_REGISTRY,
    unseenCount,
    openWhatsNew,
    closeWhatsNew,
    isFeatureSeen,
    markAsSeen: handleMarkSeen,
    markAllAsSeen: handleMarkAllSeen,
  };

  return (
    <WhatsNewContext.Provider value={value}>
      {children}
      <WhatsNewDialog
        isOpen={isOpen}
        onClose={closeWhatsNew}
        initialFeatureId={activeFeatureId}
        features={WHATS_NEW_REGISTRY}
        onMarkSeen={handleMarkSeen}
      />
    </WhatsNewContext.Provider>
  );
}

export function useWhatsNew(): WhatsNewContextValue {
  const context = useContext(WhatsNewContext);
  if (!context) {
    throw new Error("useWhatsNew must be used within a WhatsNewProvider");
  }
  return context;
}
