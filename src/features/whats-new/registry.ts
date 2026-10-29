import type { WhatsNewFeature } from "./types";

export const WHATS_NEW_REGISTRY: WhatsNewFeature[] = [
  {
    id: "asset-sheet-button-layout",
    version: "v1.2.0",
    releaseDate: "October 2026",
    title: "Sticky Action Bar & Sheet Button Redesign",
    tagline: "Action buttons are now docked at the bottom of the asset details sheet.",
    category: "Assets",
    badge: "Recent Update",
    isNew: true,
    steps: [
      {
        badge: "Step 1 of 4 · Bottom Action Bar",
        title: "Sticky Action Bar at the Bottom",
        subtitle: "Always visible while scrolling through details",
        description:
          "All primary actions (Issue Asset, Flag Maintenance, and Edit Details) are now permanently docked at the bottom of the drawer. You can read technical specifications, financial TCO, and custody history without losing access to your buttons.",
        highlights: [
          "Fixed to viewport bottom as you scroll",
          "Full touch-friendly targets with clear text labels",
          "No need to scroll all the way back up to take action",
        ],
        mockupType: "sheet-buttons",
        mockupHighlight: "footer-primary",
      },
      {
        badge: "Step 2 of 4 · Safety Separation",
        title: "Isolated Destructive Action",
        subtitle: "Delete Asset is safely anchored to the bottom-left",
        description:
          "Previously, the delete button was packed directly beside daily utility icons. Delete is now isolated on the bottom-left with a cautious hover style, separated from operational buttons to prevent accidental asset deletion.",
        highlights: [
          "Anchored to bottom-left corner away from primary CTAs",
          "Subtle warning styling with confirmation dialog",
          "Zero risk of accidental mis-clicks while issuing or editing",
        ],
        mockupType: "sheet-buttons",
        mockupHighlight: "footer-destructive",
      },
      {
        badge: "Step 3 of 5 · Contextual CTAs",
        title: "Adaptive Primary Call-to-Action",
        subtitle: "The main button reflects the asset's current state",
        description:
          "The rightmost button automatically changes depending on the asset's current operational condition, guiding you to the most sensible next step:",
        highlights: [
          "Needs Repair ➔ Shows 'Mark Serviceable' in status orange",
          "Active & In Stock ➔ Shows 'Issue Asset' in emerald green",
          "In Custody / Fixed ➔ Shows 'Flag Maintenance' in amber",
        ],
        mockupType: "sheet-buttons",
        mockupHighlight: "footer-contextual",
      },
      {
        badge: "Step 4 of 5 · Custom Conditions",
        title: "Custom Conditions during Maintenance",
        subtitle: "Flag defects with granular condition tags",
        description:
          "Clicking Flag Maintenance allows you to enter specific equipment conditions like 'Calibration Required', 'Overheating', or 'Sensor Drift' rather than generic labels, while seamlessly preserving system SLA integrity.",
        highlights: [
          "Enter real-world condition tags with instant suggestions",
          "Frequently used condition tags are saved for 1-click selection",
          "Maintains accurate baseline reporting for SLA tracking",
        ],
        mockupType: "custom-condition",
      },
      {
        badge: "Step 5 of 5 · Clean Header",
        title: "De-cluttered Header & Print Utility",
        subtitle: "Focused on orientation and document generation",
        description:
          "The top bar has been cleared of the cramped icon buttons. It now cleanly displays the asset title, status badge, and asset code, with quick access to the enhanced Print Dossier (PDF) report.",
        highlights: [
          "Clean asset title with status and availability badges",
          "Quick access to Print Dossier Report in top right",
          "Close drawer anytime with backdrop click, Esc, or footer",
        ],
        mockupType: "sheet-buttons",
        mockupHighlight: "header",
      },
    ],
  },
  {
    id: "custom-asset-conditions",
    version: "v1.1.0",
    releaseDate: "October 2026",
    title: "Custom Conditions for Maintenance Flagging",
    tagline: "Define custom defect and damage states with baseline severity mappings.",
    category: "Maintenance",
    badge: "Operational",
    isNew: true,
    steps: [
      {
        badge: "Step 1 of 2 · Flexible Tagging",
        title: "Create Custom Asset Conditions",
        subtitle: "Beyond generic 'Damaged' or 'Needs Repair'",
        description:
          "Specify exact real-world equipment statuses such as 'Calibration Required', 'Overheating', or 'Screen Flicker' when flagging items for technical service.",
        highlights: [
          "Type any custom condition name up to 100 characters",
          "Quick suggestion chips remember frequently used conditions",
          "Saved locally across sessions for instant re-selection",
        ],
        mockupType: "custom-condition",
      },
      {
        badge: "Step 2 of 2 · Severity Mapping",
        title: "Automatic Baseline Severity Mapping",
        subtitle: "Ensures reporting & lifecycle consistency",
        description:
          "Custom conditions automatically link to a baseline severity (Needs Repair or Damaged/Out of Service), preserving accurate system status badges and SLA calculations.",
        highlights: [
          "Clean condition tag rendering on maintenance logs",
          "Full validation on server and client inputs",
          "Consistent lifecycle history logging",
        ],
        mockupType: "custom-condition",
      },
    ],
  },
  {
    id: "individual-asset-dossier-print",
    version: "v1.1.0",
    releaseDate: "October 2026",
    title: "Official Equipment Dossier Printout",
    tagline: "Institutional audit report with portrait layout, QR verification tag, and signatories.",
    category: "Reports",
    badge: "Official Record",
    isNew: false,
    steps: [
      {
        badge: "Step 1 of 2 · Institutional Layout",
        title: "Standard Portrait Report Format",
        subtitle: "Optimized for Letter & A4 paper printing",
        description:
          "Individual asset dossiers now print on standard portrait orientation with guaranteed safety margins, preventing content from touching or clipping off the paper edges.",
        highlights: [
          "Guaranteed 10mm-12mm physical print safety margins",
          "CRMC seal and institutional header at full resolution",
          "Complete technical specifications and TCO metrics",
        ],
        mockupType: "dossier-print",
      },
      {
        badge: "Step 2 of 2 · Scannable Verification",
        title: "Scannable QR Verification & Signatories",
        subtitle: "Instant physical-to-digital audit verification",
        description:
          "Each printed dossier includes a scannable QR verification code in the header and official custody sign-off lines for Property Custodian, Maintenance Lead, and Current Custodian.",
        highlights: [
          "Scannable QR code linking to digital asset record",
          "Formal 3-signatory custody verification block",
          "Unique tamper-evident verification code and timestamp",
        ],
        mockupType: "dossier-print",
      },
    ],
  },
];

export function getFeatureById(id: string): WhatsNewFeature | undefined {
  return WHATS_NEW_REGISTRY.find((feature) => feature.id === id);
}

export const LATEST_FEATURE = WHATS_NEW_REGISTRY[0];
