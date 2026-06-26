import type { Metadata } from "next";
import { createServerClient } from "@pemantik/supabase";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import GuruDashboardClient from "./GuruDashboardClient";

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

  let stats = {
    totalClasses: 0,
    totalStudents: 0,
    completedSessions: 0,
    avgScore: 0,
    demographics: {
      gender: { L: 0, P: 0 },
      ses: { I: 0, II: 0, III: 0, IV: 0, Uncategorized: 0 },
      age: { under7: 0, age7to9: 0, age10to12: 0, over12: 0, unknown: 0 },
    }
  };
  let recentSessions: any[] = [];

  try {
    // 1. Get classes taught by this teacher
    const { data: classes } = await supabase
      .from("classes")
      .select("id")
      .eq("school_id", schoolId)
      .eq("teacher_id", teacherId)
      .eq("is_active", true);

    const classIds = classes?.map((c) => c.id) || [];
    stats.totalClasses = classIds.length;

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
        // 3. Get session stats
        const { data: sessions } = await supabase
          .from("assessment_sessions")
          .select("score")
          .in("student_id", studentIds)
          .eq("status", "completed")
          .eq("is_void", false);

        if (sessions && sessions.length > 0) {
          stats.completedSessions = sessions.length;
          const totalScore = sessions.reduce((sum, s) => sum + (Number(s.score) || 0), 0);
          stats.avgScore = Math.round(totalScore / sessions.length);
        }

        // 4. Get recent sessions
        const { data: recent } = await supabase
          .from("assessment_sessions")
          .select(`
            id, score, completed_at,
            question_categories(name),
            students!inner(full_name, classes(name))
          `)
          .in("student_id", studentIds)
          .eq("status", "completed")
          .eq("is_void", false)
          .order("completed_at", { ascending: false })
          .limit(5);

        recentSessions = (recent || []).map((r: any) => ({
          id: r.id,
          student_name: r.students?.full_name || "Unknown",
          class_name: r.students?.classes?.name || "Unknown",
          package_name: r.question_categories?.name || "Unknown",
          score: r.score,
          completed_at: r.completed_at,
        }));
      }
    }
  } catch (err) {
    console.error("Error fetching guru dashboard stats:", err);
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
      
      <GuruDashboardClient stats={stats} recentSessions={recentSessions} />
    </div>
  );
}
