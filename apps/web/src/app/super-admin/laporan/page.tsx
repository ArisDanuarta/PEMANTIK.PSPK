import type { Metadata } from "next";
import { createServerClient } from "@pemantik/supabase";
import React from "react";
import SuperAdminReportDashboard from "./SuperAdminReportDashboard";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

export const metadata: Metadata = {
  title: "Laporan Keseluruhan | Super Admin",
  description: "Pusat data hasil ujian semua sekolah dan komunitas",
};

export const dynamic = 'force-dynamic';

export default async function SuperAdminLaporanPage() {
  const supabase = createServerClient();
  const headersList = await headers();
  const userRole = headersList.get("x-user-role");

  if (userRole !== "super_admin") {
    redirect("/login");
  }

  let communities: { id: string; name: string }[] = [];
  let packages: { id: string; name: string }[] = [];

  try {
    // 1. Dapatkan daftar komunitas
    const { data: commData } = await supabase
      .from("communities")
      .select("id, name")
      .eq("is_active", true)
      .order("name", { ascending: true });
    communities = commData ?? [];

    // 2. Dapatkan semua kategori ujian
    const { data: catData } = await supabase
      .from("question_categories")
      .select("id, name")
      .eq("is_active", true)
      .order("name", { ascending: true });
    packages = catData ?? [];

  } catch (err) {
    console.error("Unexpected error loading super admin reports:", err);
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Pusat Laporan & Analitik (Semua)</h1>
          <div className="page-breadcrumb">
            <span>Super Admin</span>
            <span className="page-breadcrumb-sep">›</span>
            <span>Laporan Keseluruhan</span>
          </div>
        </div>
      </div>

      <SuperAdminReportDashboard
        communities={communities}
        packages={packages}
      />
    </div>
  );
}
