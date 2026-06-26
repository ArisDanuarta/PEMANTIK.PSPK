import type { Metadata } from "next";
import { createServerClient } from "@pemantik/supabase";
import { redirect } from "next/navigation";
import ProgressTrackingChart from "@/components/shared/ProgressTrackingChart";
import StudentSessionsTable from "@/components/shared/StudentSessionsTable";
import { headers } from "next/headers";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Dashboard Komunitas | Pemantik",
};

export default async function KomunitasDashboard() {
  const supabase = createServerClient();
  const headersList = await headers();
  const communityId = headersList.get("x-community-id");
  
  let totalSchools = 0;
  let totalTeachers = 0;
  let totalStudents = 0;
  let totalSessions = 0;
  
  let avgLiterasi = 0;
  let avgNumerasi = 0;
  
  let sessionsDataForChart: any[] = [];
  let recentSessions: any[] = [];
  
  if (communityId) {
    // 1. Fetch schools for this community
    const { data: schools } = await supabase
      .from("schools")
      .select("id")
      .eq("community_id", communityId);
      
    const schoolIds = schools?.map(s => s.id) || [];
    totalSchools = schoolIds.length;
    
    if (schoolIds.length > 0) {
      // 2. Fetch total teachers/school admins
      const { count: teachersCount } = await supabase
        .from("users")
        .select("id", { count: "exact", head: true })
        .in("school_id", schoolIds)
        .in("role", ["teacher", "school"]);
      totalTeachers = teachersCount || 0;

      // 3. Fetch total students
      const { count: studentsCount } = await supabase
        .from("students")
        .select("id", { count: "exact", head: true })
        .in("school_id", schoolIds);
      totalStudents = studentsCount || 0;

      // 4. Fetch lightweight sessions data for stats & chart
      // We need phase, score, and subject_area to calculate averages and chart
      const { data: statsData } = await supabase
        .from("assessment_sessions")
        .select(`
          phase, 
          score,
          question_categories!inner(subject_area)
        `)
        .in("school_id", schoolIds)
        .eq("status", "completed")
        .eq("is_void", false);
        
      if (statsData && statsData.length > 0) {
        sessionsDataForChart = statsData;
        totalSessions = statsData.length;

        // Calculate averages
        let sumLit = 0, countLit = 0;
        let sumNum = 0, countNum = 0;

        statsData.forEach((s: any) => {
          if (s.score !== null && s.score !== undefined) {
            const subject = s.question_categories?.subject_area;
            if (subject === "literasi") {
              sumLit += s.score;
              countLit++;
            } else if (subject === "numerasi") {
              sumNum += s.score;
              countNum++;
            }
          }
        });

        avgLiterasi = countLit > 0 ? Math.round((sumLit / countLit) * 10) / 10 : 0;
        avgNumerasi = countNum > 0 ? Math.round((sumNum / countNum) * 10) / 10 : 0;
      }

      // 5. Fetch 10 most recent sessions for table
      const { data: recent } = await supabase
        .from("assessment_sessions")
        .select(`
          id, status, phase, attempt_number, is_void, score, started_at, completed_at,
          students(full_name, nisn),
          question_categories(name, subject_area)
        `)
        .in("school_id", schoolIds)
        .eq("is_void", false)
        .order("completed_at", { ascending: false, nullsFirst: false })
        .limit(10);
        
      recentSessions = recent || [];
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Dashboard</h1>
          <div className="page-breadcrumb">
            <span>Komunitas</span>
            <span className="page-breadcrumb-sep">›</span>
            <span>Dashboard Utama</span>
          </div>
        </div>
      </div>
      
      {/* 4-Col Grid for Primary Stats */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "1.25rem",
        marginBottom: "1.5rem"
      }}>
        {/* Sekolah */}
        <div className="stat-card">
          <div className="stat-card-accent biru" />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div className="stat-card-label">Sekolah Binaan</div>
              <div className="stat-card-value">{totalSchools}</div>
            </div>
            <div style={{ padding: "0.5rem", backgroundColor: "rgba(16,46,80,0.07)", borderRadius: "0.5rem", color: "#102e50" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
            </div>
          </div>
        </div>

        {/* Guru */}
        <div className="stat-card">
          <div className="stat-card-accent kuning" />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div className="stat-card-label">Guru Terdaftar</div>
              <div className="stat-card-value" style={{ color: "#f2af3e" }}>{totalTeachers}</div>
            </div>
            <div style={{ padding: "0.5rem", backgroundColor: "rgba(242,175,62,0.1)", borderRadius: "0.5rem", color: "#f2af3e" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>
            </div>
          </div>
        </div>

        {/* Siswa */}
        <div className="stat-card">
          <div className="stat-card-accent oranye" />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div className="stat-card-label">Siswa Terdaftar</div>
              <div className="stat-card-value" style={{ color: "#df632f" }}>{totalStudents}</div>
            </div>
            <div style={{ padding: "0.5rem", backgroundColor: "rgba(223,99,47,0.08)", borderRadius: "0.5rem", color: "#df632f" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            </div>
          </div>
        </div>

        {/* Ujian Selesai */}
        <div className="stat-card">
          <div className="stat-card-accent hijau" />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div className="stat-card-label">Ujian Selesai</div>
              <div className="stat-card-value" style={{ color: "#2d9e5f" }}>{totalSessions}</div>
            </div>
            <div style={{ padding: "0.5rem", backgroundColor: "rgba(45,158,95,0.08)", borderRadius: "0.5rem", color: "#2d9e5f" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            </div>
          </div>
        </div>
      </div>

      {/* Rata-Rata Nilai & Chart */}
      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
        
        {/* Rata Rata Nilai Card */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div style={{ backgroundColor: "white", padding: "1.5rem", borderRadius: "1rem", boxShadow: "0 2px 4px rgba(0,0,0,0.05)", border: "1px solid #f1f3f5", flex: 1 }}>
            <h3 style={{ margin: "0 0 1.5rem 0", fontSize: "1.1rem", color: "#102e50" }}>Rata-Rata Nilai</h3>
            
            <div style={{ marginBottom: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                <span style={{ fontSize: "0.9rem", color: "#4b5563", fontWeight: 500 }}>Literasi</span>
                <span style={{ fontSize: "1.1rem", color: "#2d9e5f", fontWeight: 700 }}>{avgLiterasi}</span>
              </div>
              <div style={{ width: "100%", backgroundColor: "#f3f4f6", height: "8px", borderRadius: "4px", overflow: "hidden" }}>
                <div style={{ height: "100%", backgroundColor: "#2d9e5f", width: `${Math.min(100, avgLiterasi)}%`, borderRadius: "4px" }} />
              </div>
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                <span style={{ fontSize: "0.9rem", color: "#4b5563", fontWeight: 500 }}>Numerasi</span>
                <span style={{ fontSize: "1.1rem", color: "#0874aa", fontWeight: 700 }}>{avgNumerasi}</span>
              </div>
              <div style={{ width: "100%", backgroundColor: "#f3f4f6", height: "8px", borderRadius: "4px", overflow: "hidden" }}>
                <div style={{ height: "100%", backgroundColor: "#0874aa", width: `${Math.min(100, avgNumerasi)}%`, borderRadius: "4px" }} />
              </div>
            </div>
            
            <div style={{ marginTop: "2rem", padding: "1rem", backgroundColor: "#f8f9fa", borderRadius: "0.5rem", fontSize: "0.8rem", color: "#6c757d", textAlign: "center" }}>
              Data dihitung dari seluruh ujian yang telah diselesaikan di bawah naungan komunitas Anda.
            </div>
          </div>
        </div>

        {/* Progress Chart */}
        <div style={{ backgroundColor: "white", padding: "1.5rem", borderRadius: "1rem", boxShadow: "0 2px 4px rgba(0,0,0,0.05)", border: "1px solid #f1f3f5" }}>
          <ProgressTrackingChart sessions={sessionsDataForChart} />
        </div>
      </div>

      {/* Sesi Ujian Selesai Terbaru */}
      <div style={{ backgroundColor: "white", padding: "1.5rem", borderRadius: "1rem", boxShadow: "0 2px 4px rgba(0,0,0,0.05)", border: "1px solid #f1f3f5" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <h3 style={{ margin: 0, fontSize: "1.1rem", color: "#102e50" }}>10 Sesi Ujian Terbaru</h3>
        </div>
        <StudentSessionsTable 
          sessions={recentSessions} 
          showResetButton={false} 
        />
      </div>

    </div>
  );
}
