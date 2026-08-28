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
    // 1. Total Siswa & Active Schools (based on non-void sessions)
    const { data: comms } = await (supabase as any)
      .from("communities")
      .select("id")
      .eq("is_sandbox", false);
    const validCommIds = (comms || []).map((c: any) => c.id);

    const { data: realSessions } = await (supabase as any)
      .from("v_assessment_report")
      .select("session_id, student_id, school_id, community_id, community_name, session_status, final_score, final_level_number, completed_at, category_id")
      .not("session_id", "is", null)
      .in("community_id", validCommIds);

    const sessions = realSessions || [];
    
    const uniqueStudentIds = new Set(sessions.map((s: any) => s.student_id).filter(Boolean));
    const uniqueSchoolIds = new Set(sessions.map((s: any) => s.school_id).filter(Boolean));
    
    data.totalStudents = uniqueStudentIds.size;
    data.activeSchools = uniqueSchoolIds.size;

    const completedSessions = sessions.filter((s: any) => s.session_status === 'completed');
    data.completionRate = sessions.length > 0 ? (completedSessions.length / sessions.length) * 100 : 0;

    let totalScore = 0;
    completedSessions.forEach((s: any) => { totalScore += (s.final_score || 0); });
    data.avgScoreTotal = completedSessions.length > 0 ? totalScore / completedSessions.length : 0;

    // Monthly Trend
    const trendMap = new Map();
    completedSessions.forEach((s: any) => {
      if (!s.completed_at) return;
      const d = new Date(s.completed_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!trendMap.has(key)) trendMap.set(key, { month: key, totalScore: 0, count: 0 });
      const t = trendMap.get(key);
      t.totalScore += (s.final_score || 0);
      t.count += 1;
    });

    data.monthlyTrend = Array.from(trendMap.values())
      .sort((a, b) => a.month.localeCompare(b.month))
      .map(t => ({ month: t.month, avgScore: t.totalScore / t.count }));

    // Level Distribution
    const levelMap = new Map();
    completedSessions.forEach((s: any) => {
      const lvl = s.final_level_number || 0;
      levelMap.set(lvl, (levelMap.get(lvl) || 0) + 1);
    });
    data.levelDistribution = Array.from(levelMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([level, count]) => ({ level: `Level ${level}`, count }));

    // Top Communities
    const commMap = new Map();
    completedSessions.forEach((s: any) => {
      if (!s.community_id) return;
      if (!commMap.has(s.community_id)) {
        commMap.set(s.community_id, { id: s.community_id, name: s.community_name || 'Unknown', totalScore: 0, count: 0 });
      }
      const c = commMap.get(s.community_id);
      c.totalScore += (s.final_score || 0);
      c.count += 1;
    });

    data.topCommunities = Array.from(commMap.values())
      .map(c => ({ name: c.name, avgScore: c.totalScore / c.count }))
      .sort((a, b) => b.avgScore - a.avgScore)
      .slice(0, 5);

  } catch (err) {
    console.error(err);
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
