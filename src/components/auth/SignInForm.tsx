'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, ArrowRight, User } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { AuthCard } from './AuthCard';
import { PasswordInput } from './PasswordInput';
import { FormAlert } from './FormAlert';
import { SignInFormValues, AuthFormState } from "@/types/auth";
import { useQueryClient } from "@tanstack/react-query";

function safeNextPath(raw: string | null): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) {
    return '/';
  }
  return raw;
}

const REDIRECT_ERROR_MESSAGES: Record<string, string> = {
  no_profile:
    'This account isn’t set up for AIMS yet. Ask a system administrator to create your profile.',
  deactivated:
    'This account has been deactivated. Contact a system administrator if you need access restored.',
  borrower_portal:
    'Department accounts use the requester portal. Sign in there, or ask an administrator for staff access.',
  session_expired:
    'Your previous session ended. Enter your email and password to continue.',
  unavailable:
    'The database was unreachable just now. Wait a moment, then sign in again.',
};

const STAY_ON_SIGN_IN_ERRORS = new Set([
  'no_profile',
  'deactivated',
  'borrower_portal',
  'session_expired',
  'unavailable',
]);

function getRedirectErrorMessage(errorKey: string | null): string | null {
  if (!errorKey) return null;
  return (
    REDIRECT_ERROR_MESSAGES[errorKey] ??
    'You were signed out before reaching that page. Sign in to continue.'
  );
}

/** Map API / network failures into plain-language recovery guidance. */
function mapSignInFailure(
  serverError: string | undefined,
  offline: boolean,
  status?: number
): string {
  if (offline) {
    return 'You appear to be offline. Check your connection, then try signing in again.';
  }

  if (status === 404) {
    return 'Sign-in is still starting up on the server. Wait a moment and try again.';
  }

  const raw = (serverError || '').trim();
  const lower = raw.toLowerCase();

  if (
    lower.includes('invalid email or password') ||
    lower.includes('invalid login') ||
    lower.includes('invalid credentials')
  ) {
    return 'That email and password don’t match our records. Double-check both, or use Forgot password.';
  }

  if (lower.includes('deactivated')) {
    return REDIRECT_ERROR_MESSAGES.deactivated;
  }

  if (lower.includes('no application profile') || lower.includes('not linked')) {
    return REDIRECT_ERROR_MESSAGES.no_profile;
  }

  if (
    lower.includes('failed to fetch') ||
    lower.includes('network') ||
    lower.includes('timeout') ||
    lower.includes('database') ||
    lower.includes('couldn’t reach') ||
    lower.includes('could not reach') ||
    lower.includes('temporarily unavailable') ||
    lower.includes('unexpected error')
  ) {
    return 'We couldn’t finish signing you in because the server is unreachable right now. Check your connection, then try again.';
  }

  if (raw && raw.length < 160 && !raw.includes('<')) {
    return raw;
  }

  return 'We couldn’t sign you in. Check your email and password, then try again.';
}

type SignInApiData = {
  profile: {
    role: string;
  };
};

export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const [formValues, setFormValues] = useState<SignInFormValues>({
    email: '',
    password: '',
    rememberMe: false,
  });

  const [touched, setTouched] = useState<{ email?: boolean; password?: boolean }>({});
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const passwordInputRef = useRef<HTMLInputElement>(null);

  const [formState, setFormState] = useState<AuthFormState>({
    isLoading: false,
    errorMessage: null,
    successMessage: null,
  });

  const paramErrorKey = searchParams.get('error');
  const [dismissedParamErrorKey, setDismissedParamErrorKey] = useState<string | null>(null);
  const redirectErrorMessage =
    paramErrorKey && paramErrorKey !== dismissedParamErrorKey
      ? getRedirectErrorMessage(paramErrorKey)
      : null;
  const displayErrorMessage = formState.errorMessage ?? redirectErrorMessage;

  // Autofocus email on mount; password when returning from an expired session.
  useEffect(() => {
    if (paramErrorKey === 'session_expired') {
      passwordInputRef.current?.focus();
      return;
    }
    emailInputRef.current?.focus();
  }, [paramErrorKey]);

  /**
   * Clear residual Supabase session when the private shell rejected entry.
   * Server Components cannot reliably attach signOut cookies to redirects.
   */
  useEffect(() => {
    if (!paramErrorKey || !STAY_ON_SIGN_IN_ERRORS.has(paramErrorKey)) {
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const supabase = createClient();
        await supabase.auth.signOut();
      } catch {
        // Best-effort
      }
      if (!cancelled) {
        // Drop auth cookies from a stuck bounce loop even if signOut is partial
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [paramErrorKey]);

  const validateEmail = (email: string) => {
    if (!email.trim()) return 'Email address is required.';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) return 'Please enter a valid email address.';
    return undefined;
  };

  const validatePassword = (password: string) => {
    if (!password) return 'Password is required.';
    if (password.length < 6) return 'Password must be at least 6 characters.';
    return undefined;
  };

  const handleBlur = (field: 'email' | 'password') => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    if (field === 'email') {
      setErrors((prev) => ({ ...prev, email: validateEmail(formValues.email) }));
    } else if (field === 'password') {
      setErrors((prev) => ({ ...prev, password: validatePassword(formValues.password) }));
    }
  };

  const handleChange = (field: keyof SignInFormValues, value: string | boolean) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
    setFormState((prev) => ({ ...prev, errorMessage: null }));
    if (paramErrorKey) setDismissedParamErrorKey(paramErrorKey);

    if (touched[field as 'email' | 'password']) {
      if (field === 'email') {
        setErrors((prev) => ({ ...prev, email: validateEmail(value as string) }));
      } else if (field === 'password') {
        setErrors((prev) => ({ ...prev, password: validatePassword(value as string) }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const emailErr = validateEmail(formValues.email);
    const passErr = validatePassword(formValues.password);

    setTouched({ email: true, password: true });
    setErrors({ email: emailErr, password: passErr });

    if (emailErr || passErr) {
      return;
    }

    setFormState({ isLoading: true, errorMessage: null, successMessage: null });

    try {
      // One server round-trip: Supabase password + profile gate + Set-Cookie.
      // Avoids client signInWithPassword + separate /api/me (extra ~1–2s).
      const res = await fetch('/api/auth/sign-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          email: formValues.email.trim(),
          password: formValues.password,
          rememberMe: formValues.rememberMe,
        }),
      });

      const body = (await res.json().catch(() => null)) as
        | { data?: SignInApiData; error?: string }
        | null;

      if (!res.ok || !body?.data?.profile) {
        const errorMessage = mapSignInFailure(
          body?.error,
          typeof navigator !== 'undefined' && !navigator.onLine,
          res.status
        );
        setFormState({
          isLoading: false,
          errorMessage,
          successMessage: null,
        });
        // Keep email; send focus to password so recovery is one field away.
        requestAnimationFrame(() => passwordInputRef.current?.focus());
        return;
      }

      queryClient.clear();

      const role = body.data.profile.role;
      let nextPath = safeNextPath(searchParams.get('next'));

      if (role === 'borrower') {
        // If nextPath is missing, '/', or points to a staff route, always route to borrower dashboard
        if (!nextPath || nextPath === '/' || !nextPath.startsWith('/borrower-db')) {
          nextPath = '/borrower-db/dashboard';
        }
      } else {
        // Staff user: if nextPath is missing, '/', or points to borrower portal, route to staff dashboard
        if (!nextPath || nextPath === '/' || nextPath.startsWith('/borrower-db')) {
          nextPath = '/dashboard';
        }
      }

      setFormState({
        isLoading: true,
        errorMessage: null,
        successMessage: 'Sign in successful! Opening workspace…',
      });

      // Navigate to destination workspace.
      router.push(nextPath);
      router.refresh();
    } catch {
      setFormState({
        isLoading: false,
        errorMessage: mapSignInFailure(
          undefined,
          typeof navigator !== 'undefined' && !navigator.onLine
        ),
        successMessage: null,
      });
    }
  };

  return (
    <AuthCard>
      <div className="space-y-6">
        {/* Title & Subtitle */}
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight text-[#1B2140] dark:text-white">
            Log In
          </h2>
          <div className="text-xs sm:text-sm text-muted-foreground pt-0.5">
            <span>Don&apos;t have an account? </span>
            <Link
              href="/forgot-password"
              className="font-semibold text-[#FF4E45] hover:text-[#D83D35] hover:underline"
            >
              Request an account
            </Link>
            <p className="mt-0.5 text-[11px] text-muted-foreground/75">
              It will take less than a minute.
            </p>
          </div>
        </div>

        {/* Global Error/Success Alert — single status region (visibility + recovery) */}
        <FormAlert
          id="sign-in-status"
          type={displayErrorMessage ? 'error' : 'success'}
          message={displayErrorMessage || formState.successMessage}
          onDismiss={() => {
            setFormState((prev) => ({ ...prev, errorMessage: null, successMessage: null }));
            if (paramErrorKey) setDismissedParamErrorKey(paramErrorKey);
          }}
        />

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          noValidate
          className="space-y-5"
          aria-describedby={displayErrorMessage ? 'sign-in-status' : undefined}
        >
          {/* Inputs Container */}
          <div className="space-y-4">
            {/* Username / Email Field with Persistent Micro-Label */}
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="block text-xs font-semibold text-[#1B2140] dark:text-white/90 tracking-wide"
              >
                Username or Institutional Email
              </label>
              <div className="relative flex items-center w-full">
                <input
                  id="email"
                  type="email"
                  inputMode="email"
                  ref={emailInputRef}
                  value={formValues.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  onBlur={() => handleBlur('email')}
                  placeholder="name@crmc.edu.ph"
                  autoComplete="username"
                  disabled={formState.isLoading}
                  aria-invalid={Boolean(errors.email && touched.email)}
                  aria-describedby={
                    errors.email && touched.email ? 'email-error' : undefined
                  }
                  className={`flex h-11 w-full border-0 border-b bg-transparent px-0 py-2.5 pr-8 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-50 transition-colors ${
                    errors.email && touched.email
                      ? 'border-red-500 focus:border-red-500'
                      : 'border-slate-200 dark:border-zinc-700 focus:border-[#FF4E45]'
                  }`}
                />
                <User className="absolute right-0 w-4 h-4 text-muted-foreground/50 pointer-events-none" />
              </div>
              {errors.email && touched.email && (
                <p
                  id="email-error"
                  className="text-xs text-red-500 font-medium animate-in fade-in-50 pt-0.5"
                >
                  {errors.email}
                </p>
              )}
            </div>

            {/* Password Field with Persistent Micro-Label */}
            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="block text-xs font-semibold text-[#1B2140] dark:text-white/90 tracking-wide"
              >
                Password
              </label>
              <PasswordInput
                id="password"
                variant="underline"
                ref={passwordInputRef}
                value={formValues.password}
                onChange={(e) => handleChange('password', e.target.value)}
                onBlur={() => handleBlur('password')}
                placeholder="Enter your password"
                autoComplete="current-password"
                disabled={formState.isLoading}
                error={Boolean(errors.password && touched.password)}
                aria-invalid={Boolean(errors.password && touched.password)}
                aria-describedby={
                  errors.password && touched.password ? 'password-error' : undefined
                }
              />
              {errors.password && touched.password && (
                <p
                  id="password-error"
                  className="text-xs text-red-500 font-medium animate-in fade-in-50 pt-0.5"
                >
                  {errors.password}
                </p>
              )}
            </div>
          </div>

          {/* Utility Row: Remember Me & Forgot Password */}
          <div className="flex items-center justify-between pt-1 text-xs">
            <label className="flex items-center gap-2 cursor-pointer font-medium text-muted-foreground hover:text-foreground transition-colors select-none py-1">
              <input
                type="checkbox"
                checked={formValues.rememberMe}
                onChange={(e) => handleChange('rememberMe', e.target.checked)}
                disabled={formState.isLoading}
                className="w-4 h-4 rounded border-slate-300 dark:border-zinc-700 text-[#FF4E45] focus:ring-[#FF4E45] focus:ring-offset-0 disabled:opacity-50 accent-[#FF4E45] cursor-pointer"
              />
              <span>Remember me</span>
            </label>

            <Link
              href="/forgot-password"
              className="font-semibold text-[#FF4E45] hover:text-[#D83D35] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4E45] rounded py-1 transition-colors"
            >
              Forgot password?
            </Link>
          </div>

          {/* Primary Action CTA (Von Restorff Effect) */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={formState.isLoading}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#FF4E45] text-sm font-semibold text-white shadow-lg shadow-[#FF4E45]/20 transition-all hover:bg-[#E03E36] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4E45]/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.99] cursor-pointer"
            >
              {formState.isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing in to workspace…</span>
                </>
              ) : (
                <>
                  <span>Sign In to System</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </AuthCard>
  );
}
