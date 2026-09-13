import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import {
  REMEMBER_ME_COOKIE,
  applyRememberMeToCookieOptions,
  isRememberMeEnabled,
} from "@/lib/auth/remember-me";

const PUBLIC_PAGE_PATHS = ["/sign-in", "/forgot-password"] as const;

/**
 * Unauthenticated API/UI paths.
 * Swagger + auth entrypoints are public so docs can load and issue tokens.
 */
const PUBLIC_API_PATHS = [
  "/api/health",
  "/api/docs",
  "/api/docs/spec",
  "/api/auth/sign-in",
  "/api/auth/token",
  "/api/bible-verse",
] as const;

/** True when the client presents a Bearer JWT (Swagger / API tools). */
function hasBearerAuthorization(request: NextRequest): boolean {
  const authorization = request.headers.get("authorization");
  if (!authorization) return false;
  return /^Bearer\s+\S+/i.test(authorization);
}

/** Sign-in errors that must win over "session → home" bounce. */
const STAY_ON_SIGN_IN_ERRORS = new Set([
  "no_profile",
  "deactivated",
  "borrower_portal",
]);

function isPublicPage(pathname: string): boolean {
  return PUBLIC_PAGE_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
}

function isPublicApi(pathname: string): boolean {
  return PUBLIC_API_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
}

function isApiPath(pathname: string): boolean {
  return pathname === "/api" || pathname.startsWith("/api/");
}

/**
 * Refreshes the Supabase session cookie and enforces auth redirects.
 * Used from `src/proxy.ts` (Next.js 16 network boundary).
 */
export async function updateSession(request: NextRequest) {
  // Pass pathname into Server Components (private layout branches staff vs borrower).
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);

  let supabaseResponse = NextResponse.next({
    request: { headers: requestHeaders },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          const rememberMe = isRememberMeEnabled(
            request.cookies.get(REMEMBER_ME_COOKIE)?.value
          );

          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request: { headers: requestHeaders },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(
              name,
              value,
              applyRememberMeToCookieOptions(options, rememberMe)
            )
          );
        },
      },
    }
  );

  // Do not run code between createServerClient and supabase.auth.getClaims().
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;
  const { pathname } = request.nextUrl;
  const errorParam = request.nextUrl.searchParams.get("error");

  // Authenticated users on auth pages → role-aware home (src/app/page.tsx).
  // Keep them on /sign-in when a gate-failure error is present (avoids bounce loop).
  if (user && isPublicPage(pathname)) {
    if (
      pathname === "/sign-in" &&
      errorParam &&
      STAY_ON_SIGN_IN_ERRORS.has(errorParam)
    ) {
      return supabaseResponse;
    }

    const url = request.nextUrl.clone();
    // Prefer `/` over `/dashboard`: home resolves borrower vs staff routes.
    // Clearing search drops error= flags so they are not re-applied after recovery.
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Unauthenticated — allowlisted pages/APIs + Bearer-bearing API calls pass;
  // route handlers still call requireUser() / requireSession() to verify JWT.
  if (
    !user &&
    !isPublicPage(pathname) &&
    !isPublicApi(pathname) &&
    !(isApiPath(pathname) && hasBearerAuthorization(request))
  ) {
    if (isApiPath(pathname)) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    url.search = "";
    if (pathname !== "/" && pathname !== "/dashboard") {
      url.searchParams.set("next", pathname);
    }
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
