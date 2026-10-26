'use client';

import React, { useState, forwardRef } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';


export interface PasswordInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  error?: boolean;
  variant?: 'outline' | 'underline';
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className = '', error, disabled, variant = 'outline', ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);

    const togglePasswordVisibility = (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      setShowPassword((prev) => !prev);
    };

    if (variant === 'underline') {
      return (
        <div className="relative flex items-center w-full">
          <input
            {...props}
            ref={ref}
            type={showPassword ? 'text' : 'password'}
            disabled={disabled}
            className={`flex h-11 w-full border-0 border-b bg-transparent px-0 py-2.5 pr-16 text-sm placeholder:text-muted-foreground/70 focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-50 transition-colors ${
              error
                ? 'border-red-500 focus:border-red-500'
                : 'border-slate-200 dark:border-zinc-700 focus:border-[#FF4E45]'
            } ${className}`}
          />
          <div className="absolute right-0 flex items-center text-muted-foreground/60">
            <button
              type="button"
              tabIndex={0}
              onClick={togglePasswordVisibility}
              disabled={disabled}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="flex h-11 w-11 items-center justify-center rounded-lg hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4E45] transition-colors cursor-pointer"
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
            <Lock className="w-4 h-4 pointer-events-none" />
          </div>
        </div>
      );
    }

    return (
      <div className="relative flex items-center w-full">
        <input
          {...props}
          ref={ref}
          type={showPassword ? 'text' : 'password'}
          disabled={disabled}
          className={`flex h-11 w-full rounded-xl border bg-background px-3.5 py-2 pr-11 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus:outline-none focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 transition-colors ${
            error ? 'border-red-500' : 'border-border'
          } ${className}`}
        />
        <button
          type="button"
          tabIndex={0}
          onClick={togglePasswordVisibility}
          disabled={disabled}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          className="absolute right-3 p-1 rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 transition-colors"
        >
          {showPassword ? (
            <EyeOff className="w-4 h-4" />
          ) : (
            <Eye className="w-4 h-4" />
          )}
        </button>
      </div>
    );
  }
);

PasswordInput.displayName = 'PasswordInput';

