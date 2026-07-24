import type { Metadata } from "next";
import { createServerClient } from "@pemantik/supabase";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import ProgressTrackingChart from "@/components/shared/ProgressTrackingChart";
import StudentSessionsTable from "@/components/shared/StudentSessionsTable";
import StageTimeline from "@/components/shared/StageTimeline";
import SchoolInteractiveTimeline from "@/components/shared/SchoolInteractiveTimeline";
import DemographicsSection from "@/components/shared/DemographicsSection";
import PhaseComparisonChart from "@/components/shared/PhaseComparisonChart";
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
  let npsn: string | null = null;
  let communityId: string | null = null;
  let communityName: string | null = null;
  let studentsDemographic: any[] = [];

  try {
    // 0. Nama sekolah, npsn, info komunitas, & stages data
    const { data: school } = await (supabase as any)
      .from("schools")
      .select("name, npsn, community_id, communities(name)")
      .eq("id", schoolId)
      .maybeSingle();
    schoolName = school?.name ?? "Sekolah";
    npsn = school?.npsn ?? null;
    communityId = school?.community_id ?? null;
    if (school?.communities && Array.isArray(school.communities)) {
      communityName = (school.communities[0] as any)?.name ?? null;
    } else if (school?.communities) {
      communityName = (school.communities as any)?.name ?? null;
    }

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

    // 2. Total Anak + data demografi
    const { data: studentsData } = await supabase
      .from("students")
      .select("id, school_id, gender, ses_class")
      .eq("school_id", schoolId);
    studentsDemographic = studentsData ?? [];
    totalStudents = studentsDemographic.length;

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
        id,
        phase,
        score,
        student_id,
        current_level_id,
        question_categories!inner(subject_area)
      `)
      .eq("school_id", schoolId)
      .eq("status", "completed")
      .eq("is_void", false);

    if (statsData && statsData.length > 0) {
      const allLvlIds = [...new Set(statsData.map((s: any) => s.current_level_id).filter(Boolean))];
      let qlMap = new Map<string, number>();
      if (allLvlIds.length > 0) {
        const { data: lvlData } = await supabase.from("question_levels").select("id, level_number").in("id", allLvlIds);
        qlMap = new Map((lvlData || []).map((l: any) => [l.id, l.level_number]));
      }

      sessionsDataForChart = statsData.map((s: any) => ({
        ...s,
        level_number: qlMap.get(s.current_level_id) || 0
      }));
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
      label: "Anak",
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

      {/* ── Alur Asesmen & Intervensi Sekolah (5 Tahap) + Summary Card Guru/Anak/Kelas ── */}
      <div style={{ marginBottom: "2rem" }}>
        <SchoolInteractiveTimeline
          stages={stagesData}
          schoolId={schoolId}
          schoolName={schoolName}
          npsn={npsn}
          communityId={communityId}
          communityName={communityName}
          totalTeachers={totalTeachers}
          totalStudents={totalStudents}
          totalClasses={totalClasses}
        />
      </div>

      {/* ── Demografi Anak & Sebaran SES ── */}
      <DemographicsSection
        students={studentsDemographic}
      />

      {/* ── Perbandingan Nilai Antar Fase & Sebaran Asesmen ── */}
      <PhaseComparisonChart sessions={sessionsDataForChart} />

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
        <StudentSessionsTable sessions={recentSessions}  />
      </div>
    </div>
  );
}
