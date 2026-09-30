import { randomUUID } from "node:crypto";

import type { ActorContext } from "@/server/shared/auth";
import type { AppRole } from "@/server/shared/roles";
import { DEFAULT_TENANT_ID, DEFAULT_TENANT_NAME, DEFAULT_TENANT_SLUG } from "@/server/shared/tenant-context";

export type MakeActorOptions = {
  role?: AppRole;
  userId?: string;
  email?: string | null;
  displayName?: string;
  departmentId?: string | null;
  departmentName?: string | null;
  tenantId?: string;
  tenantSlug?: string;
  tenantName?: string;
};

/** Fabricated accountability actor — bypasses Supabase session for service tests. */
export function makeActor(opts: MakeActorOptions = {}): ActorContext {
  const role = opts.role ?? "admin";
  return {
    userId: opts.userId ?? randomUUID(),
    email: opts.email === undefined ? `test-${role}@example.com` : opts.email,
    displayName: opts.displayName ?? `Test ${role}`,
    role,
    departmentId: opts.departmentId ?? null,
    departmentName: opts.departmentName ?? null,
    tenantId: opts.tenantId ?? DEFAULT_TENANT_ID,
    tenantSlug: opts.tenantSlug ?? DEFAULT_TENANT_SLUG,
    tenantName: opts.tenantName ?? DEFAULT_TENANT_NAME,
  };
}
