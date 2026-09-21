import type { CookieOptions } from "@supabase/ssr";

/** Preference cookie: "1" = stay signed in across browser restarts. */
export const REMEMBER_ME_COOKIE = "aims-remember-me";

/** Match @supabase/ssr DEFAULT_COOKIE_OPTIONS (400 days). */
export const REMEMBER_ME_MAX_AGE_SECONDS = 400 * 24 * 60 * 60;

/**
 * When remember-me is off, drop Max-Age/Expires so auth cookies are
 * browser-session cookies (cleared when the browser closes).
 */
export function applyRememberMeToCookieOptions(
  options: CookieOptions | undefined,
  rememberMe: boolean
): CookieOptions {
  if (rememberMe) {
    return {
      ...options,
      path: options?.path ?? "/",
      sameSite: options?.sameSite ?? "lax",
      maxAge: options?.maxAge ?? REMEMBER_ME_MAX_AGE_SECONDS,
    };
  }

  const next: CookieOptions = {
    ...options,
    path: options?.path ?? "/",
    sameSite: options?.sameSite ?? "lax",
  };
  delete next.maxAge;
  delete next.expires;
  return next;
}

export function rememberMePreferenceOptions(rememberMe: boolean): CookieOptions {
  return applyRememberMeToCookieOptions(
    {
      path: "/",
      sameSite: "lax",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    },
    rememberMe
  );
}

/** Missing cookie → treat as remembered (legacy sessions stay persistent). */
export function isRememberMeEnabled(value: string | undefined | null): boolean {
  if (value === "0") return false;
  return true;
}
