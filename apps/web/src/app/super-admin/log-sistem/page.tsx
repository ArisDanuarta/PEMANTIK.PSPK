import type { Metadata } from "next";
import { createServerClient } from "@pemantik/supabase";
import React from "react";
import SystemLogViewer from "./SystemLogViewer";
import { getSystemLogStats } from "@/app/actions/logs";
import { StatGrid } from "@/components/ui/responsive/StatGrid";

export const metadata: Metadata = {
  title: "Log Sistem & Error",
  description: "Pemantauan error realtime lintas platform",
};

export default async function LogSistemPage() {
  const supabase = createServerClient();

  // Load 50 log terakhir
  let initialLogs: any[] = [];
  try {
    const { data, error } = await (supabase as any)
      .from("system_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    
    if (error) {
      console.error("Failed to load logs:", error);
    } else {
      initialLogs = data ?? [];
    }
  } catch (err) {
    console.error("Unexpected error loading logs:", err);
  }

  const stats = await getSystemLogStats();

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Log Sistem &amp; Error</h1>
          <div className="page-breadcrumb">
            <span>Super Admin</span>
            <span className="page-breadcrumb-sep">›</span>
            <span>Laporan &amp; Sistem</span>
            <span className="page-breadcrumb-sep">›</span>
            <span>Log Sistem</span>
          </div>
        </div>
      </div>

      <StatGrid columns={{ base: 1, md: 3, lg: 3 }} className="mb-6">
        <div className="stat-card">
          <div className="stat-card-accent merah" />
          <div className="stat-card-label">Error Hari Ini</div>
          <div className="stat-card-value">{stats.errorsToday}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-accent merah" />
          <div className="stat-card-label">Critical Unresolved</div>
          <div className="stat-card-value" style={{ color: stats.criticalUnresolved > 0 ? "var(--color-merah)" : "inherit" }}>
            {stats.criticalUnresolved}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-accent biru" />
          <div className="stat-card-label">Status Realtime</div>
          <div className="stat-card-value" style={{ fontSize: "1.25rem", color: "var(--color-success)" }}>
            <span style={{ display: "inline-block", width: 12, height: 12, background: "var(--color-success)", borderRadius: "50%", marginRight: 8, animation: "pulse 2s infinite" }}></span>
            Active
          </div>
        </div>
      </StatGrid>

      <SystemLogViewer initialLogs={initialLogs} />
    </div>
  );
}
