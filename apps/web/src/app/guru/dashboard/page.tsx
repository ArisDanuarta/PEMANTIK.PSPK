import type { Metadata } from "next";
import { createServerClient } from "@pemantik/supabase";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import GuruDashboardClient from "./GuruDashboardClient";
import SchoolInteractiveTimeline from "@/components/shared/SchoolInteractiveTimeline";
import { getStagesForSchool, type SchoolAssessmentStageRow } from "@/app/actions/stages";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dashboard Guru | Pemantik",
};

export default async function Dashboard() {
  const supabase = createServerClient();
  const headersList = await headers();
  const teacherId = headersList.get("x-user-id");
  const schoolId = headersList.get("x-school-id");

  if (!teacherId || !schoolId) redirect("/login");

  const stats = {
    totalClasses: 0,
    totalStudents: 0,
    totalTeachers: 0,
    completedSessions: 0,
    avgScore: 0,
    avgLit: 0,
    avgNum: 0,
    demographics: {
      gender: { L: 0, P: 0 },
      ses: { I: 0, II: 0, III: 0, IV: 0, Uncategorized: 0 },
      age: { under7: 0, age7to9: 0, age10to12: 0, over12: 0, unknown: 0 },
    }
  };
  let recentSessions: any[] = [];
  let stagesData: SchoolAssessmentStageRow[] = [];
  let schoolName = "Sekolah";
  let npsn: string | null = null;
  let communityId: string | null = null;
  let communityName: string | null = null;

  try {
    // 1. Get classes taught by this teacher via class_teachers junction table
    const { data: classTeacherRows } = await supabase
      .from("class_teachers" as any)
      .select("class_id")
      .eq("teacher_id", teacherId);

    const classIds = classTeacherRows?.map((r: any) => r.class_id) || [];
    stats.totalClasses = classIds.length;
    
    // Fetch Stages
    const stagesRes = await getStagesForSchool(schoolId);
    if (stagesRes.success && stagesRes.data) {
      stagesData = stagesRes.data;
    }

    // Fetch school info for timeline
    const { data: schoolInfo } = await supabase
      .from("schools")
      .select("name, npsn, community_id, communities(name)")
      .eq("id", schoolId)
      .maybeSingle();

    if (schoolInfo) {
      schoolName = schoolInfo.name;
      npsn = schoolInfo.npsn;
      communityId = schoolInfo.community_id;
      if (schoolInfo.communities) {
        communityName = Array.isArray(schoolInfo.communities) 
          ? (schoolInfo.communities[0] as any)?.name 
          : (schoolInfo.communities as any)?.name;
      }
    }

    const { count: teacherCount } = await supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("school_id", schoolId)
      .eq("role", "teacher");
    stats.totalTeachers = teacherCount || 0;

    if (classIds.length > 0) {
      // 2. Get students in these classes
      const { data: students } = await supabase
        .from("students")
        .select("id, gender, birth_date, ses_class")
        .in("class_id", classIds)
        .eq("is_active", true);

      const studentIds = students?.map((s) => s.id) || [];
      stats.totalStudents = studentIds.length;

      if (students) {
        const currentYear = new Date().getFullYear();
        students.forEach((s) => {
          // Gender
          if (s.gender === "L") stats.demographics.gender.L++;
          else if (s.gender === "P") stats.demographics.gender.P++;

          // SES
          if (s.ses_class === "bawah") stats.demographics.ses.I++;
          else if (s.ses_class === "menengah_bawah") stats.demographics.ses.II++;
          else if (s.ses_class === "menengah_atas") stats.demographics.ses.III++;
          else if (s.ses_class === "atas") stats.demographics.ses.IV++;
          else stats.demographics.ses.Uncategorized++;

          // Age
          if (s.birth_date) {
            const birthYear = new Date(s.birth_date).getFullYear();
            const age = currentYear - birthYear;
            if (age < 7) stats.demographics.age.under7++;
            else if (age >= 7 && age <= 9) stats.demographics.age.age7to9++;
            else if (age >= 10 && age <= 12) stats.demographics.age.age10to12++;
            else stats.demographics.age.over12++;
          } else {
            stats.demographics.age.unknown++;
          }
        });
      }

      if (studentIds.length > 0) {
        // 3. Get session stats (split by subject) using view to avoid slow IN queries
        const { data: sessions } = await supabase
          .from("v_assessment_report")
          .select("final_score, subject_area")
          .in("student_id", studentIds)
          .eq("session_status", "completed");

        if (sessions && sessions.length > 0) {
          stats.completedSessions = sessions.length;
          let sumAll = 0, sumLit = 0, countLit = 0, sumNum = 0, countNum = 0;
          sessions.forEach((s: any) => {
            const score = Number(s.final_score) || 0;
            sumAll += score;
            const subject = s.subject_area;
            if (subject === "literasi") { sumLit += score; countLit++; }
            else if (subject === "numerasi") { sumNum += score; countNum++; }
          });
          stats.avgScore = Math.round(sumAll / sessions.length);
          stats.avgLit = countLit > 0 ? Math.round((sumLit / countLit) * 10) / 10 : 0;
          stats.avgNum = countNum > 0 ? Math.round((sumNum / countNum) * 10) / 10 : 0;
        }

        // 4. Get recent sessions using view
        const { data: recent } = await supabase
          .from("v_assessment_report")
          .select("session_id, final_score, completed_at, category_name, student_name, class_name")
          .in("student_id", studentIds)
          .eq("session_status", "completed")
          .order("completed_at", { ascending: false })
          .limit(5);

        recentSessions = (recent || []).map((r: any) => ({
          id: r.session_id,
          student_name: r.student_name || "Unknown",
          class_name: r.class_name || "Unknown",
          package_name: r.category_name || "Unknown",
          score: r.final_score,
          completed_at: r.completed_at,
        }));
      }
    }
  } catch (err) {
    // Error ditangani secara silent
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Dashboard</h1>
          <div className="page-breadcrumb">
            <span>Guru</span>
            <span className="page-breadcrumb-sep">›</span>
            <span>Dashboard</span>
          </div>
        </div>
      </div>
      
      {/* TIMELINE SECTION */}
      {stagesData.length > 0 && (
        <div style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.25rem", color: "#102e50", marginBottom: "1rem", fontWeight: 700 }}>
            Timeline Asesmen (Berlangganan dari Sekolah)
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <SchoolInteractiveTimeline
              stages={stagesData}
              schoolId={schoolId}
              schoolName={schoolName}
              npsn={npsn}
              communityId={communityId}
              communityName={communityName}
              totalTeachers={stats.totalTeachers}
              totalStudents={stats.totalStudents}
              totalClasses={stats.totalClasses}
              isReadOnly={true}
            />
          </div>
        </div>
      )}
      
      <GuruDashboardClient stats={stats} recentSessions={recentSessions} />
    </div>
  );
}
