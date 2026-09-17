import type { NextRequest } from "next/server";

export const TENANT_COOKIE_NAME = "aims_tenant";
export const DEFAULT_TENANT_SLUG = "crmc";
export const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";

const RESERVED_SUBDOMAINS = new Set([
  "www",
  "app",
  "api",
  "admin",
  "localhost",
  "staging",
  "preview",
  "crmc-aims",
]);

/**
 * Extracts the tenant subdomain from the incoming request hostname.
 * Examples:
 * - `sji.crmc-aims.com` -> `sji`
 * - `sji.localhost:3000` -> `sji`
 * - `localhost:3000` -> null
 * - `crmc-aims.vercel.app` -> null
 */
export function extractSubdomain(hostname: string): string | null {
  const cleanHost = hostname.split(":")[0]?.toLowerCase();
  if (!cleanHost) return null;

  // IPv4 / IPv6 addresses have no subdomain
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(cleanHost) || cleanHost.includes("[")) {
    return null;
  }

  const parts = cleanHost.split(".");
  // e.g. "localhost"
  if (parts.length === 1) return null;

  // e.g. "sji.localhost" -> 2 parts
  if (parts.length === 2 && parts[1] === "localhost") {
    const sub = parts[0];
    return sub && !RESERVED_SUBDOMAINS.has(sub) ? sub : null;
  }

  // e.g. "sji.crmc-aims.com" -> 3 parts
  if (parts.length >= 3) {
    const sub = parts[0];
    return sub && !RESERVED_SUBDOMAINS.has(sub) ? sub : null;
  }

  return null;
}

export interface ResolvedRequestTenant {
  tenantId?: string;
  tenantSlug: string;
}

/**
 * Resolves tenant identifiers from an incoming NextRequest.
 * Precedence:
 * 1. Explicit Header: `x-tenant-id` / `x-tenant-slug`
 * 2. Cookie: `aims_tenant` (set by superadmin switcher or workspace preference)
 * 3. Subdomain: `subdomain.domain.com`
 * 4. Fallback: Default tenant (`crmc`)
 */
export function resolveRequestTenant(request: NextRequest): ResolvedRequestTenant {
  const headerId = request.headers.get("x-tenant-id")?.trim();
  const headerSlug = request.headers.get("x-tenant-slug")?.trim()?.toLowerCase();
  if (headerId || headerSlug) {
    return {
      tenantId: headerId || undefined,
      tenantSlug: headerSlug || DEFAULT_TENANT_SLUG,
    };
  }

  const cookieVal = request.cookies.get(TENANT_COOKIE_NAME)?.value?.trim();
  if (cookieVal) {
    // If cookie looks like a UUID, treat as tenantId
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cookieVal);
    if (isUuid) {
      return {
        tenantId: cookieVal,
        tenantSlug: DEFAULT_TENANT_SLUG,
      };
    }
    return {
      tenantSlug: cookieVal.toLowerCase(),
    };
  }

  const subdomain = extractSubdomain(request.nextUrl.hostname);
  if (subdomain) {
    return {
      tenantSlug: subdomain,
    };
  }

  return {
    tenantId: DEFAULT_TENANT_ID,
    tenantSlug: DEFAULT_TENANT_SLUG,
  };
}
