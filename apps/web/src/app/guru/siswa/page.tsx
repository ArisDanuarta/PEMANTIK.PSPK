import type { Metadata } from "next";
import { createServerClient } from "@pemantik/supabase";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import StudentsManagerGuru from "./StudentsManagerGuru";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Manajemen Siswa | Guru",
  description: "Kelola data siswa di kelas yang Anda ajar",
};

export default async function GuruSiswaPage() {
  const supabase = createServerClient();
  const headersList = await headers();
  const teacherId = headersList.get("x-user-id");
  const schoolId = headersList.get("x-school-id");

  if (!teacherId || !schoolId) redirect("/login");

  let students: any[] = [];
  let classes: any[] = [];
  let sesVariables: any[] = [];

  try {
    // 1. Get classes taught by this teacher
    const { data: classData } = await supabase
      .from("classes")
      .select("id, name, grade")
      .eq("school_id", schoolId)
      .eq("teacher_id", teacherId)
      .eq("is_active", true)
      .order("grade")
      .order("name");

    classes = classData ?? [];
    const classIds = classes.map((c: any) => c.id);

    if (classIds.length > 0) {
      // 2. Get students in these classes
      const { data: studentData } = await supabase
        .from("students")
        .select(`
          id, full_name, nisn, gender, birth_date, username, is_active, ses_class,
          father_education_id, mother_education_id, father_occupation_id, mother_occupation_id,
          village, district, city, province,
          classes!students_class_id_fkey(id, name, grade)
        `)
        .eq("school_id", schoolId)
        .in("class_id", classIds)
        .order("full_name");

      students = studentData ?? [];
    }
    
    const { data: sesData } = await (supabase as any).from("ses_variables").select("*").order("name");
    sesVariables = sesData ?? [];
  } catch (err) {
    console.error("Failed to load siswa guru:", err);
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Manajemen Siswa</h1>
          <div className="page-breadcrumb">
            <span>Guru</span>
            <span className="page-breadcrumb-sep">›</span>
            <span>Data Siswa</span>
          </div>
        </div>
      </div>
      <StudentsManagerGuru
        initialStudents={students}
        classes={classes}
        schoolId={schoolId}
        sesVariables={sesVariables}
      />
    </div>
  );
}
