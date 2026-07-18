import type { Metadata } from "next";
import { createServerClient } from "@pemantik/supabase";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import SchoolReportDashboard from "./SchoolReportDashboard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Hasil Ujian | Sekolah - Pemantik",
  description: "Pusat data hasil ujian sekolah",
};

export default async function SekolahLaporanPage() {
  const supabase = createServerClient();
  const headersList = await headers();
  const schoolId = headersList.get("x-school-id");

  if (!schoolId) redirect("/login");

  let packages: { id: string; name: string }[] = [];
  let classes: { id: string; name: string; grade: number }[] = [];

  try {
    // ── ARSIP PERMANEN (spec §2.2.5) ────────────────────────────────────────
    // Sumber daftar kategori: assessment_sessions (bukan assessment_access).
    // Data hasil ujian tetap tampil meskipun grant sudah dicabut / tidak aktif.
    const { data: sessionCategories } = await supabase
      .from("assessment_sessions")
      .select("category_id, question_categories(id, name)")
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

    // Kelas untuk filter toolbar (tetap filter is_active agar kelas aktif saja yang tampil di dropdown)
    const { data: classData } = await supabase
      .from("classes")
      .select("id, name, grade")
      .eq("school_id", schoolId)
      .eq("is_active", true)
      .order("grade")
      .order("name");
    classes = classData ?? [];
  } catch (err) {
    console.error("Failed to load laporan sekolah:", err);
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Hasil Ujian</h1>
          <div className="page-breadcrumb">
            <span>Sekolah</span>
            <span className="page-breadcrumb-sep">›</span>
            <span>Hasil Ujian</span>
          </div>
        </div>
      </div>

      {/* Dashboard selalu dirender - packages kosong hanya jika memang belum ada sesi */}
      <SchoolReportDashboard
        packages={packages}
        classes={classes}
        schoolId={schoolId}
      />
    </div>
  );
}
