import type { Metadata } from "next";
import { createServerClient } from "@pemantik/supabase";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import KelasManager from "./KelasManager";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Manajemen Kelas | Sekolah",
  description: "Kelola kelas dan penugasan guru di sekolah Anda",
};

export default async function SekolahKelasPage() {
  const supabase = createServerClient();
  const headersList = await headers();
  const schoolId = headersList.get("x-school-id");

  if (!schoolId) redirect("/login");

  let classes: any[] = [];
  let teachers: any[] = [];

  try {
    const [{ data: classData }, { data: teacherData }] = await Promise.all([
      supabase
        .from("classes")
        .select(`
          id, name, grade, academic_year, is_active,
          users(id, full_name),
          students(count)
        `)
        .eq("school_id", schoolId)
        .order("grade", { ascending: true })
        .order("name", { ascending: true }),
      supabase
        .from("users")
        .select("id, full_name")
        .eq("school_id", schoolId)
        .eq("role", "teacher")
        .eq("is_active", true)
        .order("full_name"),
    ]);

    classes = classData ?? [];
    teachers = teacherData ?? [];
  } catch (err) {
    console.error("Failed to fetch kelas data:", err);
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Manajemen Kelas</h1>
          <div className="page-breadcrumb">
            <span>Sekolah</span>
            <span className="page-breadcrumb-sep">›</span>
            <span>Kelas</span>
          </div>
        </div>
      </div>
      <KelasManager initialClasses={classes} teachers={teachers} schoolId={schoolId} />
    </div>
  );
}
