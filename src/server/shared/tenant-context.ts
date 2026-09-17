import { AsyncLocalStorage } from "node:async_hooks";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";

import { getDb } from "@/server/db";
import { tenants, type TenantRow } from "@/server/db/schema";
import { serverCache } from "@/server/shared/cache";
import { BadRequestError } from "@/server/shared/errors";

export const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";
export const DEFAULT_TENANT_SLUG = "crmc";
export const DEFAULT_TENANT_NAME = "Cebu Roosevelt Memorial Colleges";

const TENANT_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export interface TenantContext {
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  isCrossTenant?: boolean;
}

const tenantStorage = new AsyncLocalStorage<TenantContext>();

/**
 * Cache-wrapped tenant query by primary key ID.
 */
export async function getCachedTenantById(
  tenantId: string
): Promise<TenantRow | null> {
  return serverCache.wrap(
    `tenant:id:${tenantId}`,
    TENANT_CACHE_TTL_MS,
    async () => {
      const db = getDb();
      const [row] = await db
        .select()
        .from(tenants)
        .where(eq(tenants.id, tenantId))
        .limit(1);
      return row ?? null;
    },
    [`tenant:id:${tenantId}`, "tenants"]
  );
}

/**
 * Cache-wrapped tenant query by unique subdomain / slug.
 */
export async function getCachedTenantBySlug(
  slug: string
): Promise<TenantRow | null> {
  const normalizedSlug = slug.trim().toLowerCase();
  return serverCache.wrap(
    `tenant:slug:${normalizedSlug}`,
    TENANT_CACHE_TTL_MS,
    async () => {
      const db = getDb();
      const [row] = await db
        .select()
        .from(tenants)
        .where(eq(tenants.slug, normalizedSlug))
        .limit(1);
      return row ?? null;
    },
    [`tenant:slug:${normalizedSlug}`, "tenants"]
  );
}

/**
 * Resolves the primary default tenant (CRMC).
 */
export async function getDefaultTenant(): Promise<TenantRow> {
  const tenant = await getCachedTenantById(DEFAULT_TENANT_ID);
  if (tenant) return tenant;

  const tenantBySlug = await getCachedTenantBySlug(DEFAULT_TENANT_SLUG);
  if (tenantBySlug) return tenantBySlug;

  // Fallback if DB record has not yet been seeded
  return {
    id: DEFAULT_TENANT_ID,
    slug: DEFAULT_TENANT_SLUG,
    name: DEFAULT_TENANT_NAME,
    branding: null,
    settings: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Drops cache tags for tenants when modified.
 */
export function invalidateTenantCache(tenantId?: string, slug?: string) {
  if (tenantId) serverCache.invalidateTag(`tenant:id:${tenantId}`);
  if (slug) serverCache.invalidateTag(`tenant:slug:${slug.toLowerCase()}`);
  serverCache.invalidateTag("tenants");
}

/**
 * Executes a callback within a scoped TenantContext using AsyncLocalStorage.
 */
export function runWithTenant<T>(
  context: TenantContext,
  fn: () => T | Promise<T>
): Promise<T> {
  return tenantStorage.run(context, () => Promise.resolve(fn()));
}

/**
 * Sets the TenantContext for the remainder of the current execution context.
 */
export function setTenantContext(context: TenantContext): void {
  tenantStorage.enterWith(context);
}

/**
 * Returns the currently active TenantContext if one is set.
 */
export function getTenantContext(): TenantContext | undefined {
  return tenantStorage.getStore();
}

/**
 * Returns the active TenantContext, throwing BadRequestError if not set.
 */
export function requireTenantContext(): TenantContext {
  const context = getTenantContext();
  if (!context) {
    throw new BadRequestError("Tenant context is required but was not resolved.");
  }
  return context;
}

/**
 * Resolves tenant context from Next.js request headers.
 * Looks for `x-tenant-id`, `x-tenant-slug`, or defaults to CRMC.
 */
export async function resolveTenantFromHeaders(): Promise<TenantContext> {
  // If explicitly inside an AsyncLocalStorage boundary, return that first
  const active = getTenantContext();
  if (active) return active;

  try {
    const headerStore = await headers();
    const tenantId = headerStore.get("x-tenant-id");
    const tenantSlug = headerStore.get("x-tenant-slug");

    if (tenantId) {
      const row = await getCachedTenantById(tenantId);
      if (row) {
        return {
          tenantId: row.id,
          tenantSlug: row.slug,
          tenantName: row.name,
        };
      }
    }

    if (tenantSlug) {
      const row = await getCachedTenantBySlug(tenantSlug);
      if (row) {
        return {
          tenantId: row.id,
          tenantSlug: row.slug,
          tenantName: row.name,
        };
      }
    }
  } catch {
    // headers() throws if called outside Next.js request context (e.g. background tasks or unit tests)
  }

  // Default tenant fallback
  const defaultTenant = await getDefaultTenant();
  return {
    tenantId: defaultTenant.id,
    tenantSlug: defaultTenant.slug,
    tenantName: defaultTenant.name,
  };
}
