export interface CategoryStyleMeta {
  bg: string;
  text: string;
  label: string;
  cssVar?: string;
}

export const CATEGORY_STYLES: Record<string, CategoryStyleMeta> = {
  transport:   { bg: "bg-category-transport-bg", text: "text-white font-bold", label: "Transport", cssVar: "var(--color-category-transport-bg)" },
  computing:   { bg: "bg-category-computing-bg", text: "text-white font-bold", label: "Computing", cssVar: "var(--color-category-computing-bg)" },
  av:          { bg: "bg-category-av-bg",        text: "text-white font-bold", label: "AV Equipment", cssVar: "var(--color-category-av-bg)" },
  furniture:   { bg: "bg-category-furniture-bg", text: "text-white font-bold", label: "Furniture", cssVar: "var(--color-category-furniture-bg)" },
  medical:     { bg: "bg-rose-600",              text: "text-white font-bold", label: "Medical", cssVar: "#E11D48" },
  office:      { bg: "bg-amber-600",             text: "text-white font-bold", label: "Office Supplies", cssVar: "#D97706" },
  electronics: { bg: "bg-indigo-600",            text: "text-white font-bold", label: "Electronics", cssVar: "#4F46E5" },
  laboratory:  { bg: "bg-teal-600",              text: "text-white font-bold", label: "Laboratory", cssVar: "#0D9488" },
  machinery:   { bg: "bg-orange-600",            text: "text-white font-bold", label: "Machinery", cssVar: "#EA580C" },
  facility:    { bg: "bg-cyan-700",              text: "text-white font-bold", label: "Facility", cssVar: "#0E7490" },
  security:    { bg: "bg-slate-700",             text: "text-white font-bold", label: "Security", cssVar: "#334155" },
  tools:       { bg: "bg-yellow-600",            text: "text-white font-bold", label: "Tools", cssVar: "#CA8A04" },
};

export const CATEGORIES = Object.entries(CATEGORY_STYLES).map(([id, meta]) => ({
  id,
  name: meta.label,
}));

export interface CategoryColorOption {
  id: string;
  name: string;
  bg: string;
  text: string;
  hex: string;
}

export const AVAILABLE_CATEGORY_COLORS: CategoryColorOption[] = [
  { id: "blue",      name: "Blue",      bg: "bg-blue-600",    text: "text-white font-bold", hex: "#2563EB" },
  { id: "sky",       name: "Sky",       bg: "bg-sky-600",     text: "text-white font-bold", hex: "#0284C7" },
  { id: "purple",    name: "Purple",    bg: "bg-purple-600",  text: "text-white font-bold", hex: "#7C3AED" },
  { id: "emerald",   name: "Emerald",   bg: "bg-emerald-600", text: "text-white font-bold", hex: "#059669" },
  { id: "rose",      name: "Rose",      bg: "bg-rose-600",    text: "text-white font-bold", hex: "#E11D48" },
  { id: "amber",     name: "Amber",     bg: "bg-amber-600",   text: "text-white font-bold", hex: "#D97706" },
  { id: "indigo",    name: "Indigo",    bg: "bg-indigo-600",  text: "text-white font-bold", hex: "#4F46E5" },
  { id: "teal",      name: "Teal",      bg: "bg-teal-600",    text: "text-white font-bold", hex: "#0D9488" },
  { id: "orange",    name: "Orange",    bg: "bg-orange-600",  text: "text-white font-bold", hex: "#EA580C" },
  { id: "cyan",      name: "Cyan",      bg: "bg-cyan-700",    text: "text-white font-bold", hex: "#0E7490" },
  { id: "fuchsia",   name: "Fuchsia",   bg: "bg-fuchsia-600", text: "text-white font-bold", hex: "#C026D3" },
  { id: "slate",     name: "Slate",     bg: "bg-slate-700",   text: "text-white font-bold", hex: "#334155" },
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getCategoryStyle(
  category: string,
  fallbackLabel?: string,
  colorToken?: string
): CategoryStyleMeta {
  const displayLabel = fallbackLabel ?? (category ? category.charAt(0).toUpperCase() + category.slice(1) : "General");

  // 1. If explicit colorToken is provided, look it up in preset colors or styles
  if (colorToken) {
    const normalizedToken = colorToken.trim().toLowerCase();
    const matchedColor = AVAILABLE_CATEGORY_COLORS.find(
      (c) => c.id === normalizedToken || c.name.toLowerCase() === normalizedToken
    );
    if (matchedColor) {
      return {
        bg: matchedColor.bg,
        text: matchedColor.text,
        label: displayLabel,
        cssVar: matchedColor.hex,
      };
    }
    if (CATEGORY_STYLES[normalizedToken]) {
      return {
        ...CATEGORY_STYLES[normalizedToken],
        label: displayLabel,
      };
    }
  }

  if (!category) {
    return {
      bg: "bg-slate-700",
      text: "text-white font-bold",
      label: "General",
      cssVar: "var(--color-text-secondary)",
    };
  }

  const normalizedCategory = category.trim().toLowerCase();
  
  if (CATEGORY_STYLES[normalizedCategory]) {
    return CATEGORY_STYLES[normalizedCategory];
  }

  // Check prefix / partial matching (e.g. "computing equipment" -> computing)
  for (const [key, meta] of Object.entries(CATEGORY_STYLES)) {
    if (normalizedCategory.includes(key)) {
      return {
        ...meta,
        label: displayLabel,
      };
    }
  }

  // Deterministic diverse palette fallback for custom user categories
  const paletteIndex = hashString(normalizedCategory) % AVAILABLE_CATEGORY_COLORS.length;
  const pickedColor = AVAILABLE_CATEGORY_COLORS[paletteIndex];

  return {
    bg: pickedColor.bg,
    text: pickedColor.text,
    label: displayLabel,
    cssVar: pickedColor.hex,
  };
}
