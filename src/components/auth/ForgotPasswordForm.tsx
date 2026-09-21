'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Loader2, ArrowLeft, MailCheck, RefreshCw } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { AuthCard } from './AuthCard';
import { FormAlert } from './FormAlert';
import { ForgotPasswordStep, AuthFormState } from "@/types/auth";

export function ForgotPasswordForm() {
  const [step, setStep] = useState<ForgotPasswordStep>('request');
  const [email, setEmail] = useState('');
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [cooldown, setCooldown] = useState(0);

  const [formState, setFormState] = useState<AuthFormState>({
    isLoading: false,
    errorMessage: null,
    successMessage: null,
  });

  const emailInputRef = useRef<HTMLInputElement>(null);
  const confirmationHeadingRef = useRef<HTMLHeadingElement>(null);

  // Autofocus email input on mount
  useEffect(() => {
    if (step === 'request') {
      emailInputRef.current?.focus();
    }
  }, [step]);

  // Focus confirmation heading on transition to State B for screen readers
  useEffect(() => {
    if (step === 'confirmation') {
      confirmationHeadingRef.current?.focus();
    }
  }, [step]);

  // Cooldown timer logic for resend email button
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const validateEmail = (val: string) => {
    if (!val.trim()) return 'Email address is required.';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(val.trim())) return 'Please enter a valid email address.';
    return undefined;
  };

  const handleBlur = () => {
    setTouched(true);
    setError(validateEmail(email));
  };

  const handleChange = (val: string) => {
    setEmail(val);
    setFormState((prev) => ({ ...prev, errorMessage: null }));
    if (touched) {
      setError(validateEmail(val));
    }
  };

  const sendResetEmail = async (targetEmail: string) => {
    const supabase = createClient();
    const redirectTo =
      typeof window !== 'undefined'
        ? `${window.location.origin}/sign-in`
        : undefined;

    // Always advance to confirmation regardless of whether the email exists
    // (avoids account enumeration). Still report transport-level failures.
    const { error } = await supabase.auth.resetPasswordForEmail(
      targetEmail.trim(),
      redirectTo ? { redirectTo } : undefined
    );

    if (error) {
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateEmail(email);
    setTouched(true);
    setError(err);

    if (err) return;

    setFormState({ isLoading: true, errorMessage: null, successMessage: null });

    try {
      await sendResetEmail(email);
      setSubmittedEmail(email);
      setFormState({ isLoading: false, errorMessage: null, successMessage: null });
      setStep('confirmation');
      setCooldown(30);
    } catch {
      setFormState({
        isLoading: false,
        errorMessage: 'Unable to send a reset link right now. Please try again.',
        successMessage: null,
      });
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || formState.isLoading) return;

    setFormState({ isLoading: true, errorMessage: null, successMessage: null });

    try {
      await sendResetEmail(submittedEmail);
      setFormState({
        isLoading: false,
        errorMessage: null,
        successMessage: 'A new reset link has been dispatched to your email.',
      });
      setCooldown(30);
    } catch {
      setFormState({
        isLoading: false,
        errorMessage: 'Unable to resend the reset link. Please try again.',
        successMessage: null,
      });
    }
  };

  return (
    <AuthCard>
      {step === 'request' ? (
        /* State A — Request Form */
        <div className="space-y-6">
          <div className="space-y-1.5">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Reset your password
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Enter your registered institutional email address and we&apos;ll send you instructions to reset your password.
            </p>
          </div>

          <FormAlert
            type="error"
            message={formState.errorMessage}
            onDismiss={() => setFormState((prev) => ({ ...prev, errorMessage: null }))}
          />

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="reset-email"
                className="block text-xs font-semibold uppercase tracking-wider text-foreground"
              >
                Institutional Email Address
              </label>
              <input
                id="reset-email"
                type="email"
                ref={emailInputRef}
                value={email}
                onChange={(e) => handleChange(e.target.value)}
                onBlur={handleBlur}
                placeholder="custodian@crmc.edu.ph"
                disabled={formState.isLoading}
                className={`flex h-11 w-full rounded-xl border bg-background px-3.5 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 transition-colors ${
                  error && touched
                    ? 'border-red-500'
                    : 'border-border'
                }`}
              />
              {error && touched && (
                <p className="text-xs text-red-500 font-medium animate-in fade-in-50">
                  {error}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={formState.isLoading}
              className="w-full h-11 inline-flex items-center justify-center gap-2 rounded-xl bg-[#FF4E45] hover:bg-[#E03E36] text-white font-medium text-sm shadow-md shadow-[#FF4E45]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.99]"
            >
              {formState.isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Sending Reset Link...</span>
                </>
              ) : (
                <span>Send Reset Link</span>
              )}
            </button>
          </form>

          <div className="pt-4 border-t border-border text-center">
            <Link
              href="/sign-in"
              className="inline-flex items-center justify-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md py-1 px-2 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Sign In</span>
            </Link>
          </div>
        </div>
      ) : (
        /* State B — Confirmation */
        <div className="space-y-6 text-center">
          {/* Icon Illustration */}
          <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shadow-inner">
            <MailCheck className="w-7 h-7" />
          </div>

          <div className="space-y-2">
            <h2
              ref={confirmationHeadingRef}
              tabIndex={-1}
              className="text-2xl font-bold tracking-tight text-foreground outline-none"
            >
              Check your email
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
              If an active account exists for{' '}
              <span className="font-semibold text-foreground break-all">{submittedEmail}</span>,
              you will receive a password reset link shortly.
            </p>
          </div>

          <FormAlert
            type="success"
            message={formState.successMessage}
            onDismiss={() => setFormState((prev) => ({ ...prev, successMessage: null }))}
          />

          <div className="space-y-3 pt-2">
            <button
              type="button"
              onClick={handleResend}
              disabled={cooldown > 0 || formState.isLoading}
              className="w-full h-11 inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background hover:bg-muted text-foreground font-medium text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {formState.isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className={`w-4 h-4 ${cooldown > 0 ? 'opacity-40' : ''}`} />
              )}
              <span>
                {cooldown > 0
                  ? `Resend email in ${cooldown}s`
                  : 'Resend email instruction'}
              </span>
            </button>

            <div className="pt-2">
              <Link
                href="/sign-in"
                className="inline-flex items-center justify-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md py-1 px-2 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Sign In</span>
              </Link>
            </div>
          </div>

          <div className="pt-4 border-t border-border text-center">
            <p className="text-[11px] text-muted-foreground">
              Did not receive an email? Check your spam folder or contact the Property Custodian&apos;s Office.
            </p>
          </div>
        </div>
      )}
    </AuthCard>
  );
}
