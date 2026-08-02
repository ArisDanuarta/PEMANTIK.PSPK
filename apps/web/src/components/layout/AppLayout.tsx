"use client";

import React, { useEffect } from "react";
import { Sidebar } from "./Sidebar";
import type { NavSection } from "./Sidebar";
import { usePathname } from "next/navigation";
import { SidebarProvider, useSidebar } from "./SidebarProvider";

interface AppLayoutProps {
  role: string;
  roleName: string;
  roleChipClass: string;
  roleLabel: string;
  userName?: string;
  sections: NavSection[];
  children: React.ReactNode;
  topbarRight?: React.ReactNode;
}

function AppLayoutContent({
  role,
  roleName,
  roleChipClass,
  roleLabel,
  userName,
  sections,
  children,
  topbarRight,
}: AppLayoutProps) {
  const { isOpen, toggle, close, isMobile } = useSidebar();
  const pathname = usePathname();

  // Close sidebar on route change (mobile nav)
  useEffect(() => {
    if (isMobile) {
      close();
    }
  }, [pathname, isMobile, close]);

  // Close sidebar on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [close]);

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (isMobile && isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobile, isOpen]);

  // On desktop, wrapper gets 'sidebar-collapsed' if !isOpen
  // On mobile, wrapper gets 'sidebar-open' if isOpen
  const sidebarClass = isMobile
    ? (isOpen ? "sidebar-open" : "")
    : (isOpen ? "" : "sidebar-collapsed");

  return (
    <div className="flex min-h-[100dvh]">
      {/* Mobile overlay backdrop */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 bg-[#102e50]/55 backdrop-blur-sm z-[199] animate-fade-in"
          onClick={close}
          aria-hidden="true"
        />
      )}

      {/* Sidebar wrapper */}
      <div
        className={`fixed top-0 left-0 h-[100dvh] z-[200] transition-all duration-300 ease-in-out ${isMobile
            ? (isOpen ? "translate-x-0 shadow-[8px_0_32px_rgba(16,46,80,0.25)]" : "-translate-x-full shadow-none")
            : "translate-x-0"
          }`}
        style={{ 
          width: isMobile ? 260 : (isOpen ? 260 : 80),
          willChange: "width",
          contain: "layout paint" 
        }}
      >
        <Sidebar role={role} roleName={roleName} userName={userName} sections={sections} />
      </div>

      {/* Main content area */}
      <div
        className={`flex-1 flex flex-col min-h-[100dvh] min-w-0 transition-all duration-300 ease-in-out`}
        style={{ 
          marginLeft: isMobile ? 0 : (isOpen ? 260 : 80),
          willChange: "margin-left",
          contain: "layout" 
        }}
      >
        <header
          className="h-[64px] bg-white border-b border-gray-200 flex items-center sticky top-0 z-[150] shadow-sm"
          style={{ paddingLeft: "clamp(1rem, 1vw, 1rem)", paddingRight: "clamp(1.5rem, 1vw, 1.5rem)" }}
        >
          {/* Hamburger button */}
          <button
            className="flex items-center justify-center w-10 h-10 rounded-md mr-4 flex-shrink-0 hover:bg-[#102e50]/5 focus:outline-none focus:ring-2 focus:ring-[#f2af3e]/50 transition-all md:flex"
            onClick={toggle}
            aria-label={isOpen ? "Tutup menu" : "Buka menu"}
            aria-expanded={isOpen}
            aria-controls="sidebar-nav"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-black">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>

          {/* Role chip */}
          <div className="flex-1 flex items-center">
            <span className={`role-chip ${roleChipClass}`}>{roleLabel}</span>
          </div>

          {/* Right slot (optional extras) */}
          {topbarRight && (
            <div className="flex items-center gap-2">
              {topbarRight}
            </div>
          )}
        </header>

        <main
          className="flex-1 flex flex-col min-w-0 py-6 lg:py-10"
          style={{ paddingLeft: "clamp(1rem, 1vw, 1rem)", paddingRight: "clamp(1.5rem, 1vw, 1.5rem)" }}
          id="main-content"
        >
          {children}
        </main>
      </div>
    </div>
  );
}

export default function AppLayout(props: AppLayoutProps) {
  return (
    <SidebarProvider defaultOpen={true}>
      <AppLayoutContent {...props} />
    </SidebarProvider>
  );
}
