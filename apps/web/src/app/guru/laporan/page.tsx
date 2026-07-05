import type { Metadata } from "next";
import { createServerClient } from "@pemantik/supabase";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import GuruReportDashboard from "./GuruReportDashboard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Hasil Ujian | Guru — Pemantik",
  description: "Pusat data hasil ujian siswa yang Anda ajar",
};

export default async function GuruLaporanPage() {
  const supabase = createServerClient();
  const headersList = await headers();
  const teacherId = headersList.get("x-user-id");
  const schoolId = headersList.get("x-school-id");

  if (!teacherId || !schoolId) redirect("/login");

  let packages: { id: string; name: string }[] = [];
  let classes: { id: string; name: string; grade: number }[] = [];

  try {
    // 1. Dapatkan kelas yang diajar oleh guru ini
    const { data: classData } = await supabase
      .from("classes")
      .select("id, name, grade")
      .eq("school_id", schoolId)
      .eq("teacher_id", teacherId)
      .eq("is_active", true)
      .order("grade")
      .order("name");
    classes = classData ?? [];

    // ── ARSIP PERMANEN (spec §2.2.5) ────────────────────────────────────────
    // Sumber daftar kategori: assessment_sessions dari siswa di kelas yang diajar.
    // Data hasil ujian tetap tampil meskipun grant sudah dicabut / tidak aktif.
    // Gap 7.3: Filter aplikasi level class_id (bukan hanya school_id) sesuai note RLS.
    const classIds = classes.map((c) => c.id);

    if (classIds.length > 0) {
      // Ambil student_ids yang ada di kelas-kelas guru ini
      const { data: students } = await supabase
        .from("students")
        .select("id")
        .in("class_id", classIds)
        .eq("is_active", true);

      const studentIds = (students ?? []).map((s) => s.id);

      if (studentIds.length > 0) {
        const { data: sessionCategories } = await supabase
          .from("assessment_sessions")
          .select("category_id, question_categories(id, name)")
          .in("student_id", studentIds)
          .eq("school_id", schoolId)
          .eq("is_void", false)
          .not("category_id", "is", null);

        if (sessionCategories) {
          const pkgMap = new Map<string, { id: string; name: string }>();
          sessionCategories.forEach((s: any) => {
            const pkg = Array.isArray(s.question_categories)
              ? s.question_categories[0]
              : s.question_categories;
            if (pkg && !pkgMap.has(pkg.id)) {
              pkgMap.set(pkg.id, { id: pkg.id, name: pkg.name });
            }
          });
          packages = Array.from(pkgMap.values());
        }
      }
    }
  } catch (err) {
    console.error("Failed to load laporan guru:", err);
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Hasil Ujian</h1>
          <div className="page-breadcrumb">
            <span>Guru</span>
            <span className="page-breadcrumb-sep">›</span>
            <span>Hasil Ujian</span>
          </div>
        </div>
      </div>

      {classes.length === 0 ? (
        <div className="card" style={{ padding: "3rem", textAlign: "center", color: "#6c757d" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>🎓</div>
          <p style={{ fontWeight: 600, color: "#102e50", marginBottom: "0.5rem" }}>
            Belum Ada Kelas
          </p>
          <p style={{ fontSize: "0.9rem" }}>
            Anda belum ditugaskan untuk mengajar kelas manapun.
          </p>
        </div>
      ) : (
        /* Dashboard dirender meskipun packages kosong — akan menampilkan empty state yang ramah */
        <GuruReportDashboard
          packages={packages}
          classes={classes}
          schoolId={schoolId}
          teacherId={teacherId}
        />
      )}
    </div>
  );
}
