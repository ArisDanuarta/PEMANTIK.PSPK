import type { Metadata } from "next";
import { createServerClient } from "@pemantik/supabase";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import GuruReportDashboard from "./GuruReportDashboard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Laporan & Analitik | Guru",
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
    // 1. Dapatkan kelas yang diajar
    const { data: classData } = await supabase
      .from("classes")
      .select("id, name, grade")
      .eq("school_id", schoolId)
      .eq("teacher_id", teacherId)
      .eq("is_active", true)
      .order("grade").order("name");
      
    classes = classData ?? [];

    // Kategori dari school access + community access
    const [{ data: schoolAccess }, { data: school }] = await Promise.all([
      supabase
        .from("assessment_access")
        .select("category_id, question_categories(id, name)")
        .eq("target_type", "school")
        .eq("target_id", schoolId)
        .eq("is_active", true),
      supabase
        .from("schools")
        .select("community_id")
        .eq("id", schoolId)
        .maybeSingle(),
    ]);

    let communityAccess: any[] = [];
    if (school?.community_id) {
      const { data: ca } = await supabase
        .from("assessment_access")
        .select("category_id, question_categories(id, name)")
        .eq("target_type", "community")
        .eq("target_id", school.community_id)
        .eq("is_active", true);
      communityAccess = ca ?? [];
    }

    const pkgMap = new Map<string, { id: string; name: string }>();
    [...(schoolAccess ?? []), ...communityAccess].forEach((a: any) => {
      const pkg = Array.isArray(a.question_categories) ? a.question_categories[0] : a.question_categories;
      if (pkg && !pkgMap.has(pkg.id)) pkgMap.set(pkg.id, { id: pkg.id, name: pkg.name });
    });
    packages = Array.from(pkgMap.values());

  } catch (err) {
    console.error("Failed to load laporan guru:", err);
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Pusat Laporan &amp; Analitik</h1>
          <div className="page-breadcrumb">
            <span>Guru</span>
            <span className="page-breadcrumb-sep">›</span>
            <span>Laporan</span>
          </div>
        </div>
      </div>

      {packages.length === 0 ? (
        <div className="card" style={{ padding: "3rem", textAlign: "center", color: "#6c757d" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>📦</div>
          <p style={{ fontWeight: 600, color: "#102e50", marginBottom: "0.5rem" }}>
            Belum Ada Kategori Ujian
          </p>
          <p style={{ fontSize: "0.9rem" }}>
            Sekolah Anda belum memiliki kategori ujian yang aktif. Hubungi Admin Sekolah.
          </p>
        </div>
      ) : classes.length === 0 ? (
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
        <GuruReportDashboard packages={packages} classes={classes} schoolId={schoolId} teacherId={teacherId} />
      )}
    </div>
  );
}
