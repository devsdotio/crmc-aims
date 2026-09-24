import type { JwtPayload, User } from "@supabase/supabase-js";
import { and, eq, sql } from "drizzle-orm";
import { headers } from "next/headers";

import { createClient } from "@/lib/supabase/server";
import { getDb } from "@/server/db";
import { departments, profiles, type ProfileRow } from "@/server/db/schema";
import {
  BadRequestError,
  ForbiddenError,
  UnauthorizedError,
} from "@/server/shared/errors";
import {
  type AppRole,
  hasMinRole,
  isAssetOperatorRole,
  isStaffShellRole,
  isUserManagerRole,
} from "@/server/shared/roles";
import { serverCache } from "@/server/shared/cache";
import {
  DEFAULT_TENANT_ID,
  getCachedTenantById,
  getCachedTenantBySlug,
  getDefaultTenant,
  resolveTenantFromHeaders,
  setTenantContext,
} from "@/server/shared/tenant-context";
import type { TenantRow } from "@/server/db/schema";

/** Short-lived cache — parallel APIs hit requireActor(); avoid N× slow profile selects. */
const PROFILE_CACHE_TTL_MS = 60_000;

export async function getCachedProfile(userId: string): Promise<ProfileRow | null> {
  return serverCache.wrap(
    `profile:${userId}`,
    PROFILE_CACHE_TTL_MS,
    async () => {
      const db = getDb();
      const [row] = await db
        .select()
        .from(profiles)
        .where(eq(profiles.userId, userId))
        .limit(1);
      return row ?? null;
    },
    [`profile:${userId}`, "profiles"]
  );
}

/** Extracts raw JWT from `Authorization: Bearer <token>` when present. */
async function getBearerToken(): Promise<string | null> {
  const headerStore = await headers();
  const authorization = headerStore.get("authorization");
  if (!authorization) return null;
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim();
  return token || null;
}

/**
 * Accountability actor derived ONLY from a verified Supabase session + profile.
 * Never accept actor identity or role from the client body.
 */
export interface ActorContext {
  userId: string;
  email: string | null;
  displayName: string;
  role: AppRole;
  departmentId: string | null;
  departmentName: string | null;
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  isCrossTenant?: boolean;
}

export interface AppSession {
  user: User;
  actor: ActorContext;
  profile: ProfileRow;
  tenant: TenantRow;
}

export function toActorContext(
  user: User,
  profile: ProfileRow,
  tenant: TenantRow,
  isCrossTenant = false
): ActorContext {
  return {
    userId: user.id,
    email: profile.email || user.email || null,
    displayName: profile.fullName || user.email || user.id,
    role: profile.role,
    departmentId: profile.departmentId ?? null,
    departmentName: profile.department ?? null,
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    tenantName: tenant.name,
    isCrossTenant,
  };
}

/**
 * Resolve department from the departments table (source of truth).
 * Portal accounts always use the session's department_id — never client text.
 */
export async function resolveDepartmentSnapshot(opts: {
  actor: ActorContext;
  submittedDepartmentId?: string | null;
  /** Free-text department when no catalog id is selected (portal override). */
  submittedDepartmentName?: string | null;
  requireDepartment?: boolean;
}): Promise<{ departmentId: string | null; departmentName: string | null }> {
  const submittedId = opts.submittedDepartmentId?.trim() || null;
  const submittedName = opts.submittedDepartmentName?.trim() || null;

  // Operators always use submitted id when provided. Borrowers may override their
  // linked department via submitted id or free-text name.
  const departmentId: string | null =
    opts.actor.role === "borrower" && !submittedId && !submittedName
      ? opts.actor.departmentId
      : submittedId;

  if (!departmentId && submittedName) {
    const db = getDb();
    const [dept] = await db
      .select({ id: departments.id, name: departments.name })
      .from(departments)
      .where(
        and(
          sql`lower(trim(${departments.name})) = ${submittedName.toLowerCase()}`,
          eq(departments.tenantId, opts.actor.tenantId)
        )
      )
      .limit(1);
    if (dept) {
      return { departmentId: dept.id, departmentName: dept.name };
    }
    // Unmatched free text — store denormalized name only.
    return { departmentId: null, departmentName: submittedName };
  }

  if (!departmentId) {
    if (opts.requireDepartment || (opts.actor.role === "borrower" && !submittedName)) {
      throw new BadRequestError(
        opts.actor.role === "borrower"
          ? "Select or enter a requesting department."
          : "A department is required."
      );
    }
    return { departmentId: null, departmentName: null };
  }

  const row = await serverCache.wrap(
    `department:${opts.actor.tenantId}:${departmentId}`,
    10 * 60 * 1000,
    async () => {
      const db = getDb();
      const [dept] = await db
        .select({ id: departments.id, name: departments.name })
        .from(departments)
        .where(
          and(
            eq(departments.id, departmentId!),
            eq(departments.tenantId, opts.actor.tenantId)
          )
        )
        .limit(1);
      return dept ?? null;
    },
    ["departments", `department:${opts.actor.tenantId}:${departmentId}`]
  );
  if (!row) {
    throw new BadRequestError("Unknown department.");
  }
  return { departmentId: row.id, departmentName: row.name };
}

async function loadProfile(userId: string): Promise<ProfileRow | null> {
  return getCachedProfile(userId);
}

/** Drop cached profile after mutations that change role/status (user admin). */
export function invalidateProfileCache(userId?: string) {
  if (userId) serverCache.invalidateTag(`profile:${userId}`);
  else serverCache.invalidateTag("profiles");
}

/**
 * Build a minimal `User` from verified JWT claims (local JWKS verify via getClaims).
 * Prefer this over getUser() on every request — getUser always hits Auth over the network.
 */
function userFromClaims(claims: JwtPayload): User {
  const email =
    typeof claims.email === "string" && claims.email.length > 0
      ? claims.email
      : undefined;

  return {
    id: claims.sub,
    email,
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: "",
  } as User;
}

/**
 * Verifies the request has a valid Supabase session.
 *
 * Accepts either:
 * - HTTP-only session cookies (browser / SSR), or
 * - `Authorization: Bearer <access_token>` (Swagger, scripts, API clients)
 *
 * Uses `getClaims()` (local JWT verify when project uses asymmetric keys)
 * instead of `getUser()` network RTT on every API call / layout.
 */
export async function requireUser(): Promise<User> {
  const supabase = await createClient();
  const bearer = await getBearerToken();

  const { data, error } = bearer
    ? await supabase.auth.getClaims(bearer)
    : await supabase.auth.getClaims();

  const claims = data?.claims;
  if (error || !claims?.sub) {
    throw new UnauthorizedError();
  }

  return userFromClaims(claims);
}

/**
 * Session + profile gate. Rejects missing/deactivated profiles.
 * Enforces strict multi-tenant isolation.
 */
export async function requireSession(): Promise<AppSession> {
  const user = await requireUser();
  const profile = await loadProfile(user.id);

  if (!profile) {
    throw new ForbiddenError(
      "No application profile is linked to this account. Contact an administrator."
    );
  }

  if (profile.status !== "active") {
    throw new ForbiddenError("This account has been deactivated.");
  }

  // Resolve requested tenant from headers / async context
  const resolved = await resolveTenantFromHeaders();
  let activeTenant: TenantRow | null = null;

  if (resolved.tenantId) {
    activeTenant = await getCachedTenantById(resolved.tenantId);
  }
  if (!activeTenant && resolved.tenantSlug) {
    activeTenant = await getCachedTenantBySlug(resolved.tenantSlug);
  }
  if (!activeTenant) {
    activeTenant = await getDefaultTenant();
  }

  // Strict Tenant Isolation Guard:
  const isSuperadmin = profile.role === "superadmin";

  if (!isSuperadmin) {
    if (!profile.tenantId) {
      throw new ForbiddenError(
        "This account is not assigned to an organization tenant."
      );
    }
    
    // Force active tenant to the user's assigned workspace for non-superadmins
    if (activeTenant.id !== profile.tenantId) {
      const realTenant = await getCachedTenantById(profile.tenantId);
      if (realTenant) {
        activeTenant = realTenant;
      } else {
        throw new ForbiddenError("Assigned institutional workspace not found.");
      }
    }
  }

  const isCrossTenant = isSuperadmin;

  setTenantContext({
    tenantId: activeTenant.id,
    tenantSlug: activeTenant.slug,
    tenantName: activeTenant.name,
    isCrossTenant,
  });

  return {
    user,
    profile,
    tenant: activeTenant,
    actor: toActorContext(user, profile, activeTenant, isCrossTenant),
  };
}

/** Session gate + actor context for accountable mutations. */
export async function requireActor(): Promise<ActorContext> {
  const session = await requireSession();
  return session.actor;
}

export async function requireRoles(
  ...allowed: AppRole[]
): Promise<AppSession> {
  const session = await requireSession();
  if (!allowed.includes(session.profile.role)) {
    throw new ForbiddenError(
      "You do not have permission to perform this action."
    );
  }
  return session;
}

export async function requireMinRole(minimum: AppRole): Promise<AppSession> {
  const session = await requireSession();
  if (!hasMinRole(session.profile.role, minimum)) {
    throw new ForbiddenError(
      "You do not have permission to perform this action."
    );
  }
  return session;
}

export async function requireStaffShell(): Promise<AppSession> {
  const session = await requireSession();
  if (!isStaffShellRole(session.profile.role)) {
    throw new ForbiddenError(
      "Staff workspace access is limited to superadmin, admin, and staff accounts."
    );
  }
  return session;
}

export async function requireUserManager(): Promise<AppSession> {
  const session = await requireSession();
  if (!isUserManagerRole(session.profile.role)) {
    throw new ForbiddenError("Only admins can manage user accounts.");
  }
  return session;
}

export async function requireAssetOperator(): Promise<AppSession> {
  const session = await requireSession();
  if (!isAssetOperatorRole(session.profile.role)) {
    throw new ForbiddenError(
      "Only administrators can manage assets and inventory."
    );
  }
  return session;
}

/**
 * Gate for platform developers / superadministrators.
 * Used for tenant management, global configuration, and cross-tenant operations.
 */
export async function requireSuperAdmin(): Promise<AppSession> {
  const session = await requireSession();
  if (session.profile.role !== "superadmin") {
    throw new ForbiddenError(
      "Platform superadministrator privileges required."
    );
  }
  return session;
}

/**
 * Gate for tenant administrators (or platform superadmins).
 */
export async function requireTenantAdmin(): Promise<AppSession> {
  const session = await requireSession();
  if (session.profile.role !== "admin" && session.profile.role !== "superadmin") {
    throw new ForbiddenError("Tenant administrator access required.");
  }
  return session;
}

/** Soft lookup for layouts (returns null instead of throwing). */
export async function getSessionOrNull(): Promise<AppSession | null> {
  try {
    return await requireSession();
  } catch {
    return null;
  }
}
