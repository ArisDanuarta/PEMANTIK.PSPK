"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";
import Image from "next/image";
import { logoutAction } from "@/app/actions/auth";
import NotificationBell from "@/components/shared/NotificationBell";
import { useSidebar } from "./SidebarProvider";

export interface NavItem {
  label: string;
  href: string;
  icon?: string | React.ReactNode;
  badge?: string | number;
}

export interface NavSection {
  label?: string;
  items: NavItem[];
}

interface SidebarProps {
  role: string;
  roleName: string;
  userName?: string;
  sections: NavSection[];
}

// Simple outline SVG icons (consistent with PSPK icon guideline: outline style)
export const Icons = {
  Dashboard: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  Users: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  School: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  Question: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 9a3 3 0 1 1 5.12 2.12C13.45 11.79 13 12.38 13 13v1" />
      <circle cx="12" cy="17" r=".5" fill="currentColor" />
      <circle cx="12" cy="12" r="10" />
    </svg>
  ),
  Report: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 20V10" />
      <path d="M12 20V4" />
      <path d="M6 20v-6" />
    </svg>
  ),
  Settings: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.07 4.93a10 10 0 0 0-14.14 0" />
      <path d="M4 12H2m20 0h-2M12 4V2m0 20v-2" />
    </svg>
  ),
  Exam: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M8 7h8M8 11h8M8 15h4" />
    </svg>
  ),
  Class: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" y1="8" x2="19" y2="14" />
      <line x1="22" y1="11" x2="16" y2="11" />
    </svg>
  ),
  Review: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  Logout: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
  Teacher: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  ),
  Student: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c3 3 9 3 12 0v-5" />
    </svg>
  ),
  Activity: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  ),
  Folder: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  ),
};

// Icon mapping table for server components to pass serializable icon names
const IconMap: Record<string, React.ComponentType> = {
  dashboard: Icons.Dashboard,
  users: Icons.Users,
  school: Icons.School,
  question: Icons.Question,
  report: Icons.Report,
  settings: Icons.Settings,
  exam: Icons.Exam,
  class: Icons.Class,
  review: Icons.Review,
  teacher: Icons.Teacher,
  student: Icons.Student,
  activity: Icons.Activity,
  dapodik: Icons.Folder,
  folder: Icons.Folder,
};

export function Sidebar({ role, roleName, userName, sections }: SidebarProps) {
  const pathname = usePathname();
  const { isOpen, isMobile } = useSidebar();
  
  // Jika mobile, render apa adanya (karena collapsed artinya off-canvas/drawer hilang)
  // Jika desktop, isCollapsed = !isOpen
  const isCollapsed = !isMobile && !isOpen;

  return (
    <aside className="layout-sidebar" id="sidebar-nav" aria-label="Navigasi utama">
      {/* Logo */}
      <div 
        className={`sidebar-logo ${isCollapsed ? "justify-center" : ""}`}
        style={{ padding: isCollapsed ? '1.25rem 0' : '1.25rem 1.5rem' }}
      >
        <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: 64 }}>
          <Image
            src="/images/LOGO_PEMANTIK_PUTIH_KUNING.png"
            alt="Logo Pemantik PSPK"
            fill
            sizes="200px"
            priority
            style={{ 
              objectFit: "contain",
              opacity: isCollapsed ? 0 : 1,
              transition: "opacity 200ms ease",
              pointerEvents: isCollapsed ? "none" : "auto",
            }}
          />
          <Image
            src="/images/SIDEBAR_MINI.PNG"
            alt="Logo PSPK Mini"
            fill
            sizes="64px"
            priority
            style={{ 
              objectFit: "contain",
              opacity: isCollapsed ? 1 : 0,
              transition: "opacity 200ms ease",
              pointerEvents: isCollapsed ? "auto" : "none",
            }}
          />
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav" aria-label="Menu navigasi" role="navigation">
        {sections.map((section, si) => (
          <div key={si} className={isCollapsed ? "mt-4" : ""}>
            {section.label && (
              <div 
                className="sidebar-section-label"
                style={{
                  opacity: isCollapsed ? 0 : 1,
                  maxHeight: isCollapsed ? 0 : 40,
                  overflow: "hidden",
                  transition: "opacity 200ms ease, max-height 300ms ease",
                  marginBottom: isCollapsed ? 0 : undefined,
                  whiteSpace: "nowrap",
                }}
              >
                {section.label}
              </div>
            )}
            {/* Pada mode collapsed, kalau mau kita bisa tampilkan divider tipis antar section */}
            {section.label && isCollapsed && si > 0 && (
              <div className="mx-4 my-2 border-t border-white/10" />
            )}
            {section.items.map((item) => {
              const exactMatch = sections.some(s => s.items.some(i => i.href === pathname));
              const isActive = 
                pathname === item.href || 
                (!exactMatch && item.href !== "/" && pathname.startsWith(`${item.href}/`));
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`sidebar-item ${isActive ? "active" : ""} ${isCollapsed ? "justify-center px-0" : ""}`}
                  aria-current={isActive ? "page" : undefined}
                  title={isCollapsed ? item.label : undefined} // Tooltip pada hover
                >
                  {item.icon && (
                    <span className="sidebar-item-icon" aria-hidden="true">
                      {typeof item.icon === "string" ? (
                        React.createElement(IconMap[item.icon] || Icons.Dashboard)
                      ) : (
                        item.icon
                      )}
                    </span>
                  )}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      flex: 1,
                      opacity: isCollapsed ? 0 : 1,
                      maxWidth: isCollapsed ? 0 : 200,
                      overflow: "hidden",
                      whiteSpace: "nowrap",
                      transition: "opacity 200ms ease, max-width 300ms ease",
                    }}
                  >
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {item.badge != null && (
                      <span
                        style={{
                          background: isActive
                            ? "rgba(242,175,62,0.3)"
                            : "rgba(255,255,255,0.15)",
                          color: isActive ? "var(--clr-kuning)" : "rgba(255,255,255,0.7)",
                          fontSize: "0.65rem",
                          fontWeight: 700,
                          padding: "0.1rem 0.4rem",
                          borderRadius: 999,
                          minWidth: 18,
                          textAlign: "center",
                        }}
                      >
                        {item.badge}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className={`sidebar-footer ${isCollapsed ? "flex flex-col items-center px-2" : ""}`}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            marginBottom: "0.75rem",
            justifyContent: isCollapsed ? "center" : "flex-start",
            flexDirection: isCollapsed ? "column" : "row"
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "rgba(242,175,62,0.2)",
              border: "1.5px solid rgba(242,175,62,0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--clr-kuning)" }}>
              {(userName ?? roleName).charAt(0).toUpperCase()}
            </span>
          </div>
          <div
            style={{
              flex: 1,
              opacity: isCollapsed ? 0 : 1,
              maxWidth: isCollapsed ? 0 : 150,
              overflow: "hidden",
              transition: "opacity 200ms ease, max-width 300ms ease",
            }}
          >
            <div
              style={{
                color: "#fff",
                fontSize: "0.8rem",
                fontWeight: 600,
                wordBreak: "break-word",
                lineHeight: "1.2",
                paddingBottom: "2px",
              }}
            >
              {userName ?? "Pengguna"}
            </div>
            <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.65rem", whiteSpace: "nowrap" }}>
              {roleName}
            </div>
          </div>
          {/* Notification Bell - Hide label if inside it has one, but it is just a bell icon */}
          <div style={{
            opacity: isCollapsed ? 0 : 1,
            maxWidth: isCollapsed ? 0 : 32,
            overflow: "hidden",
            transition: "opacity 200ms ease, max-width 300ms ease",
          }}>
            <NotificationBell />
          </div>
        </div>
        <form action={logoutAction} style={{ width: "100%" }}>
          <button type="submit" className={`sidebar-item ${isCollapsed ? "justify-center px-0" : ""}`} style={{ borderRadius: "var(--radius-md)", width: "100%", background: "none", border: "none", cursor: "pointer", textAlign: isCollapsed ? "center" : "left" }} title={isCollapsed ? "Keluar" : undefined}>
            <span className="sidebar-item-icon" aria-hidden="true">
              <Icons.Logout />
            </span>
            <span
              style={{
                opacity: isCollapsed ? 0 : 1,
                maxWidth: isCollapsed ? 0 : 100,
                overflow: "hidden",
                whiteSpace: "nowrap",
                transition: "opacity 200ms ease, max-width 300ms ease",
              }}
            >
              Keluar
            </span>
          </button>
        </form>
      </div>
    </aside>
  );
}