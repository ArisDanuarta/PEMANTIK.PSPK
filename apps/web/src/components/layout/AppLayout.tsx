"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Sidebar } from "./Sidebar";
import type { NavSection } from "./Sidebar";
import { usePathname } from "next/navigation";

interface AppLayoutProps {
  role: string;
  roleName: string;
  roleChipClass: string;
  roleLabel: string;
  sections: NavSection[];
  children: React.ReactNode;
  topbarRight?: React.ReactNode;
}

export default function AppLayout({
  role,
  roleName,
  roleChipClass,
  roleLabel,
  sections,
  children,
  topbarRight,
}: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Close sidebar on route change (mobile nav)
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // Close sidebar on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSidebarOpen(false);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  const toggleSidebar = useCallback(() => setSidebarOpen((v) => !v), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  return (
    <div className="layout-root">
      {/* Mobile overlay backdrop */}
      {sidebarOpen && (
        <div
          className="sidebar-mobile-overlay"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* Sidebar - responsive via CSS class */}
      <div className={`layout-sidebar-wrapper ${sidebarOpen ? "sidebar-open" : ""}`}>
        <Sidebar role={role} roleName={roleName} sections={sections} />
      </div>

      {/* Main content area */}
      <div className="layout-main">
        <header className="layout-topbar">
          {/* Hamburger button - hidden on desktop, visible on mobile */}
          <button
            className="sidebar-toggle-btn"
            onClick={toggleSidebar}
            aria-label={sidebarOpen ? "Tutup menu" : "Buka menu"}
            aria-expanded={sidebarOpen}
            aria-controls="sidebar-nav"
          >
            <span className={`hamburger-icon ${sidebarOpen ? "is-open" : ""}`}>
              <span />
              <span />
              <span />
            </span>
          </button>

          {/* Role chip */}
          <div className="topbar-role">
            <span className={`role-chip ${roleChipClass}`}>{roleLabel}</span>
          </div>

          {/* Right slot (optional extras) */}
          {topbarRight && (
            <div className="topbar-right">{topbarRight}</div>
          )}
        </header>

        <main className="layout-content" id="main-content">
          {children}
        </main>
      </div>
    </div>
  );
}
