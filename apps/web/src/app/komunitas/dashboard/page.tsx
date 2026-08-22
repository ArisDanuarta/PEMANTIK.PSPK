import React from "react";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createServerClient } from "@pemantik/supabase";
import StudentSessionsTable from "@/components/shared/StudentSessionsTable";
import { checkAndAutoTransitionStages, getActiveStagesForCommunity, type SchoolAssessmentStageRow } from "@/app/actions/stages";
import CommunityInteractiveTimeline, { type SchoolSummaryForTimeline } from "@/components/shared/CommunityInteractiveTimeline";
import DemographicsSection, { type StudentDemographicRow } from "@/components/shared/DemographicsSection";
import PhaseComparisonChart from "@/components/shared/PhaseComparisonChart";
import { StatGrid } from "@/components/ui/responsive/StatGrid";
import GenerateSekolahTrialModal from "@/components/shared/GenerateSekolahTrialModal";
import AchievementChartsSection from "@/components/shared/AchievementChartsSection";

export const metadata = {
  title: "Dashboard Komunitas | Pemantik",
};

export default async function KomunitasDashboardPage() {
  const headersList = await headers();
  const communityId = headersList.get("x-community-id");

  if (!communityId) {
    redirect("/login");
  }

  const supabase = createServerClient();

  let totalSchools = 0;
  let totalTeachers = 0;
  let totalStudents = 0;
  let totalClasses = 0;
  let totalSessions = 0;
  let avgLiterasi = 0;
  let avgNumerasi = 0;
  let sessionsDataForChart: any[] = [];
  let recentSessions: any[] = [];
  let stagesData: SchoolAssessmentStageRow[] = [];
  let studentsDemographic: StudentDemographicRow[] = [];
  let schoolsSummary: SchoolSummaryForTimeline[] = [];
  let isSandbox = false;
  let categories: any[] = [];
  let ageDistData: { age: number | string; count: number }[] = [];
  let litLevelDist: { level: number; count: number }[] = [];
  let numLevelDist: { level: number; count: number }[] = [];
  let litByAge: { age: number | string; avgLevel: number; count: number }[] = [];
  let numByAge: { age: number | string; avgLevel: number; count: number }[] = [];
  let litBySes: { ses: string; avgLevel: number; count: number }[] = [];
  let numBySes: { ses: string; avgLevel: number; count: number }[] = [];

  if (communityId) {
    const { data: commData } = await supabase.from("communities").select("is_sandbox").eq("id", communityId).maybeSingle();
    isSandbox = commData?.is_sandbox || false;
    
    if (isSandbox) {
      const { data: catData } = await supabase.from("question_categories").select("id, name, subject_area");
      categories = catData || [];
    }

    // 0. Cek & auto-transition tahap proses_asesmen yang masa berlakunya sudah habis
    await checkAndAutoTransitionStages(communityId);
    
    // 0b. Ambil data 5-tahap timeline untuk sekolah-sekolah di bawah komunitas ini
    const stagesRes = await getActiveStagesForCommunity(true);
    if (stagesRes.success && stagesRes.data) {
      stagesData = stagesRes.data;
    }

    // 1. Fetch schools for this community
    const { data: schools } = await supabase
      .from("schools")
      .select("id, name, npsn")
      .eq("community_id", communityId);
      
    const schoolIds = schools?.map(s => s.id) || [];
    totalSchools = schoolIds.length;
    
    if (schoolIds.length > 0) {
      // 2. Fetch total teachers/school admins & data per school
      const { data: usersData } = await supabase
        .from("users")
        .select("id, school_id, role")
        .in("school_id", schoolIds)
        .in("role", ["teacher", "school"]);
      totalTeachers = usersData?.filter((u: any) => u.role === "teacher").length || 0;

      // 3. Fetch total students (anak terdaftar) & data per school
      const { data: studentsData } = await supabase
        .from("students")
        .select("id, school_id, gender, ses_class, birth_date")
        .in("school_id", schoolIds);
      totalStudents = studentsData?.length || 0;
      if (studentsData) {
        studentsDemographic = studentsData;
      }

      // 3b. Fetch total classes & data per school
      const { data: classesData } = await supabase
        .from("classes")
        .select("id, school_id")
        .in("school_id", schoolIds);
      totalClasses = classesData?.length || 0;

      // 3c. Fetch interventions status per school
      const { data: interRows } = await (supabase as any)
        .from("interventions")
        .select("school_id, phase")
        .eq("community_id", communityId);

      // Build schoolsSummary
      if (schools) {
        schoolsSummary = schools.map((sc) => {
          const stCount = studentsData?.filter((s) => s.school_id === sc.id).length || 0;
          const tcCount = usersData?.filter((u) => u.school_id === sc.id && u.role === "teacher").length || 0;
          const admCount = usersData?.filter((u) => u.school_id === sc.id && u.role === "school").length || 0;
          const clCount = classesData?.filter((c) => c.school_id === sc.id).length || 0;

          // Cari stageRow untuk sekolah ini
          const stageRow = stagesData.find((s) => s.school_id === sc.id);
          const currentStage = stageRow?.current_stage || "persiapan_akun";
          const phase = stageRow?.phase || "Fase 1";
          const stageId = stageRow?.id;

          const hasFilledIntervention = Boolean(
            interRows && (interRows as any[]).some((i) => i.school_id === sc.id && i.phase === phase)
          );

          return {
            school_id: sc.id,
            name: sc.name,
            npsn: sc.npsn,
            studentsCount: stCount,
            teachersCount: tcCount,
            adminsCount: admCount,
            classesCount: clCount,
            phase,
            current_stage: currentStage,
            stageId,
            hasFilledIntervention,
          };
        });
      }

      // 4. Fetch lightweight sessions data for stats & comparison chart
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
        .in("school_id", schoolIds)
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
          level_number: qlMap.get(s.current_level_id) || 0
        }));
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

        // --- Calculate New Analytics Data ---
        const studentMaxLit = new Map<string, number>();
        const studentMaxNum = new Map<string, number>();
        
        sessionsDataForChart.forEach((s: any) => {
          const subject = s.question_categories?.subject_area;
          const level = s.level_number;
          if (level >= 0) {
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
        console.log("DEBUG DASHBOARD -> studentMaxNum size:", studentMaxNum.size, "numLevelDist:", numLevelDist);

        const currentYear = new Date().getFullYear();
        const studentAges = new Map<string, number>();
        const studentSes = new Map<string, string>();
        const ageDistMap = new Map<number, number>();

        studentsData?.forEach(st => {
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
        // --- End New Analytics Data ---
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
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Dashboard Utama Komunitas</h1>
          <div className="page-breadcrumb">
            <span>Komunitas</span>
            <span className="page-breadcrumb-sep">›</span>
            <span>Progress &amp; Statistik</span>
          </div>
        </div>
        {isSandbox && (
          <div className="page-header-right" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ backgroundColor: "#ffedd5", color: "#c2410c", padding: "0.25rem 0.5rem", borderRadius: "0.25rem", fontSize: "0.75rem", fontWeight: "bold" }}>
              MODE SANDBOX AKTIF
            </div>
            <GenerateSekolahTrialModal communityId={communityId} categories={categories} />
          </div>
        )}
      </div>
      
      {/* SECTION 1: TIMELINE & TRACK PROGRESS ASESMEN (PALING ATAS) */}
      <div style={{ marginBottom: "2rem" }}>
        <CommunityInteractiveTimeline
          stages={stagesData}
          totalSchools={totalSchools}
          schoolsSummary={schoolsSummary}
        />
      </div>

      {/* SECTION 2: 4 STATISTIK CARDS (PSPK ACCENTS: Navy, Gold, Jingga, Teal) */}
      <StatGrid columns={{ base: 1, md: 2, lg: 4 }} className="gap-5 mb-8">
        {/* Sekolah Binaan (#102e50 Navy) */}
        <div className="stat-card" style={{ borderTop: "4px solid #102e50" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div className="stat-card-label" style={{ fontWeight: 600, color: "#64748b" }}>Sekolah Binaan</div>
              <div className="stat-card-value" style={{ color: "#102e50" }}>{totalSchools}</div>
            </div>
            <div style={{ padding: "0.6rem", backgroundColor: "#e0f2fe", borderRadius: "0.75rem", color: "#102e50" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
            </div>
          </div>
          <div style={{ marginTop: "0.75rem", fontSize: "0.78rem", color: "#64748b" }}>
            Total sekolah aktif yang dibina oleh komunitas Anda
          </div>
        </div>

        {/* Guru Terdaftar (#f2af3e Gold) */}
        <div className="stat-card" style={{ borderTop: "4px solid #f2af3e" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div className="stat-card-label" style={{ fontWeight: 600, color: "#64748b" }}>Guru Terdaftar</div>
              <div className="stat-card-value" style={{ color: "#b45309" }}>{totalTeachers}</div>
            </div>
            <div style={{ padding: "0.6rem", backgroundColor: "#fef3c7", borderRadius: "0.75rem", color: "#d97706" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>
            </div>
          </div>
          <div style={{ marginTop: "0.75rem", fontSize: "0.78rem", color: "#64748b" }}>
            Tenaga pendidik terverifikasi di sekolah binaan
          </div>
        </div>

        {/* Anak Terdaftar (#df632f Jingga - mengganti kata Anak menjadi Anak) */}
        <div className="stat-card" style={{ borderTop: "4px solid #df632f" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div className="stat-card-label" style={{ fontWeight: 600, color: "#64748b" }}>Anak Terdaftar</div>
              <div className="stat-card-value" style={{ color: "#df632f" }}>{totalStudents}</div>
            </div>
            <div style={{ padding: "0.6rem", backgroundColor: "#ffedd5", borderRadius: "0.75rem", color: "#df632f" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            </div>
          </div>
          <div style={{ marginTop: "0.75rem", fontSize: "0.78rem", color: "#64748b" }}>
            Total anak yang terdaftar untuk mengikuti asesmen
          </div>
        </div>

        {/* Total Kelas Terdaftar (#0874aa Teal) */}
        <div className="stat-card" style={{ borderTop: "4px solid #0874aa" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div className="stat-card-label" style={{ fontWeight: 600, color: "#64748b" }}>Total Kelas Terdaftar</div>
              <div className="stat-card-value" style={{ color: "#0874aa" }}>{totalClasses}</div>
            </div>
            <div style={{ padding: "0.6rem", backgroundColor: "#e0f2fe", borderRadius: "0.75rem", color: "#0874aa" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
            </div>
          </div>
          <div style={{ marginTop: "0.75rem", fontSize: "0.78rem", color: "#64748b" }}>
            Jumlah rombongan belajar/kelas di seluruh sekolah
          </div>
        </div>
      </StatGrid>

      {/* SECTION 3: DEMOGRAFI ANAK & LATAR BELAKANG */}
      <div style={{ marginBottom: "2rem" }}>
        <DemographicsSection
          students={studentsDemographic}
          title="Demografi Anak &amp; Latar Belakang SES"
          description="Distribusi jenis kelamin dan status sosial ekonomi (SES) seluruh anak yang terdaftar di bawah komunitas Anda."
        />
      </div>

      {/* SECTION 3B: ANALITIK CAPAIAN LEVEL & USIA */}
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

      {/* SECTION 4: CHART BAR PERBANDINGAN NILAI & PARTISIPASI ANAK ANTAR FASE */}
      <div style={{ marginBottom: "2rem" }}>
        <PhaseComparisonChart sessions={sessionsDataForChart} />
      </div>

      {/* SECTION 5: CAPAIAN RATA-RATA (LITERASI VS NUMERASI) & SESI TERBARU */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.5rem", marginBottom: "2rem" }}>
        {/* Rata Rata Capaian Card */}
        <div style={{ backgroundColor: "white", padding: "1.75rem", borderRadius: "1.25rem", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)", border: "1px solid #e2e8f0", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <h3 style={{ fontFamily: "Lora, serif", margin: "0 0 0.35rem 0", fontSize: "1.2rem", color: "#102e50", fontWeight: 700 }}>
              Capaian Rata-Rata Asesmen
            </h3>
            <p style={{ margin: "0 0 1.5rem 0", fontSize: "0.85rem", color: "#64748b" }}>
              Skor rata-rata dari seluruh sesi ujian Literasi dan Numerasi yang telah diselesaikan anak.
            </p>
            
            <div style={{ marginBottom: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem", alignItems: "center" }}>
                <span style={{ fontSize: "0.92rem", color: "#334155", fontWeight: 700 }}>Literasi</span>
                <span style={{ fontSize: "1.15rem", color: "#2d9e5f", fontWeight: 800 }}>{avgLiterasi}%</span>
              </div>
              <div style={{ width: "100%", backgroundColor: "#f1f5f9", height: "10px", borderRadius: "999px", overflow: "hidden" }}>
                <div style={{ height: "100%", backgroundColor: "#2d9e5f", width: `${Math.min(100, avgLiterasi)}%`, borderRadius: "999px", transition: "width 0.5s ease" }} />
              </div>
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem", alignItems: "center" }}>
                <span style={{ fontSize: "0.92rem", color: "#334155", fontWeight: 700 }}>Numerasi</span>
                <span style={{ fontSize: "1.15rem", color: "#0874aa", fontWeight: 800 }}>{avgNumerasi}%</span>
              </div>
              <div style={{ width: "100%", backgroundColor: "#f1f5f9", height: "10px", borderRadius: "999px", overflow: "hidden" }}>
                <div style={{ height: "100%", backgroundColor: "#0874aa", width: `${Math.min(100, avgNumerasi)}%`, borderRadius: "999px", transition: "width 0.5s ease" }} />
              </div>
            </div>
          </div>
          
          <div style={{ marginTop: "2rem", padding: "1rem", backgroundColor: "#f8fafc", borderRadius: "0.75rem", border: "1px solid #e2e8f0", fontSize: "0.8rem", color: "#64748b", textAlign: "center" }}>
            💡 Total <strong>{totalSessions} sesi asesmen</strong> telah tuntas dikerjakan oleh anak-anak di sekolah binaan.
          </div>
        </div>

        {/* 10 Sesi Asesmen Terbaru */}
        <div style={{ backgroundColor: "white", padding: "1.75rem", borderRadius: "1.25rem", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)", border: "1px solid #e2e8f0", overflow: "hidden" }}>
          <h3 style={{ fontFamily: "Lora, serif", margin: "0 0 0.35rem 0", fontSize: "1.2rem", color: "#102e50", fontWeight: 700 }}>
            10 Sesi Asesmen Terbaru
          </h3>
          <p style={{ margin: "0 0 1.25rem 0", fontSize: "0.85rem", color: "#64748b" }}>
            Aktivitas pengerjaan asesmen anak terbaru secara real-time.
          </p>
          <StudentSessionsTable 
            sessions={recentSessions} 
             
          />
        </div>
      </div>
    </div>
  );
}
