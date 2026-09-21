"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  Package,
  Layers,
  History,
  ClipboardList,
  Wrench,
  Truck,
  Briefcase,
  Users,
  ShieldCheck,
  Loader2,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export type LoadingIconType =
  | "package"
  | "layers"
  | "history"
  | "clipboard"
  | "wrench"
  | "truck"
  | "project"
  | "users"
  | "shield"
  | "spinner";

export interface LoadingOptions {
  /** Main loading message displayed below the animated icon */
  message?: string;
  /** Optional secondary explanatory subtext */
  subtitle?: string;
  /** Icon theme corresponding to the system domain */
  icon?: LoadingIconType;
  /** Fullscreen overlay with backdrop blur or subtle transparent backdrop */
  backdrop?: "blur" | "subtle" | "none";
}

interface LoadingTask extends LoadingOptions {
  id: string;
}

export interface LoadingContextValue {
  /** Show global loading overlay with custom message & icon */
  showLoading: (options?: string | LoadingOptions) => string;
  /** Hide global loading overlay by ID (or hide the most recent/all if no ID given) */
  hideLoading: (id?: string) => void;
  /** Check if global loading is active */
  isLoading: boolean;
  /** Active loading message if any */
  currentMessage: string | null;
}

// ─── Icon Map ─────────────────────────────────────────────────────────────────

const ICON_MAP: Record<LoadingIconType, LucideIcon> = {
  package: Package,
  layers: Layers,
  history: History,
  clipboard: ClipboardList,
  wrench: Wrench,
  truck: Truck,
  project: Briefcase,
  users: Users,
  shield: ShieldCheck,
  spinner: Loader2,
};

// ─── Standalone LoadingState Component ────────────────────────────────────────

export interface LoadingStateProps {
  /** Main message text */
  message?: string;
  /** Secondary explanatory text */
  subtitle?: string;
  /** Domain icon theme */
  icon?: LoadingIconType;
  /** Visual presentation mode */
  variant?: "card" | "inline" | "full";
  /** Optional container className */
  className?: string;
}

export function LoadingState({
  message = "Loading data...",
  subtitle,
  icon = "history",
  variant = "full",
  className,
}: LoadingStateProps) {
  const IconComponent = ICON_MAP[icon] || History;
  const isSpinner = icon === "spinner";

  const content = (
    <div className="flex flex-col items-center gap-3 text-text-secondary animate-pulse text-center max-w-sm px-4">
      <IconComponent
        className={cn(
          "h-8 w-8 text-accent shrink-0",
          isSpinner ? "animate-spin" : "animate-bounce"
        )}
      />
      <div className="space-y-1">
        <span className="text-xs font-semibold text-text block">{message}</span>
        {subtitle && (
          <span className="text-[11px] text-text-secondary block leading-relaxed">
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );

  if (variant === "card") {
    return (
      <div
        className={cn(
          "p-8 rounded-xl border border-border bg-bg shadow-xs flex flex-col items-center justify-center text-center",
          className
        )}
      >
        {content}
      </div>
    );
  }

  if (variant === "inline") {
    return (
      <div className={cn("p-4 flex items-center justify-center", className)}>
        {content}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center p-8",
        className
      )}
    >
      {content}
    </div>
  );
}

// ─── Context ──────────────────────────────────────────────────────────────────

const LoadingContext = createContext<LoadingContextValue | null>(null);

export function useLoading(): LoadingContextValue {
  const ctx = useContext(LoadingContext);
  if (!ctx) {
    throw new Error("useLoading must be used within a <LoadingProvider>");
  }
  return ctx;
}

// ─── Provider Component ───────────────────────────────────────────────────────

interface LoadingProviderProps {
  children: ReactNode;
}

export function LoadingProvider({ children }: LoadingProviderProps) {
  const [tasks, setTasks] = useState<LoadingTask[]>([]);

  const showLoading = useCallback((options?: string | LoadingOptions) => {
    const id = `loading-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const parsedOptions: LoadingOptions =
      typeof options === "string" ? { message: options } : options || {};

    const newTask: LoadingTask = {
      id,
      message: parsedOptions.message || "Processing request...",
      subtitle: parsedOptions.subtitle,
      icon: parsedOptions.icon || "history",
      backdrop: parsedOptions.backdrop || "blur",
    };

    setTasks((prev) => [...prev, newTask]);
    return id;
  }, []);

  const hideLoading = useCallback((id?: string) => {
    setTasks((prev) => {
      if (!id) return [];
      return prev.filter((t) => t.id !== id);
    });
  }, []);

  const currentTask = tasks[tasks.length - 1] || null;
  const isLoading = tasks.length > 0;
  const currentMessage = currentTask?.message || null;

  const value = useMemo(
    () => ({
      showLoading,
      hideLoading,
      isLoading,
      currentMessage,
    }),
    [showLoading, hideLoading, isLoading, currentMessage]
  );

  return (
    <LoadingContext.Provider value={value}>
      {children}

      {/* Global Animated Overlay */}
      {isLoading && currentTask && (
        <div
          role="status"
          aria-live="polite"
          aria-label={currentTask.message || "Loading"}
          className={cn(
            "fixed inset-0 z-100 flex items-center justify-center transition-all duration-200",
            currentTask.backdrop === "blur"
              ? "bg-bg/70 backdrop-blur-sm"
              : currentTask.backdrop === "subtle"
              ? "bg-black/20"
              : "bg-transparent"
          )}
        >
          <div className="p-8 rounded-2xl border border-border bg-bg/95 backdrop-blur-md shadow-2xl flex flex-col items-center justify-center text-center max-w-sm mx-4 animate-in zoom-in-95 duration-200">
            <LoadingState
              variant="inline"
              icon={currentTask.icon}
              message={currentTask.message}
              subtitle={currentTask.subtitle}
            />
          </div>
        </div>
      )}
    </LoadingContext.Provider>
  );
}
