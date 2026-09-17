'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Loader2, ArrowRight } from 'lucide-react';
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
    'This account has no application profile. Contact a system administrator.',
  deactivated: 'This account has been deactivated.',
  borrower_portal:
    'Department accounts use the requester portal, not the staff workspace.',
};

const STAY_ON_SIGN_IN_ERRORS = new Set([
  'no_profile',
  'deactivated',
  'borrower_portal',
]);

function getRedirectErrorMessage(errorKey: string | null): string | null {
  if (!errorKey) return null;
  return REDIRECT_ERROR_MESSAGES[errorKey] ?? 'Unable to access the application.';
}

type SignInApiData = {
  profile: {
    role: string;
  };
};

export function SignInForm() {
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

  // Autofocus email field on mount
  useEffect(() => {
    emailInputRef.current?.focus();
  }, []);

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
        setFormState({
          isLoading: false,
          errorMessage:
            body?.error ||
            'Invalid email or password. Please verify your credentials and try again.',
          successMessage: null,
        });
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

      // Full navigation so the next document reliably picks up Set-Cookie cookies.
      window.location.assign(nextPath);
    } catch {
      setFormState({
        isLoading: false,
        errorMessage: 'Unable to sign in right now. Please try again.',
        successMessage: null,
      });
    }
  };

  return (
    <AuthCard>
      <div className="space-y-6">
        {/* Title */}
        <div className="space-y-1.5">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Sign In
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Access the Enterprise Asset Management workspace
          </p>
        </div>

        {/* Global Error/Success Alert */}
        <FormAlert
          type={displayErrorMessage ? 'error' : 'success'}
          message={displayErrorMessage || formState.successMessage}
          onDismiss={() => {
            setFormState((prev) => ({ ...prev, errorMessage: null, successMessage: null }));
            if (paramErrorKey) setDismissedParamErrorKey(paramErrorKey);
          }}
        />

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate className="space-y-4 relative">
          
          {/* Inputs Container */}
          <div className="space-y-4">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="block text-xs font-semibold uppercase tracking-wider text-foreground"
              >
                Email Address
              </label>
              <input
                id="email"
                type="email"
                ref={emailInputRef}
                value={formValues.email}
                onChange={(e) => handleChange('email', e.target.value)}
                onBlur={() => handleBlur('email')}
                placeholder="admin@example.com"
                disabled={formState.isLoading}
                className={`flex h-11 w-full rounded-xl border bg-background px-3.5 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 transition-colors ${
                  errors.email && touched.email
                    ? 'border-red-500'
                    : 'border-border'
                }`}
              />
              {errors.email && touched.email && (
                <p className="text-xs text-red-500 font-medium animate-in fade-in-50">
                  {errors.email}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold uppercase tracking-wider text-foreground"
                >
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-[#FF4E45] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                >
                  Forgot your password?
                </Link>
              </div>
              <PasswordInput
                id="password"
                value={formValues.password}
                onChange={(e) => handleChange('password', e.target.value)}
                onBlur={() => handleBlur('password')}
                placeholder="••••••••"
                disabled={formState.isLoading}
                error={Boolean(errors.password && touched.password)}
              />
              {errors.password && touched.password && (
                <p className="text-xs text-red-500 font-medium animate-in fade-in-50">
                  {errors.password}
                </p>
              )}
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground transition-colors select-none">
                <input
                  type="checkbox"
                  checked={formValues.rememberMe}
                  onChange={(e) => handleChange('rememberMe', e.target.checked)}
                  disabled={formState.isLoading}
                  className="w-4 h-4 rounded border-border text-[#FF4E45] focus:ring-ring focus:ring-offset-0 disabled:opacity-50 accent-[#FF4E45]"
                />
                <span>Remember me on this device</span>
              </label>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={formState.isLoading}
            className="w-full h-11 inline-flex items-center justify-center gap-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-sm shadow-md shadow-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.99]"
          >
            {formState.isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <span>Sign In to System</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer Support Info */}
        <div className="pt-4 border-t border-border text-center space-y-1">
          <p className="text-xs text-muted-foreground">
            AIMS &bull; Asset & Inventory Management System
          </p>
          <p className="text-[11px] text-muted-foreground/80">
            For account access requests, contact your System Administrator.
          </p>
        </div>
      </div>
    </AuthCard>
  );
}
