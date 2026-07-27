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
