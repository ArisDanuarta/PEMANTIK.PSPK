"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

type SidebarContextValue = {
  isOpen: boolean;
  toggle: () => void;
  open: () => void;
  close: () => void;
  isMobile: boolean;
};

const SidebarContext = createContext<SidebarContextValue | undefined>(undefined);

export function SidebarProvider({
  children,
  defaultOpen = true,
  persistKey,
}: {
  children: React.ReactNode;
  defaultOpen?: boolean;
  persistKey?: string;
}) {
  // Initialize state based on persistKey if provided, otherwise use defaultOpen
  const [isOpen, setIsOpen] = useState<boolean>(() => {
    if (typeof window !== "undefined" && persistKey) {
      const stored = localStorage.getItem(persistKey);
      if (stored !== null) {
        return stored === "true";
      }
    }
    return defaultOpen;
  });

  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    // Media query to detect < md (768px)
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const handleMediaChange = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsMobile(e.matches);
      if (e.matches) {
        // On mobile, sidebar is closed by default to act as drawer
        setIsOpen(false);
      } else {
        // On desktop/tablet, revert to defaultOpen or persisted state
        const stored = persistKey ? localStorage.getItem(persistKey) : null;
        setIsOpen(stored !== null ? stored === "true" : defaultOpen);
      }
    };
    
    // Initial check
    handleMediaChange(mediaQuery);
    
    mediaQuery.addEventListener("change", handleMediaChange);
    return () => mediaQuery.removeEventListener("change", handleMediaChange);
  }, [defaultOpen, persistKey]);

  const toggle = useCallback(() => {
    setIsOpen((prev) => {
      const next = !prev;
      if (persistKey && typeof window !== "undefined") {
        localStorage.setItem(persistKey, String(next));
      }
      return next;
    });
  }, [persistKey]);

  const open = useCallback(() => {
    setIsOpen(true);
    if (persistKey && typeof window !== "undefined") {
      localStorage.setItem(persistKey, "true");
    }
  }, [persistKey]);

  const close = useCallback(() => {
    setIsOpen(false);
    if (persistKey && typeof window !== "undefined") {
      localStorage.setItem(persistKey, "false");
    }
  }, [persistKey]);

  return (
    <SidebarContext.Provider value={{ isOpen, toggle, open, close, isMobile }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
}
