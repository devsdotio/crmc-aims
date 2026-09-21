/**
 * Security helpers for accountable server modules.
 * Actor identity is always session-derived via `require*` helpers.
 */

import type { ActorContext } from "@/server/shared/auth";

/**
 * Strip any client-injected actor identity fields from a JSON body.
 * Controllers must still take the real actor only from the session.
 */
export function stripClientActorClaims(body: unknown): void {
  if (!body || typeof body !== "object") return;
  const b = body as Record<string, unknown>;
  delete b.actor;
  delete b.actorUserId;
  delete b.staffUserId;
  delete b.performedBy;
  delete b.userId;
}

export function actorStamp(actor: ActorContext) {
  return {
    userId: actor.userId,
    email: actor.email,
    displayName: actor.displayName,
    role: actor.role,
  };
}
