"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ConfirmDialog,
  type ConfirmDialogProps,
} from "@/components/shared/confirm-dialog";

export type ConfirmOptions = {
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmDialogProps["variant"];
  /** When set, runs before resolving true and keeps the dialog in a loading state. */
  action?: () => void | Promise<void>;
};

export type ConfirmContextValue = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function useConfirm(): ConfirmContextValue {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within <ConfirmProvider>");
  return ctx;
}

type PendingConfirm = ConfirmOptions & {
  resolve: (value: boolean) => void;
};

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const pendingRef = useRef<PendingConfirm | null>(null);

  const close = useCallback((result: boolean) => {
    const current = pendingRef.current;
    pendingRef.current = null;
    setPending(null);
    setIsLoading(false);
    current?.resolve(result);
  }, []);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      if (pendingRef.current) {
        pendingRef.current.resolve(false);
      }
      const next: PendingConfirm = { ...options, resolve };
      pendingRef.current = next;
      setIsLoading(false);
      setPending(next);
    });
  }, []);

  const handleConfirm = useCallback(async () => {
    const current = pendingRef.current;
    if (!current || isLoading) return;

    if (!current.action) {
      close(true);
      return;
    }

    setIsLoading(true);
    try {
      await current.action();
      close(true);
    } catch {
      setIsLoading(false);
    }
  }, [close, isLoading]);

  const handleClose = useCallback(() => {
    if (isLoading) return;
    close(false);
  }, [close, isLoading]);

  const value = useMemo(() => ({ confirm }), [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <ConfirmDialog
        isOpen={Boolean(pending)}
        title={pending?.title ?? ""}
        description={pending?.description ?? ""}
        confirmLabel={pending?.confirmLabel}
        cancelLabel={pending?.cancelLabel}
        variant={pending?.variant ?? "destructive"}
        isLoading={isLoading}
        onConfirm={handleConfirm}
        onClose={handleClose}
      />
    </ConfirmContext.Provider>
  );
}
