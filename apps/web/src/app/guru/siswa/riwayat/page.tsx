import type { Metadata } from "next";
import { createServerClient } from "@pemantik/supabase";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import RiwayatFaseGuru from "./RiwayatFaseGuru";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Riwayat Fase Anak | Guru",
  description: "Melihat histori asesmen anak dari fase-fase sebelumnya",
};

export default async function RiwayatFasePage() {
  const supabase = createServerClient();
  const headersList = await headers();
  const teacherId = headersList.get("x-user-id");
  const schoolId = headersList.get("x-school-id");

  if (!teacherId || !schoolId) redirect("/login");

  let students: any[] = [];
  let classes: any[] = [];
  let activePhase = "Belum Ada Fase";

  try {
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

      const { data: studentData } = await supabase
        .from("students")
        .select(`
          id, full_name, nisn, gender, username,
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

      if (studentData) {
        students = studentData;
      }
    }
  } catch (err) {
    console.error("Failed to load riwayat siswa guru:", err);
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <Link href="/guru/siswa" style={{ color: "var(--clr-biru)", textDecoration: "none", fontSize: "0.9rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.3rem", marginBottom: "0.5rem" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"></path></svg>
            Kembali ke Manajemen Anak
          </Link>
          <h1 className="page-title">Riwayat Fase Anak</h1>
          <div className="page-breadcrumb">
            <span>Guru</span>
            <span className="page-breadcrumb-sep">›</span>
            <span>Data Anak</span>
            <span className="page-breadcrumb-sep">›</span>
            <span>Riwayat Fase</span>
          </div>
        </div>
      </div>
      <RiwayatFaseGuru
        students={students}
        classes={classes}
        activePhase={activePhase}
      />
    </div>
  );
}
