const SAFE_RELATIVE_LOGO_RE = /^\/(?!\/)[^\\\r\n]*$/;
const SAFE_DATA_IMAGE_RE =
  /^data:image\/(?:png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+$/i;

function configuredAllowedOrigins(): string[] {
  const raw = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    ...(process.env.CUSTOM_REPORT_LOGO_ORIGINS?.split(",") ?? []),
  ];
  const origins: string[] = [];
  for (const candidate of raw) {
    if (!candidate?.trim()) continue;
    try {
      origins.push(new URL(candidate.trim()).origin);
    } catch {
      // Ignore malformed env entries
    }
  }
  return origins;
}

/**
 * Escapes HTML special characters for safe interpolation inside print templates
 * and `document.write()` / `innerHTML` fragments.
 */
export function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Validates that a custom report or print slip logo URL is a relative `/...` path,
 * a raster `data:image/(png|jpeg|webp);base64,...` URI (never SVG), or an HTTPS
 * URL on an explicitly configured origin (or current browser origin).
 */
export function isSafeLogoUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  if (
    trimmed.includes("\0") ||
    trimmed.includes("\r") ||
    trimmed.includes("\n")
  ) {
    return false;
  }
  if (SAFE_RELATIVE_LOGO_RE.test(trimmed)) return true;
  if (SAFE_DATA_IMAGE_RE.test(trimmed)) return true;

  try {
    const parsed = new URL(trimmed);
    const sameBrowserOrigin =
      typeof window !== "undefined" &&
      parsed.origin === window.location.origin;
    if (
      sameBrowserOrigin &&
      (parsed.protocol === "https:" || parsed.protocol === "http:")
    ) {
      return true;
    }
    if (parsed.protocol !== "https:") return false;
    return configuredAllowedOrigins().includes(parsed.origin);
  } catch {
    return false;
  }
}

export function sanitizeImgSrc(
  value: string | null | undefined,
  fallback = "/CRMC%20LOGO.png"
): string {
  const trimmed = typeof value === "string" ? value.trim() : "";
  if (!trimmed) return fallback;
  return isSafeLogoUrl(trimmed) ? trimmed : fallback;
}
