/// <reference path="../phantom-ui.d.ts" />
"use client";

import React, { useEffect, useRef } from "react";

// Import phantom-ui web component (client-side only via useEffect)

interface PhantomSkeletonProps {
  /** Whether the skeleton loader is active */
  loading: boolean;
  /** The actual content to show when loaded */
  children: React.ReactNode;
  /** Optional className for the wrapper */
  className?: string;
}

/**
 * PhantomSkeleton - Structure-aware skeleton loader using phantom-ui Web Component.
 *
 * Usage:
 * ```tsx
 * <PhantomSkeleton loading={isLoading}>
 *   <div className="card">
 *     <img src={user.avatar} width={48} height={48} />
 *     <h3>{user.name}</h3>
 *   </div>
 * </PhantomSkeleton>
 * ```
 */
export function PhantomSkeleton({
  loading,
  children,
  className,
}: PhantomSkeletonProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    // Register custom element client-side only
    import("@aejkatappaja/phantom-ui").catch(() => {});
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (loading) {
      el.setAttribute("loading", "");
    } else {
      el.removeAttribute("loading");
    }
  }, [loading]);

  return React.createElement(
    "phantom-ui",
    {
      ref,
      class: className,
      ...(loading ? { loading: "" } : {}),
    },
    children
  );
}

