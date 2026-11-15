import type { ReactNode } from "react";

export type WhatsNewCategory =
  | "Requests"
  | "Assets"
  | "Maintenance"
  | "Reports"
  | "General";

export interface WhatsNewStep {
  badge: string;
  title: string;
  subtitle: string;
  description: string;
  highlights: string[];
  mockupType?:
    | "sheet-buttons"
    | "custom-condition"
    | "dossier-print"
    | "supplies-materials-ui"
    | "cart-wizard-ui"
    | "pending-edit-ui"
    | "issued-history-ui"
    | "generic";
  mockupHighlight?: "footer-primary" | "footer-destructive" | "footer-contextual" | "header";
  customIllustration?: ReactNode;
}

export interface WhatsNewFeature {
  id: string;
  version: string;
  releaseDate: string;
  title: string;
  tagline: string;
  category: WhatsNewCategory;
  badge?: string;
  isNew?: boolean;
  steps: WhatsNewStep[];
}

export interface WhatsNewContextValue {
  isOpen: boolean;
  activeFeature: WhatsNewFeature | null;
  activeFeatureId: string | null;
  allFeatures: WhatsNewFeature[];
  unseenCount: number;
  hasUnseenNew: boolean;
  openWhatsNew: (featureId?: string) => void;
  closeWhatsNew: () => void;
  isFeatureSeen: (featureId: string) => boolean;
  markAsSeen: (featureId: string) => void;
  markAllAsSeen: () => void;
}
