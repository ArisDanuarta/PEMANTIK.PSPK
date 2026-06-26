import type { Metadata } from "next";
import { createServerClient } from "@pemantik/supabase";
import React from "react";
import CommunityReportDashboard from "./CommunityReportDashboard";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Laporan & Analitik | Pemantik",
  description: "Pusat data hasil ujian komunitas",
};

export const dynamic = 'force-dynamic';

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
    // 1. Dapatkan daftar sekolah binaan komunitas ini
    const { data: scData } = await supabase
      .from("schools")
      .select("id, name")
      .eq("community_id", communityId)
      .eq("is_active", true)
      .order("name", { ascending: true });
    schools = scData ?? [];

    // 2. Dapatkan HANYA kategori yang telah di-assign ke komunitas ini (isolasi akses)
    const { data: accessData } = await supabase
      .from("assessment_access")
      .select("category_id, question_categories(id, name)")
      .eq("target_type", "community")
      .eq("target_id", communityId)
      .eq("is_active", true);

    if (accessData) {
      const pkgMap = new Map<string, { id: string; name: string }>();
      accessData.forEach((access: any) => {
        const pkg = Array.isArray(access.question_categories)
          ? access.question_categories[0]
          : access.question_categories;
        if (pkg && !pkgMap.has(pkg.id)) {
          pkgMap.set(pkg.id, { id: pkg.id, name: pkg.name });
        }
      });
      packages = Array.from(pkgMap.values());
    }
  } catch (err) {
    console.error("Unexpected error loading community reports:", err);
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Pusat Laporan &amp; Analitik</h1>
          <div className="page-breadcrumb">
            <span>Komunitas</span>
            <span className="page-breadcrumb-sep">›</span>
            <span>Laporan</span>
          </div>
        </div>
      </div>

      {packages.length === 0 ? (
        <div
          className="card"
          style={{ padding: "3rem", textAlign: "center", color: "#6c757d" }}
        >
          <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>📦</div>
          <p style={{ fontWeight: 600, color: "#102e50", marginBottom: "0.5rem" }}>
            Belum Ada Kategori Ujian yang Diakses
          </p>
          <p style={{ fontSize: "0.9rem" }}>
            Komunitas Anda belum memiliki kategori ujian yang aktif. Hubungi Super Admin untuk mendapatkan akses.
          </p>
        </div>
      ) : (
        <CommunityReportDashboard
          schools={schools}
          packages={packages}
          communityId={communityId}
        />
      )}
    </div>
  );
}
