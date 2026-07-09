import type { Metadata } from "next";
import { createServerClient } from "@pemantik/supabase";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import ProgressTrackingChart from "@/components/shared/ProgressTrackingChart";
import StudentSessionsTable from "@/components/shared/StudentSessionsTable";
import StageTimeline from "@/components/shared/StageTimeline";
import { getStagesForSchool, type SchoolAssessmentStageRow } from "@/app/actions/stages";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dashboard Sekolah | Pemantik",
  description: "Pusat data dan statistik sekolah",
};

export default async function SekolahDashboard() {
  const supabase = createServerClient();
  const headersList = await headers();
  const schoolId = headersList.get("x-school-id");

  if (!schoolId) redirect("/login");

  let totalTeachers = 0;
  let totalStudents = 0;
  let totalClasses = 0;
  let totalSessions = 0;
  let avgLiterasi = 0;
  let avgNumerasi = 0;
  let sessionsDataForChart: any[] = [];
  let recentSessions: any[] = [];
  let stagesData: SchoolAssessmentStageRow[] = [];
  let schoolName = "Sekolah";

  try {
    // 0. Nama sekolah & stages data
    const { data: school } = await supabase
      .from("schools")
      .select("name")
      .eq("id", schoolId)
      .maybeSingle();
    schoolName = school?.name ?? "Sekolah";

    const stagesRes = await getStagesForSchool(schoolId);
    if (stagesRes.success && stagesRes.data) {
      stagesData = stagesRes.data;
    }

    // 1. Total Guru
    const { count: teachersCount } = await supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("school_id", schoolId)
      .eq("role", "teacher");
    totalTeachers = teachersCount ?? 0;

    // 2. Total Siswa
    const { count: studentsCount } = await supabase
      .from("students")
      .select("id", { count: "exact", head: true })
      .eq("school_id", schoolId);
    totalStudents = studentsCount ?? 0;

    // 3. Total Kelas
    const { count: classesCount } = await supabase
      .from("classes")
      .select("id", { count: "exact", head: true })
      .eq("school_id", schoolId)
      .eq("is_active", true);
    totalClasses = classesCount ?? 0;

    // 4. Statistik sesi selesai + data chart
    const { data: statsData } = await supabase
      .from("assessment_sessions")
      .select(`
        phase,
        score,
        question_categories!inner(subject_area)
      `)
      .eq("school_id", schoolId)
      .eq("status", "completed")
      .eq("is_void", false);

    if (statsData && statsData.length > 0) {
      sessionsDataForChart = statsData;
      totalSessions = statsData.length;

      let sumLit = 0, countLit = 0;
      let sumNum = 0, countNum = 0;

      statsData.forEach((s: any) => {
        if (s.score !== null && s.score !== undefined) {
          const subject = s.question_categories?.subject_area;
          if (subject === "literasi") { sumLit += s.score; countLit++; }
          else if (subject === "numerasi") { sumNum += s.score; countNum++; }
        }
      });

      avgLiterasi = countLit > 0 ? Math.round((sumLit / countLit) * 10) / 10 : 0;
      avgNumerasi = countNum > 0 ? Math.round((sumNum / countNum) * 10) / 10 : 0;
    }

    // 5. 10 sesi ujian terbaru
    const { data: recent } = await supabase
      .from("assessment_sessions")
      .select(`
        id, status, phase, attempt_number, is_void, score, started_at, completed_at,
        students(full_name, nisn),
        question_categories(name, subject_area)
      `)
      .eq("school_id", schoolId)
      .eq("is_void", false)
      .order("completed_at", { ascending: false, nullsFirst: false })
      .limit(10);
    recentSessions = recent ?? [];

  } catch (err) {
    console.error("Failed to load sekolah dashboard:", err);
  }

  const statCards = [
    {
      label: "Guru",
      value: totalTeachers,
      accent: "kuning",
      color: "#f2af3e",
      bg: "rgba(242,175,62,0.1)",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/>
          <line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/>
        </svg>
      ),
    },
    {
      label: "Siswa",
      value: totalStudents,
      accent: "oranye",
      color: "#df632f",
      bg: "rgba(223,99,47,0.08)",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      ),
    },
    {
      label: "Kelas Aktif",
      value: totalClasses,
      accent: "biru-muda",
      color: "#0874aa",
      bg: "rgba(8,116,170,0.08)",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      ),
    },
    {
      label: "Ujian Selesai",
      value: totalSessions,
      accent: "hijau",
      color: "#2d9e5f",
      bg: "rgba(45,158,95,0.08)",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
          <polyline points="10 9 9 9 8 9"/>
        </svg>
      ),
    },
  ];

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Dashboard</h1>
          <div className="page-breadcrumb">
            <span>{schoolName}</span>
            <span className="page-breadcrumb-sep">›</span>
            <span>Dashboard Utama</span>
          </div>
        </div>
      </div>

      {/* ── 4 Stat Cards ── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "1.25rem",
        marginBottom: "1.5rem",
      }}>
        {statCards.map((card) => (
          <div key={card.label} className="stat-card">
            <div className={`stat-card-accent ${card.accent}`} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div className="stat-card-label">{card.label}</div>
                <div className="stat-card-value" style={{ color: card.color }}>{card.value}</div>
              </div>
              <div style={{ padding: "0.5rem", backgroundColor: card.bg, borderRadius: "0.5rem", color: card.color }}>
                {card.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Rata-Rata Nilai + Chart ── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "300px 1fr",
        gap: "1.5rem",
        marginBottom: "1.5rem",
      }}>
        {/* Rata-Rata Nilai */}
        <div style={{ backgroundColor: "white", padding: "1.5rem", borderRadius: "1rem", boxShadow: "0 2px 4px rgba(0,0,0,0.05)", border: "1px solid #f1f3f5" }}>
          <h3 style={{ margin: "0 0 1.5rem 0", fontSize: "1rem", fontFamily: "var(--font-heading)", color: "#102e50" }}>
            Rata-Rata Nilai
          </h3>

          <div style={{ marginBottom: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
              <span style={{ fontSize: "0.875rem", color: "#4b5563", fontWeight: 500 }}>Literasi</span>
              <span style={{ fontSize: "1rem", color: "#2d9e5f", fontWeight: 700 }}>{avgLiterasi}</span>
            </div>
            <div style={{ width: "100%", backgroundColor: "#f3f4f6", height: "8px", borderRadius: "4px", overflow: "hidden" }}>
              <div style={{ height: "100%", backgroundColor: "#2d9e5f", width: `${Math.min(100, avgLiterasi)}%`, borderRadius: "4px", transition: "width 0.5s ease" }} />
            </div>
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
              <span style={{ fontSize: "0.875rem", color: "#4b5563", fontWeight: 500 }}>Numerasi</span>
              <span style={{ fontSize: "1rem", color: "#0874aa", fontWeight: 700 }}>{avgNumerasi}</span>
            </div>
            <div style={{ width: "100%", backgroundColor: "#f3f4f6", height: "8px", borderRadius: "4px", overflow: "hidden" }}>
              <div style={{ height: "100%", backgroundColor: "#0874aa", width: `${Math.min(100, avgNumerasi)}%`, borderRadius: "4px", transition: "width 0.5s ease" }} />
            </div>
          </div>

          <div style={{ marginTop: "2rem", padding: "0.875rem 1rem", backgroundColor: "#f8f9fa", borderRadius: "0.5rem", fontSize: "0.78rem", color: "#6c757d", textAlign: "center", lineHeight: 1.5 }}>
            Data dihitung dari seluruh ujian yang telah diselesaikan siswa di sekolah ini.
          </div>
        </div>

        {/* Progress Chart */}
        <div style={{ backgroundColor: "white", padding: "1.5rem", borderRadius: "1rem", boxShadow: "0 2px 4px rgba(0,0,0,0.05)", border: "1px solid #f1f3f5" }}>
          <ProgressTrackingChart sessions={sessionsDataForChart} />
        </div>
      </div>

      {/* Alur Asesmen & Intervensi Sekolah (5 Tahap) */}
      <div style={{ backgroundColor: "white", padding: "1.5rem", borderRadius: "1rem", boxShadow: "0 2px 4px rgba(0,0,0,0.05)", border: "1px solid #f1f3f5", marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "0.5rem" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "1.1rem", color: "#102e50" }}>Alur Asesmen & Intervensi Sekolah Anda (5 Tahap)</h3>
            <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.85rem", color: "#6c757d" }}>Pantau progres tahapan asesmen dan kontribusi intervensi pada sekolah Anda.</p>
          </div>
        </div>
        <StageTimeline stages={stagesData} userRole="school" />
      </div>

      {/* ── 10 Sesi Terbaru ── */}
      <div style={{ backgroundColor: "white", padding: "1.5rem", borderRadius: "1rem", boxShadow: "0 2px 4px rgba(0,0,0,0.05)", border: "1px solid #f1f3f5" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <h3 style={{ margin: 0, fontSize: "1rem", fontFamily: "var(--font-heading)", color: "#102e50" }}>
            10 Sesi Ujian Terbaru
          </h3>
          <a
            href="/sekolah/laporan"
            style={{ fontSize: "0.8rem", color: "#0874aa", textDecoration: "none", fontWeight: 500, display: "flex", alignItems: "center", gap: "0.25rem" }}
          >
            Lihat semua →
          </a>
        </div>
        <StudentSessionsTable sessions={recentSessions} showResetButton={false} />
      </div>
    </div>
  );
}
