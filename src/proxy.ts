import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/update-session";

/**
 * Next.js 16+ network boundary (replaces deprecated `middleware.ts`).
 * @see https://nextjs.org/docs/messages/middleware-to-proxy
 */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static assets and Next internals.
     * Session refresh + auth redirects run for app pages and API routes.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
