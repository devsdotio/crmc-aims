"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  TargetIllustration,
  InventoryIllustration,
  SecurityIllustration,
} from "./AuthIllustration";

interface AuthLayoutProps {
  children: React.ReactNode;
}

const SLIDES = [
  {
    id: "accountability",
    title: "Welcome!",
    description:
      "Manage, audit, and track institutional physical assets and departmental inventory in one unified workspace.",
    illustration: <TargetIllustration />,
  },
  {
    id: "inventory",
    title: "Smart Inventory Tracking",
    description:
      "Real-time equipment monitoring, fast requisitions, and accountable department custody records.",
    illustration: <InventoryIllustration />,
  },
  {
    id: "audit",
    title: "Institutional Audit Ready",
    description:
      "Comprehensive asset histories, preventative maintenance schedules, and role-based operational security.",
    illustration: <SecurityIllustration />,
  },
];

export function AuthLayout({ children }: AuthLayoutProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
  }, []);

  // Auto-scroll slides every 4.5 seconds (halt if hovered or if reduced-motion preferred)
  useEffect(() => {
    if (isPaused || shouldReduceMotion) return;
    const interval = setInterval(nextSlide, 4500);
    return () => clearInterval(interval);
  }, [isPaused, shouldReduceMotion, nextSlide]);

  return (
    <div className="flex min-h-screen lg:h-screen w-full flex-col lg:flex-row overflow-x-hidden bg-white dark:bg-card text-foreground">
      
      {/* Mobile-Only Header (< lg): Compact branded banner so form is above the fold */}
      <div className="flex lg:hidden items-center justify-between bg-gradient-to-r from-[#1B2140] via-[#242C52] to-[#14182E] px-6 py-4 text-white shadow-md">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white p-1.5 shadow-sm">
            <Image
              src="/aims-logo.svg"
              alt="AIMS Logo"
              width={26}
              height={26}
              className="w-full h-full object-contain"
              priority
            />
          </div>
          <div>
            <h1 className="text-base font-bold leading-tight tracking-[0.14em] text-white">
              CRMC AIMS
            </h1>
            <p className="text-[10px] font-medium text-white/70">
              Asset &amp; Inventory Management
            </p>
          </div>
        </div>
        <span className="rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/80">
          Portal
        </span>
      </div>

      {/* Desktop Left Branding & Illustration Hero Panel (>= lg, 55% width) */}
      <section
        role="region"
        aria-roledescription="carousel"
        aria-label="AIMS Platform Highlights"
        aria-live={isPaused ? "polite" : "off"}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        className="relative hidden lg:flex h-full w-full shrink-0 flex-col justify-between overflow-hidden bg-gradient-to-br from-[#1B2140] via-[#242C52] to-[#14182E] p-8 sm:p-10 lg:w-[55%] lg:p-14 xl:p-16 text-white select-none"
      >
        {/* Bottom subtle ambient accent */}
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />

        {/* Header / Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white p-2 shadow-md shadow-black/20">
            <Image
              src="/aims-logo.svg"
              alt="AIMS Logo"
              width={32}
              height={32}
              className="w-full h-full object-contain"
              priority
            />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold leading-tight tracking-[0.16em] text-white">
              CRMC AIMS
            </h1>
            <p className="text-[11px] font-medium text-white/70">
              Asset &amp; Inventory Management
            </p>
          </div>
        </div>

        {/* Middle Auto-Scrolling Illustration */}
        <div className="relative z-10 my-auto py-6 flex items-center justify-center min-h-[340px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, scale: shouldReduceMotion ? 1 : 0.94, x: shouldReduceMotion ? 0 : 25 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: shouldReduceMotion ? 1 : 0.94, x: shouldReduceMotion ? 0 : -25 }}
              transition={{ duration: shouldReduceMotion ? 0.2 : 0.45, ease: "easeInOut" }}
              className="flex items-center justify-center w-full"
            >
              {SLIDES[currentSlide].illustration}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom Welcome Content & Interactive Dots */}
        <div className="relative z-10 space-y-3.5">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: shouldReduceMotion ? 0 : -12 }}
              transition={{ duration: shouldReduceMotion ? 0.2 : 0.35, ease: "easeInOut" }}
              className="space-y-1.5"
            >
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                {SLIDES[currentSlide].title}
              </h2>
              <p className="mt-1 max-w-lg text-xs sm:text-sm font-normal leading-relaxed text-white/80">
                {SLIDES[currentSlide].description}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Accessible Pagination / Slider Dots with >= 44px hitboxes */}
          <div className="flex items-center gap-1 pt-1" role="tablist" aria-label="Slide selectors">
            {SLIDES.map((slide, idx) => (
              <button
                key={slide.id}
                type="button"
                role="tab"
                aria-selected={currentSlide === idx}
                aria-label={`Slide ${idx + 1}: ${slide.title}`}
                onClick={() => setCurrentSlide(idx)}
                className="flex h-11 items-center justify-center px-1.5 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-full"
              >
                <span
                  className={`h-2.5 transition-all duration-300 rounded-full ${
                    currentSlide === idx
                      ? "w-8 bg-[#FF4E45] ring-4 ring-[#FF4E45]/25"
                      : "w-2.5 bg-white/40 hover:bg-white/60"
                  }`}
                />
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Right Form Panel (45% on desktop, 100% on mobile) */}
      <main className="flex min-h-[calc(100vh-68px)] lg:min-h-screen w-full flex-1 flex-col justify-center items-center overflow-y-auto bg-white dark:bg-card px-6 sm:px-10 lg:w-[45%] lg:px-10 xl:px-16 py-8 sm:py-12">
        <div className="w-full max-w-md mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}



