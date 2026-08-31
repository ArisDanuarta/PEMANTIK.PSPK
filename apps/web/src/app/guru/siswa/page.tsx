import type { Metadata } from "next";
import { createServerClient } from "@pemantik/supabase";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import StudentsManagerGuru from "./StudentsManagerGuru";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Manajemen Anak | Guru",
  description: "Kelola data anak di kelas yang Anda ajar",
};

export default async function GuruSiswaPage() {
  const supabase = createServerClient();
  const headersList = await headers();
  const teacherId = headersList.get("x-user-id");
  const schoolId = headersList.get("x-school-id");

  if (!teacherId || !schoolId) redirect("/login");

  let students: any[] = [];
  let classes: any[] = [];
  let activePhase = "Belum Ada Fase";

  try {
    // 1. Get classes taught by this teacher
    const { data: classTeacherRows } = await supabase
      .from("class_teachers" as any)
      .select("class_id")
      .eq("teacher_id", teacherId);

    const classIds = classTeacherRows?.map((r: any) => r.class_id) || [];

    let classData: any[] = [];
    if (classIds.length > 0) {
      const { data } = await supabase
        .from("classes")
        .select("id, name, grade")
        .in("id", classIds)
        .eq("school_id", schoolId)
        .eq("is_active", true)
        .order("grade")
        .order("name");
      classData = data || [];
    }

    classes = classData;

    if (classIds.length > 0) {
      // 2. Fetch the active phase for the school
      const { data: activeStage } = await supabase
        .from("school_assessment_stages")
        .select("phase")
        .eq("school_id", schoolId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (activeStage && activeStage.phase) {
        activePhase = activeStage.phase;
      }

      // 3. Get students in these classes along with their assessment sessions for the active phase
      const { data: studentData } = await supabase
        .from("students")
        .select(`
          id, full_name, nisn, gender, birth_date, username, is_active, ses_class,
          father_education_id, mother_education_id, father_occupation_id, mother_occupation_id,
          village, district, city, province,
          classes!students_class_id_fkey(id, name, grade),
          assessment_sessions(
            id, status, score, phase,
            question_categories(name, subject_area),
            current_level:question_levels!assessment_sessions_current_level_id_fkey(level_number)
          )
        `)
        .eq("school_id", schoolId)
        .in("class_id", classIds)
        .order("full_name");

      // Filter assessment sessions inside JavaScript because Supabase inner join filtering can be tricky
      if (studentData) {
        students = studentData.map((student: any) => ({
          ...student,
          active_sessions: student.assessment_sessions?.filter((s: any) => s.phase === activePhase) || []
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
          <h1 className="page-title">Manajemen Anak</h1>
          <div className="page-breadcrumb">
            <span>Guru</span>
            <span className="page-breadcrumb-sep">›</span>
            <span>Data Anak</span>
          </div>
        </div>
      </div>
      <StudentsManagerGuru
        initialStudents={students}
        classes={classes}
        schoolId={schoolId}
        activePhase={activePhase}
      />
    </div>
  );
}
