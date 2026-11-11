import type { WhatsNewFeature } from "./types";

export const WHATS_NEW_REGISTRY: WhatsNewFeature[] = [
  {
    id: "supplies-materials-portal-v1-3",
    version: "v1.3.0",
    releaseDate: "November 2026",
    title: "Supplies & Materials Separation, Cart & Pending Edits",
    tagline:
      "Separate Supplies, Materials, and Mixed views across your portal and queues—plus a unified Request Cart, live stock checks, and pending request editing.",
    category: "Requests",
    badge: "Latest Update",
    isNew: true,
    steps: [
      {
        badge: "Supplies · Materials · Mixed",
        title: "Clear Separation of Supplies & Materials",
        subtitle: "Dedicated views, badges, and filters across Portal & Queues",
        description:
          "Supplies and Materials are now visually separated across sidebar links, browse tabs, request cards, issued logs, and Admin approval queues—with a clear Mixed badge whenever one request combines both.",
        highlights: [
          "Dedicated Supplies and Materials navigation under Requests, plus separated Issued Supplies and Issued Materials under Inventory",
          "Filter tabs for All, Borrow, Assign, Supplies, Materials, and Mixed across My Requests and Admin Queues",
          "Distinct visual badges differentiate Supplies, Materials, and Mixed (Supplies & Materials) items at a glance",
        ],
        mockupType: "supplies-materials-ui",
      },
      {
        badge: "Cart & Multi-Type Wizard",
        title: "Unified Request Cart & Multi-Type Wizard",
        subtitle: "Checkout Assets, Supplies & Materials together without losing items",
        description:
          "Select assets, supplies, and materials together in the catalog—the sticky Request Cart keeps every item and automatically groups them into clean type bundles in the New Request Wizard.",
        highlights: [
          "Single sticky Request Cart retains borrowed equipment, assignments, supplies, and materials across tabs",
          "One-click 'Add all to Purpose 1' batch button assigns ungrouped items to your first purpose in seconds",
          "Smooth decimal quantity typing (e.g., 1.5 m or 2.5 L) with automatic unit display",
        ],
        mockupType: "cart-wizard-ui",
      },
      {
        badge: "Pending Request Edits",
        title: "Edit Pending Requests (Owners & Admin Office)",
        subtitle: "Update items, quantities, purpose, and schedules before approval",
        description:
          "Requesters can revise or cancel their own pending requests before review, and Admin Office staff can edit any requester's pending Borrow, Assign, Supplies, Materials, or Mixed request directly from the queue or detail panel.",
        highlights: [
          "Owners can edit their own pending requests while other requesters' submissions remain view-only",
          "Admin Office can adjust lines, quantities, purpose, schedule dates, and assignee for any requester",
          "Request Details show live Issued quantities alongside Requested quantities on every line item",
        ],
        mockupType: "pending-edit-ui",
      },
      {
        badge: "Out-of-Stock Requests & History",
        title: "Request Out-of-Stock Items, Custody Filter & Sheet Polish",
        subtitle: "Request any Supply or Material for restock, filter history & close sheets easily",
        description:
          "All Supplies and Materials remain visible and requestable—even when Out of Stock—so you can request what you need for Admin restock, filter History by Custody type, and close detail sheets easily on mobile.",
        highlights: [
          "Browse, Request Wizard, and 'Request again' on Issued views keep Out-of-Stock Supplies & Materials requestable for Admin restock",
          "History includes Custody filter buttons (All, Borrowed, Assigned) plus a quick search clear button",
          "Mobile Close footer button, full keyboard focus trapping, and clearer empty-state actions on detail sheets",
        ],
        mockupType: "issued-history-ui",
      },
    ],
  },
  {
    id: "asset-sheet-button-layout",
    version: "v1.2.0",
    releaseDate: "October 2026",
    title: "Sticky Action Bar & Sheet Button Redesign",
    tagline: "Action buttons are now docked at the bottom of the asset details sheet.",
    category: "Assets",
    badge: "Recent Update",
    isNew: false,
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
        title: "+ Add Custom Condition during Maintenance",
        subtitle: "Click '+ Add custom condition' to flag defects with granular tags",
        description:
          "When flagging equipment for maintenance, click '+ Add custom condition' to enter specific defect states like 'Calibration Required', 'Overheating', or 'Sensor Drift' rather than generic labels, while preserving SLA integrity.",
        highlights: [
          "Click '+ Add custom condition' directly in the maintenance dialog",
          "Enter real-world condition tags with instant auto-suggestions",
          "Frequently used conditions are saved as 1-click suggestion chips",
          "Automatically links to baseline repair severity for SLA tracking",
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
    isNew: false,
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
