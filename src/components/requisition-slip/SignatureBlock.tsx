"use client";

import { cn } from "@/lib/utils";

interface SignatureBlockProps {
  label: string;
  nameValue?: string;
  onNameChange?: (val: string) => void;
  titleCaption?: string;
  readOnly?: boolean;
  className?: string;
}

export function SignatureBlock({
  label,
  nameValue = "",
  onNameChange,
  titleCaption,
  readOnly = false,
  className,
}: SignatureBlockProps) {
  return (
    <div className={cn("flex flex-col items-center text-center", className)}>
      <div className="w-full min-w-35 max-w-50">
        {readOnly ? (
          <div className="h-8 flex items-end justify-center border-b border-primary/40 px-2 pb-1">
            <span className="text-sm font-bold text-primary truncate">
              {nameValue}
            </span>
          </div>
        ) : (
          <input
            type="text"
            value={nameValue}
            onChange={(e) => onNameChange?.(e.target.value)}
            className="w-full h-8 text-[8px] font-bold text-primary text-center bg-transparent border-b border-primary/40 focus:outline-none focus:border-primary transition-colors px-2"
            aria-label={`Name for ${label}`}
          />
        )}
        <div className="mt-1 flex flex-col gap-0.5">
          <p className="text-[10px] font-medium text-text-secondary uppercase tracking-wider">
            {label}
          </p>
          <p className="text-[10px] text-text-secondary/80">
            {titleCaption ? titleCaption : "(Name & Signature)"}
          </p>
        </div>
      </div>
    </div>
  );
}
