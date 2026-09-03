import type { Metadata } from "next";
import { createServerClient } from "@pemantik/supabase";
import React from "react";
import PenelitiDashboardClient from "./PenelitiDashboardClient";

export const metadata: Metadata = {
  title: "Dashboard Peneliti",
  description: "Ringkasan eksekutif data asesmen nasional untuk peneliti",
};

export const dynamic = "force-dynamic";

export default async function PenelitiDashboardPage() {
  const supabase = createServerClient();

  let data = {
    totalStudents: 0,
    avgScoreTotal: 0,
    avgScoreLit: 0,
    avgScoreNum: 0,
    completionRate: 0,
    activeSchools: 0,
    topCommunities: [] as any[],
    monthlyTrend: [] as any[],
    levelDistribution: [] as any[]
  };

  try {
    const { data: rpcData, error } = await (supabase as any).rpc('get_peneliti_dashboard_stats');
    if (error) throw error;
    if (rpcData && typeof rpcData === 'object') {
      data = { ...data, ...(rpcData as any) };
    }
  } catch (err) {
    console.error("Gagal mengambil data dashboard peneliti:", err);
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Dashboard Nasional</h1>
          <div className="page-breadcrumb">
            <span>Peneliti</span>
            <span className="page-breadcrumb-sep">›</span>
            <span>Dashboard</span>
          </div>
        </div>
      </div>

      <PenelitiDashboardClient data={data} />
    </div>
  );
}
