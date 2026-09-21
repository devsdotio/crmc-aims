'use client';

import React, { useEffect } from 'react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';

interface FormAlertProps {
  type?: 'error' | 'success';
  message: string | null;
  onDismiss?: () => void;
  className?: string;
  id?: string;
}

export function FormAlert({
  type = 'error',
  message,
  onDismiss,
  className = '',
  id,
}: FormAlertProps) {
  useEffect(() => {
    if (!message || !onDismiss) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onDismiss();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [message, onDismiss]);

  if (!message) return null;

  const isError = type === 'error';

  return (
    <div
      id={id}
      role="alert"
      aria-live={isError ? 'assertive' : 'polite'}
      className={`relative flex items-start gap-3 p-3.5 rounded-xl border text-xs sm:text-sm font-medium transition-all animate-in fade-in-50 duration-200 ${
        isError
          ? 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400'
          : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
      } ${className}`}
    >
      <div className="shrink-0 pt-0.5">
        {isError ? (
          <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
        ) : (
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        )}
      </div>

      <div className="flex-1 pr-6 leading-relaxed">
        {message}
      </div>

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss alert"
          className="absolute top-3 right-3 p-1 rounded-md opacity-70 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-opacity"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
