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
import { getStagesForSchool, checkAndAutoTransitionStages, type SchoolAssessmentStageRow } from "@/app/actions/stages";
import AchievementChartsSection from "@/components/shared/AchievementChartsSection";
import RombelComparisonChart, { type RombelDataItem } from "@/components/shared/RombelComparisonChart";
import SchoolGrowthTrendChart, { type PhaseTrendItem } from "@/components/shared/SchoolGrowthTrendChart";

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
  let ageDistData: { age: number | string; count: number }[] = [];
  let litLevelDist: { level: number; count: number }[] = [];
  let numLevelDist: { level: number; count: number }[] = [];
  let litByAge: { age: number | string; avgLevel: number; count: number }[] = [];
  let numByAge: { age: number | string; avgLevel: number; count: number }[] = [];
  let litBySes: { ses: string; avgLevel: number; count: number }[] = [];
  let numBySes: { ses: string; avgLevel: number; count: number }[] = [];
  let rombelComparisonData: RombelDataItem[] = [];
  let phaseTrendData: PhaseTrendItem[] = [];

  try {
    // 0. Nama sekolah, npsn, info komunitas, & stages data
    const { data: school } = await supabase
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

    // Auto-transition tahap asesmen jika waktunya kadaluarsa
    await checkAndAutoTransitionStages(schoolId, "school");

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
      .select("id, school_id, gender, ses_class, birth_date")
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
      .eq("is_void", false)
      .limit(100000);

    if (statsData && statsData.length > 0) {
      const allLvlIds = [...new Set(statsData.map((s: any) => s.current_level_id).filter(Boolean))];
      let qlMap = new Map<string, number>();
      if (allLvlIds.length > 0) {
        const { data: lvlData } = await supabase.from("question_levels").select("id, level_number").in("id", allLvlIds);
        qlMap = new Map((lvlData || []).map((l: any) => [l.id, l.level_number]));
      }

      sessionsDataForChart = statsData.map((s: any) => ({
        ...s,
        level_number: s.current_level_id ? (qlMap.get(s.current_level_id) ?? 0) : null
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
      
      // --- Calculate New Analytics Data ---
      const studentMaxLit = new Map<string, number>();
      const studentMaxNum = new Map<string, number>();
      
      sessionsDataForChart.forEach((s: any) => {
        const subject = s.question_categories?.subject_area;
        const level = s.level_number;
        if (s.current_level_id && level !== null && level !== undefined) {
          if (subject === "literasi") {
            const currentMax = studentMaxLit.get(s.student_id);
            if (currentMax === undefined || level > currentMax) studentMaxLit.set(s.student_id, level);
          } else if (subject === "numerasi") {
            const currentMax = studentMaxNum.get(s.student_id);
            if (currentMax === undefined || level > currentMax) studentMaxNum.set(s.student_id, level);
          }
        }
      });

      const litDistMap = new Map<number, number>();
      studentMaxLit.forEach(level => litDistMap.set(level, (litDistMap.get(level) || 0) + 1));
      litLevelDist = Array.from(litDistMap.entries()).map(([level, count]) => ({ level, count })).sort((a,b) => a.level - b.level);

      const numDistMap = new Map<number, number>();
      studentMaxNum.forEach(level => numDistMap.set(level, (numDistMap.get(level) || 0) + 1));
      numLevelDist = Array.from(numDistMap.entries()).map(([level, count]) => ({ level, count })).sort((a,b) => a.level - b.level);

      const currentYear = new Date().getFullYear();
      const studentAges = new Map<string, number>();
      const studentSes = new Map<string, string>();
      const ageDistMap = new Map<number, number>();

      studentsDemographic.forEach(st => {
        studentSes.set(st.id, st.ses_class || "unknown");
        if (st.birth_date) {
          const birthYear = new Date(st.birth_date).getFullYear();
          const age = currentYear - birthYear;
          if (age > 0 && age < 50) {
            studentAges.set(st.id, age);
            ageDistMap.set(age, (ageDistMap.get(age) || 0) + 1);
          }
        }
      });
      
      ageDistData = Array.from(ageDistMap.entries()).map(([age, count]) => ({ age, count })).sort((a,b) => (a.age as number) - (b.age as number));

      const litByAgeMap = new Map<number, { sum: number; count: number }>();
      studentMaxLit.forEach((level, studentId) => {
        const age = studentAges.get(studentId);
        if (age !== undefined) {
          const data = litByAgeMap.get(age) || { sum: 0, count: 0 };
          data.sum += level;
          data.count += 1;
          litByAgeMap.set(age, data);
        }
      });
      litByAge = Array.from(litByAgeMap.entries()).map(([age, data]) => ({ age, avgLevel: data.sum / data.count, count: data.count })).sort((a,b) => (a.age as number) - (b.age as number));

      const numByAgeMap = new Map<number, { sum: number; count: number }>();
      studentMaxNum.forEach((level, studentId) => {
        const age = studentAges.get(studentId);
        if (age !== undefined) {
          const data = numByAgeMap.get(age) || { sum: 0, count: 0 };
          data.sum += level;
          data.count += 1;
          numByAgeMap.set(age, data);
        }
      });
      numByAge = Array.from(numByAgeMap.entries()).map(([age, data]) => ({ age, avgLevel: data.sum / data.count, count: data.count })).sort((a,b) => (a.age as number) - (b.age as number));

      const litBySesMap = new Map<string, { sum: number; count: number }>();
      studentMaxLit.forEach((level, studentId) => {
        const ses = studentSes.get(studentId) || "unknown";
        if (ses !== "unknown") {
          const data = litBySesMap.get(ses) || { sum: 0, count: 0 };
          data.sum += level;
          data.count += 1;
          litBySesMap.set(ses, data);
        }
      });
      litBySes = Array.from(litBySesMap.entries()).map(([ses, data]) => ({ ses, avgLevel: data.sum / data.count, count: data.count }));

      const numBySesMap = new Map<string, { sum: number; count: number }>();
      studentMaxNum.forEach((level, studentId) => {
        const ses = studentSes.get(studentId) || "unknown";
        if (ses !== "unknown") {
          const data = numBySesMap.get(ses) || { sum: 0, count: 0 };
          data.sum += level;
          data.count += 1;
          numBySesMap.set(ses, data);
        }
      });
      numBySes = Array.from(numBySesMap.entries()).map(([ses, data]) => ({ ses, avgLevel: data.sum / data.count, count: data.count }));

      // --- Tren Pertumbuhan Global per Fase ---
      const phaseMap = new Map<string, { sumLit: number; countLit: number; sumNum: number; countNum: number; students: Set<string> }>();
      sessionsDataForChart.forEach((s: any) => {
        const phase = s.phase || "Tahap 1";
        if (!phaseMap.has(phase)) {
          phaseMap.set(phase, { sumLit: 0, countLit: 0, sumNum: 0, countNum: 0, students: new Set() });
        }
        const p = phaseMap.get(phase)!;
        if (s.student_id) p.students.add(s.student_id);
        const subjectPhase = s.question_categories?.subject_area;
        const scorePhase = typeof s.score === "number" ? s.score : 0;
        if (subjectPhase === "literasi") { p.sumLit += scorePhase; p.countLit++; }
        else if (subjectPhase === "numerasi") { p.sumNum += scorePhase; p.countNum++; }
      });
      phaseTrendData = Array.from(phaseMap.entries())
        .map(([phase, p]) => ({
          phase,
          avgLit: p.countLit > 0 ? Math.round((p.sumLit / p.countLit) * 10) / 10 : 0,
          avgNum: p.countNum > 0 ? Math.round((p.sumNum / p.countNum) * 10) / 10 : 0,
          participantCount: p.students.size,
        }))
        .sort((a, b) => {
          const extractNum = (s: string) => { const m = s.match(/\d+/); return m ? parseInt(m[0]) : 0; };
          return extractNum(a.phase) - extractNum(b.phase);
        });
      // --- End Tren Pertumbuhan ---

      // --- Komparasi Kinerja Antar Rombel ---
      const { data: classesData } = await supabase
        .from("classes")
        .select("id, name, grade")
        .eq("school_id", schoolId)
        .eq("is_active", true);

      const { data: studentsWithClass } = await supabase
        .from("students")
        .select("id, class_id")
        .eq("school_id", schoolId);

      const studentClassMap = new Map<string, string>();
      (studentsWithClass ?? []).forEach((s: any) => {
        if (s.class_id) studentClassMap.set(s.id, s.class_id);
      });

      const classStatsMap = new Map<string, { sumLit: number; countLit: number; sumNum: number; countNum: number; studentIds: Set<string> }>();
      sessionsDataForChart.forEach((s: any) => {
        const classId = studentClassMap.get(s.student_id);
        if (!classId) return;
        if (!classStatsMap.has(classId)) {
          classStatsMap.set(classId, { sumLit: 0, countLit: 0, sumNum: 0, countNum: 0, studentIds: new Set() });
        }
        const stat = classStatsMap.get(classId)!;
        stat.studentIds.add(s.student_id);
        const subjectRombel = s.question_categories?.subject_area;
        const scoreRombel = typeof s.score === "number" ? s.score : 0;
        if (subjectRombel === "literasi") { stat.sumLit += scoreRombel; stat.countLit++; }
        else if (subjectRombel === "numerasi") { stat.sumNum += scoreRombel; stat.countNum++; }
      });

      rombelComparisonData = (classesData ?? []).map((cls: any) => {
        const stat = classStatsMap.get(cls.id);
        return {
          className: cls.name,
          grade: cls.grade,
          avgLit: stat && stat.countLit > 0 ? Math.round((stat.sumLit / stat.countLit) * 10) / 10 : 0,
          avgNum: stat && stat.countNum > 0 ? Math.round((stat.sumNum / stat.countNum) * 10) / 10 : 0,
          studentCount: stat?.studentIds.size ?? 0,
        };
      })
      .filter((r: RombelDataItem) => r.studentCount > 0)
      .sort((a: RombelDataItem, b: RombelDataItem) => a.grade - b.grade || a.className.localeCompare(b.className));
      // --- End Komparasi Rombel ---

      // --- End New Analytics Data ---
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
      <div style={{ marginBottom: "2rem" }}>
        <DemographicsSection
          students={studentsDemographic}
        />
      </div>

      {/* ── Analitik Capaian Level & Usia ── */}
      <div style={{ marginBottom: "2rem" }}>
        <AchievementChartsSection 
          ageDistData={ageDistData}
          litLevelDist={litLevelDist}
          numLevelDist={numLevelDist}
          litByAge={litByAge}
          numByAge={numByAge}
          litBySes={litBySes}
          numBySes={numBySes}
        />
      </div>

      {/* ── Komparasi Kinerja Antar Rombel ── */}
      <div style={{ marginBottom: "2rem" }}>
        <RombelComparisonChart rombelData={rombelComparisonData} />
      </div>

      {/* ── Tren Pertumbuhan Global Sekolah ── */}
      <div style={{ marginBottom: "2rem" }}>
        <SchoolGrowthTrendChart trendData={phaseTrendData} />
      </div>

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
