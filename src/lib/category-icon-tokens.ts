/**
 * Lucide icon ids stored on `categories.icon_token`.
 * CategoryIcon and the picker both read this list so they cannot drift.
 * Migration 0052 repeats the same ids when backfilling exclusive tokens.
 */
export const CATEGORY_ICON_DEFS = [
  { id: "monitor", name: "Monitor" },
  { id: "laptop", name: "Laptop" },
  { id: "tablet", name: "Tablet" },
  { id: "smartphone", name: "Phone" },
  { id: "keyboard", name: "Keyboard" },
  { id: "mouse", name: "Mouse" },
  { id: "cpu", name: "CPU" },
  { id: "hard-drive", name: "Storage" },
  { id: "server", name: "Server" },
  { id: "printer", name: "Printer" },
  { id: "camera", name: "Camera" },
  { id: "video", name: "Video" },
  { id: "speaker", name: "Speaker" },
  { id: "headphones", name: "Headphones" },
  { id: "tv", name: "Display" },
  { id: "truck", name: "Truck" },
  { id: "car", name: "Car" },
  { id: "bus", name: "Bus" },
  { id: "bike", name: "Bike" },
  { id: "ambulance", name: "Ambulance" },
  { id: "armchair", name: "Armchair" },
  { id: "sofa", name: "Sofa" },
  { id: "lamp", name: "Lamp" },
  { id: "building", name: "Building" },
  { id: "warehouse", name: "Warehouse" },
  { id: "key", name: "Key" },
  { id: "shield", name: "Security" },
  { id: "package", name: "Package" },
  { id: "archive", name: "Archive" },
  { id: "boxes", name: "Boxes" },
  { id: "clipboard", name: "Clipboard" },
  { id: "file-text", name: "Document" },
  { id: "book", name: "Book" },
  { id: "scissors", name: "Scissors" },
  { id: "wrench", name: "Wrench" },
  { id: "hammer", name: "Hammer" },
  { id: "ruler", name: "Ruler" },
  { id: "stethoscope", name: "Medical" },
  { id: "syringe", name: "Syringe" },
  { id: "pill", name: "Pharmacy" },
  { id: "heart-pulse", name: "Clinical" },
  { id: "thermometer", name: "Thermometer" },
  { id: "flask-conical", name: "Laboratory" },
  { id: "microscope", name: "Microscope" },
  { id: "droplet", name: "Liquid" },
  { id: "utensils", name: "Utensils" },
  { id: "plug", name: "Power" },
  { id: "zap", name: "Electrical" },
  { id: "bed", name: "Bed" },
  { id: "door-open", name: "Door" },
  { id: "lock", name: "Lock" },
  { id: "folder", name: "Folder" },
  { id: "inbox", name: "Inbox" },
  { id: "tag", name: "Tag" },
  { id: "layers", name: "Layers" },
  { id: "pencil", name: "Pencil" },
  { id: "calculator", name: "Calculator" },
  { id: "graduation-cap", name: "Education" },
  { id: "briefcase", name: "Briefcase" },
  { id: "phone", name: "Telephone" },
  { id: "radio", name: "Radio" },
  { id: "wifi", name: "Network" },
  { id: "battery", name: "Battery" },
  { id: "fan", name: "Fan" },
  { id: "lightbulb", name: "Light" },
  { id: "cog", name: "Settings" },
  { id: "recycle", name: "Recycle" },
  { id: "leaf", name: "Leaf" },
  { id: "apple", name: "Food" },
  { id: "shirt", name: "Apparel" },
  { id: "glasses", name: "Glasses" },
  { id: "eye", name: "Vision" },
  { id: "bandage", name: "First Aid" },
  { id: "beaker", name: "Beaker" },
  { id: "shopping-cart", name: "Cart" },
  { id: "clock", name: "Clock" },
  { id: "calendar", name: "Calendar" },
  { id: "map-pin", name: "Location" },
  { id: "hospital", name: "Hospital" },
  { id: "plane", name: "Aircraft" },
] as const;

export type CategoryIconId = (typeof CATEGORY_ICON_DEFS)[number]["id"];

export const CATEGORY_ICON_IDS: readonly CategoryIconId[] = CATEGORY_ICON_DEFS.map(
  (icon) => icon.id
);

const CATEGORY_ICON_ID_SET: ReadonlySet<string> = new Set(CATEGORY_ICON_IDS);

export function isCategoryIconId(value: string): value is CategoryIconId {
  return CATEGORY_ICON_ID_SET.has(value);
}

export function takenIconTokens(
  rows: ReadonlyArray<{ id?: string; iconToken?: string | null }>,
  exceptId?: string
): Set<string> {
  const taken = new Set<string>();
  for (const row of rows) {
    if (exceptId && row.id === exceptId) continue;
    const token = row.iconToken?.trim();
    if (token) taken.add(token);
  }
  return taken;
}

/** First palette id not already used in the tenant. Null when the palette is exhausted. */
export function nextFreeIconToken(taken: ReadonlySet<string>): CategoryIconId | null {
  for (const id of CATEGORY_ICON_IDS) {
    if (!taken.has(id)) return id;
  }
  return null;
}
