import type { Metadata } from "next";
import { createServerClient } from "@pemantik/supabase";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import TeachersManagerSekolah from "./TeachersManagerSekolah";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Manajemen Guru | Sekolah",
  description: "Kelola data guru di sekolah Anda",
};

export default async function SekolahGuruPage() {
  const supabase = createServerClient();
  const headersList = await headers();
  const schoolId = headersList.get("x-school-id");

  if (!schoolId) redirect("/login");

  let teachers: any[] = [];
  let classes: any[] = [];

  try {
    const [{ data: teacherData }, { data: classData }] = await Promise.all([
      supabase
        .from("users")
        .select(`
          id, full_name, username, nip, gender, is_active, created_at,
          classes!classes_teacher_id_fkey(id, name, grade)
        `)
        .eq("school_id", schoolId)
        .eq("role", "teacher")
        .order("full_name"),
      supabase
        .from("classes")
        .select("id, name, grade")
        .eq("school_id", schoolId)
        .eq("is_active", true)
        .order("grade")
        .order("name"),
    ]);

    teachers = teacherData ?? [];
    classes = classData ?? [];
  } catch (err) {
    console.error("Failed to fetch guru sekolah:", err);
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Manajemen Guru</h1>
          <div className="page-breadcrumb">
            <span>Sekolah</span>
            <span className="page-breadcrumb-sep">›</span>
            <span>Guru</span>
          </div>
        </div>
      </div>
      <TeachersManagerSekolah initialTeachers={teachers} classes={classes} schoolId={schoolId} />
    </div>
  );
}
