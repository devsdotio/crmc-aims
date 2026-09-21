import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import {
  REMEMBER_ME_COOKIE,
  applyRememberMeToCookieOptions,
  isRememberMeEnabled,
  rememberMePreferenceOptions,
} from "@/lib/auth/remember-me";

type CreateClientOptions = {
  /**
   * Explicit preference from sign-in. When set, also writes the preference
   * cookie so later middleware refreshes keep the same lifetime.
   */
  rememberMe?: boolean;
};

/**
 * If using Fluid compute: Don't put this client in a global variable. Always create a new client within each
 * function when using it.
 */
export async function createClient(options?: CreateClientOptions) {
  const cookieStore = await cookies();
  const rememberMe =
    options?.rememberMe ??
    isRememberMeEnabled(cookieStore.get(REMEMBER_ME_COOKIE)?.value);

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            if (options?.rememberMe !== undefined) {
              cookieStore.set(
                REMEMBER_ME_COOKIE,
                options.rememberMe ? "1" : "0",
                rememberMePreferenceOptions(options.rememberMe)
              );
            }

            cookiesToSet.forEach(({ name, value, options: cookieOptions }) =>
              cookieStore.set(
                name,
                value,
                applyRememberMeToCookieOptions(cookieOptions, rememberMe)
              )
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}
