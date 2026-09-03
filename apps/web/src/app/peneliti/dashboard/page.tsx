import type { Metadata } from "next";
import { createServerClient } from "@pemantik/supabase";
import { SupabaseClient } from "@supabase/supabase-js";
import React from "react";
import PenelitiDashboardClient from "./PenelitiDashboardClient";

export const metadata: Metadata = {
  title: "Dashboard Peneliti",
  description: "Ringkasan eksekutif data asesmen nasional untuk peneliti",
};

export const dynamic = "force-dynamic";

export interface DashboardStats {
  totalStudents: number;
  avgScoreTotal: number;
  avgScoreLit: number;
  avgScoreNum: number;
  completionRate: number;
  activeSchools: number;
  topCommunities: Array<{ name: string; avgScore: number }>;
  monthlyTrend: Array<{ month: string; avgScore: number }>;
  levelDistribution: Array<{ level: string; count: number }>;
}

export default async function PenelitiDashboardPage() {
  const supabase = createServerClient() as SupabaseClient;

  let data: DashboardStats = {
    totalStudents: 0,
    avgScoreTotal: 0,
    avgScoreLit: 0,
    avgScoreNum: 0,
    completionRate: 0,
    activeSchools: 0,
    topCommunities: [],
    monthlyTrend: [],
    levelDistribution: []
  };

  try {
    const { data: rpcData, error } = await supabase.rpc('get_peneliti_dashboard_stats');
    if (error) throw error;
    if (rpcData && typeof rpcData === 'object') {
      data = { ...data, ...(rpcData as DashboardStats) };
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
