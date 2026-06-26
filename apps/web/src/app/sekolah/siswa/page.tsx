import type { Metadata } from "next";
import { createServerClient } from "@pemantik/supabase";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import StudentsManagerSekolah from "./StudentsManagerSekolah";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Manajemen Siswa | Sekolah",
  description: "Kelola data siswa di sekolah Anda",
};

export default async function SekolahSiswaPage() {
  const supabase = createServerClient();
  const headersList = await headers();
  const schoolId = headersList.get("x-school-id");

  if (!schoolId) redirect("/login");

  let students: any[] = [];
  let classes: any[] = [];
  let sesVariables: any[] = [];

  try {
    const [{ data: studentsData }, { data: classesData }, { data: sesData }] = await Promise.all([
      supabase
        .from("students")
        .select(`
          id, full_name, nisn, gender, birth_date, username, is_active, ses_class,
          father_education_id, mother_education_id, father_occupation_id, mother_occupation_id,
          village, district, city, province,
          classes(id, name, grade)
        `)
        .eq("school_id", schoolId)
        .order("full_name"),
      supabase
        .from("classes")
        .select("id, name, grade")
        .eq("school_id", schoolId)
        .eq("is_active", true)
        .order("grade")
        .order("name"),
      (supabase as any)
        .from("ses_variables")
        .select("*")
        .order("name"),
    ]);

    students = studentsData ?? [];
    classes = classesData ?? [];
    sesVariables = sesData ?? [];
  } catch (err) {
    console.error("Failed to fetch siswa sekolah:", err);
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Manajemen Siswa</h1>
          <div className="page-breadcrumb">
            <span>Sekolah</span>
            <span className="page-breadcrumb-sep">›</span>
            <span>Siswa</span>
          </div>
        </div>
      </div>
      <StudentsManagerSekolah 
        initialStudents={students} 
        classes={classes} 
        schoolId={schoolId} 
        sesVariables={sesVariables}
      />
    </div>
  );
}
