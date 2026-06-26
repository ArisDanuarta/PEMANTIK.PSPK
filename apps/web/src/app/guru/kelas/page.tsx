import type { Metadata } from "next";
import { createServerClient } from "@pemantik/supabase";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import KelasManagerGuru from "./KelasManagerGuru";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Kelas Saya | Guru",
  description: "Daftar kelas yang diajar",
};

export default async function GuruKelasPage() {
  const supabase = createServerClient();
  const headersList = await headers();
  const teacherId = headersList.get("x-user-id");
  const schoolId = headersList.get("x-school-id");

  if (!teacherId || !schoolId) redirect("/login");

  let classes: any[] = [];

  try {
    const { data } = await supabase
      .from("classes")
      .select("id, name, grade, academic_year, students(count)")
      .eq("school_id", schoolId)
      .eq("teacher_id", teacherId)
      .eq("is_active", true)
      .order("grade")
      .order("name");

    if (data) {
      classes = data.map((c: any) => ({
        id: c.id,
        name: c.name,
        grade: c.grade,
        academic_year: c.academic_year,
        student_count: c.students?.[0]?.count ?? 0,
      }));
    }
  } catch (err) {
    console.error("Failed to load kelas guru:", err);
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Manajemen Kelas</h1>
          <div className="page-breadcrumb">
            <span>Guru</span>
            <span className="page-breadcrumb-sep">›</span>
            <span>Kelas Saya</span>
          </div>
        </div>
      </div>
      <KelasManagerGuru classes={classes} />
    </div>
  );
}
