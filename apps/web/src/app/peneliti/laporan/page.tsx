import type { Metadata } from "next";
import { createServerClient } from "@pemantik/supabase";
import React from "react";
import SuperAdminReportDashboard from "@/app/super-admin/laporan/SuperAdminReportDashboard";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

export const metadata: Metadata = {
  title: "Laporan Data Asesmen",
  description: "Export data asesmen seluruh komunitas untuk analisis",
};

export const dynamic = 'force-dynamic';

export default async function PenelitiLaporanPage() {
  const supabase = createServerClient();
  const headersList = await headers();
  const userRole = headersList.get("x-user-role");

  if (userRole !== "peneliti") {
    redirect("/login");
  }

  let communities: { id: string; name: string }[] = [];
  let packages: { id: string; name: string }[] = [];

  try {
    const { data: commData } = await supabase
      .from("communities")
      .select("id, name")
      .eq("is_sandbox", false)
      .order("name", { ascending: true });
    communities = commData ?? [];

    const { data: catData } = await supabase
      .from("question_categories")
      .select("id, name")
      .order("name", { ascending: true });
    packages = catData ?? [];

  } catch (err) {
    console.error("Unexpected error loading peneliti reports:", err);
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Export Laporan Data & Analitik</h1>
          <div className="page-breadcrumb">
            <span>Peneliti</span>
            <span className="page-breadcrumb-sep">›</span>
            <span>Laporan & Data</span>
            <span className="page-breadcrumb-sep">›</span>
            <span>Export Laporan</span>
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
