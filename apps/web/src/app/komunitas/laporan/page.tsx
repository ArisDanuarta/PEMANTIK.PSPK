import type { Metadata } from "next";
import { createServerClient } from "@pemantik/supabase";
import React from "react";
import CommunityReportDashboard from "./CommunityReportDashboard";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Hasil Ujian | Komunitas — Pemantik",
  description: "Pusat data hasil ujian komunitas",
};

export const dynamic = "force-dynamic";

export default async function KomunitasLaporanPage() {
  const supabase = createServerClient();
  const headersList = await headers();
  const communityId = headersList.get("x-community-id");

  if (!communityId) {
    redirect("/login");
  }

  let schools: { id: string; name: string }[] = [];
  let packages: { id: string; name: string }[] = [];

  try {
    // 1. Dapatkan semua sekolah binaan komunitas ini (tidak filter is_active)
    const { data: scData } = await supabase
      .from("schools")
      .select("id, name, npsn, city, students(id)")
      .eq("community_id", communityId)
      .order("name", { ascending: true });
    schools = (scData ?? []).map((s: any) => ({
      id: s.id,
      name: s.name,
      npsn: s.npsn ?? "—",
      city: s.city ?? "—",
      registeredStudentsCount: Array.isArray(s.students) ? s.students.length : 0,
    }));

    const schoolIds = schools.map((s) => s.id);

    // ── ARSIP PERMANEN (spec §2.2.5) ────────────────────────────────────────
    // Sumber daftar kategori: assessment_sessions (bukan assessment_access).
    // Data hasil ujian tetap tampil meskipun grant sudah dicabut / tidak aktif.
    // is_void=false cukup untuk exclude sesi yang di-void karena ujian ulang.
    if (schoolIds.length > 0) {
      const { data: sessionCategories } = await supabase
        .from("assessment_sessions")
        .select("category_id, question_categories(id, name)")
        .in("school_id", schoolIds)
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
  } catch (err) {
    console.error("Unexpected error loading community reports:", err);
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Hasil Ujian</h1>
          <div className="page-breadcrumb">
            <span>Komunitas</span>
            <span className="page-breadcrumb-sep">›</span>
            <span>Hasil Ujian</span>
          </div>
        </div>
      </div>

      {/* Dashboard selalu dirender — packages kosong hanya jika memang belum ada sesi */}
      <CommunityReportDashboard
        schools={schools}
        packages={packages}
        communityId={communityId}
      />
    </div>
  );
}
