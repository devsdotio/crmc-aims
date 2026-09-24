"use client";

import React from "react";
import Image from "next/image";
import { ArrowUpRight, Building2, Check, ShieldCheck } from "lucide-react";

interface AuthLayoutProps {
  children: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-bg-subtle text-foreground">
      <div className="flex h-full w-full flex-col overflow-hidden bg-card lg:flex-row">
        {/* Left/Top Branding Panel */}
        <div className="relative flex w-full shrink-0 flex-col justify-between overflow-hidden bg-text p-6 text-white sm:p-8 lg:w-[47%] lg:p-12 xl:p-16">
          {/* Background Decorative Accent Elements */}
          <div className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-[#FF4E45]/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 -right-24 h-md w-md rounded-full bg-blue-500/15 blur-3xl" />
          <div className="pointer-events-none absolute left-1/2 top-1/2 hidden h-125 w-125 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/5 bg-white/2 lg:block" />

          {/* Header / Logo */}
          <div className="relative z-10 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white p-2 shadow-lg shadow-black/20">
              <Image
                src="/aims-logo.svg"
                alt="AIMS Logo"
                width={36}
                height={36}
                className="w-full h-full object-contain"
                priority
              />
            </div>
            <div>
              <h1 className="text-xl font-bold leading-tight tracking-[0.18em] text-white">
                AIMS
              </h1>
              <p className="text-xs font-medium text-white/70">
                Asset & Inventory Management
              </p>
            </div>
            </div>
            <span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-white/70">
              Secure
            </span>
          </div>

          <div className="relative z-10 my-8 space-y-6 lg:my-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90 backdrop-blur-sm">
              <Building2 className="h-3.5 w-3.5 text-[#FF4E45]" />
              <span>Enterprise Workspace</span>
            </div>

            <div className="space-y-3">
              <h2 className="max-w-xl text-2xl font-bold leading-tight tracking-tight text-white lg:text-4xl">
                Keep every asset accounted for.
              </h2>
              <p className="max-w-lg text-sm font-normal leading-relaxed text-white/75 lg:text-base">
                A single workspace for physical asset tracking, equipment borrowing,
                maintenance, and accountable inventory operations.
              </p>
            </div>

            {/* Highlights */}
            <div className="grid grid-cols-1 gap-2.5 pt-2 text-xs text-white/80 sm:grid-cols-2">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#FF4E45]/15">
                  <Check className="h-3 w-3 text-[#FF6B62]" />
                </span>
                <span>Institutional audit ready</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#FF4E45]/15">
                  <ShieldCheck className="h-3 w-3 text-[#FF6B62]" />
                </span>
                <span>Role-based access</span>
              </div>
            </div>
          </div>

          {/* Footer info */}
          <div className="relative z-10 flex items-center justify-between border-t border-white/10 pt-4 text-xs text-white/50">
            <span>&copy; {new Date().getFullYear()} AIMS</span>
            <span className="inline-flex items-center gap-1">
              Operations portal <ArrowUpRight className="h-3 w-3" />
            </span>
          </div>
        </div>

        {/* Right/Bottom Form Panel */}
        <main className="flex h-full w-full flex-1 flex-col justify-center overflow-y-auto bg-card px-6 py-10 sm:px-10 lg:w-[53%] lg:px-16">
          <div className="mx-auto flex h-full w-full max-w-md flex-col justify-center">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
