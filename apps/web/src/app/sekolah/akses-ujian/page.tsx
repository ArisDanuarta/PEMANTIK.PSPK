import type { Metadata } from "next";
import { createServerClient } from "@pemantik/supabase";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import AksesUjianSekolahClient from "./AksesUjianSekolahClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Akses Ujian | Sekolah",
  description: "Kelola distribusi dan ujian ulang siswa",
};

export default async function SekolahAksesUjianPage() {
  const supabase = createServerClient();
  const headersList = await headers();
  const schoolId = headersList.get("x-school-id");

  if (!schoolId) redirect("/login");

  let packages: any[] = [];
  let classes: any[] = [];
  let students: any[] = [];
  let communityData: any = null;

  try {
    // 1. Kategori yang bisa diakses sekolah ini (dari assessment_access level school atau community)
    const [
      { data: schoolAccessData },
      { data: commData },
    ] = await Promise.all([
      supabase
        .from("assessment_access")
        .select("category_id, phase, valid_from, valid_until, question_categories(id, name, subject_area)")
        .eq("target_type", "school")
        .eq("target_id", schoolId)
        .eq("is_active", true),
      supabase
        .from("schools")
        .select("community_id")
        .eq("id", schoolId)
        .maybeSingle(),
    ]);
    communityData = commData;

    const pkgMap = new Map<string, any>();
    const now = new Date();
    
    (schoolAccessData ?? []).forEach((a: any) => {
      const pkg = Array.isArray(a.question_categories) ? a.question_categories[0] : a.question_categories;
      
      let isExpired = false;
      if (a.valid_until) {
        const validUntilDate = new Date(a.valid_until);
        validUntilDate.setHours(23, 59, 59, 999);
        isExpired = validUntilDate < now;
      }
      
      if (pkg && !isExpired && !pkgMap.has(pkg.id)) {
        pkgMap.set(pkg.id, {
          ...pkg,
          phase: a.phase,
          valid_from: a.valid_from,
          valid_until: a.valid_until
        });
      }
    });
    packages = Array.from(pkgMap.values());

    // 2. Kelas aktif di sekolah ini
    const { data: classData } = await supabase
      .from("classes")
      .select("id, name, grade, students(count)")
      .eq("school_id", schoolId)
      .eq("is_active", true)
      .order("grade")
      .order("name");
    classes = classData ?? [];

    // 3. Siswa aktif di sekolah ini
    const { data: studentsData } = await supabase
      .from("students")
      .select("id, name:full_name, class_id")
      .eq("school_id", schoolId)
      .eq("is_active", true)
      .order("full_name");
    students = studentsData ?? [];

  } catch (err) {
    console.error("Failed to load akses ujian sekolah:", err);
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Akses Ujian</h1>
          <div className="page-breadcrumb">
            <span>Sekolah</span>
            <span className="page-breadcrumb-sep">›</span>
            <span>Akses Ujian</span>
          </div>
        </div>
      </div>
      <AksesUjianSekolahClient
        packages={packages}
        classes={classes}
        students={students}
        schoolId={schoolId}
        hasCommunity={!!communityData?.community_id}
      />
    </div>
  );
}
