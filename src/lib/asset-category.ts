/**
 * Prefix helper for asset codes from free-text category labels.
 * Prefer settings category name; fall back to alphanumeric initials.
 */
export function assetCategoryCodePrefix(category: string): string {
  const key = category.trim().toLowerCase();
  const presets: Record<string, string> = {
    transport: "TR",
    computing: "CP",
    av: "AV",
    "av equipment": "AV",
    furniture: "FN",
  };
  if (presets[key]) return presets[key];

  const words = key.replace(/[^a-z0-9\s]/g, " ").trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return (words[0]?.slice(0, 2) || "AS").toUpperCase();
}
