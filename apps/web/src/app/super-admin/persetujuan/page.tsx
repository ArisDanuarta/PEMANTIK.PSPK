import type { Metadata } from "next";
import React from "react";
import PersetujuanSuperAdminClient from "./PersetujuanSuperAdminClient";
import { getAllPhaseRequests } from "@/app/actions/phaseRequests";
import { createServerClient } from "@pemantik/supabase";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Persetujuan Pembukaan Fase | Super Admin Pemantik",
  description: "Pusat persetujuan dan peninjauan pengajuan fase dari komunitas",
};

export default async function PersetujuanSuperAdminPage() {
  const supabase = createServerClient();
  const res = await getAllPhaseRequests();
  const requests = res.success ? (res.data || []) : [];

  // Fetch semua sekolah agar bisa me-map ID sekolah ke nama sekolah
  const { data: schools = [] } = await supabase
    .from("schools")
    .select("id, name, npsn");

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Approval Center — Persetujuan Fase</h1>
          <div className="page-breadcrumb">
            <span>Super Admin</span>
            <span className="page-breadcrumb-sep">›</span>
            <span>Manajemen Ujian</span>
            <span className="page-breadcrumb-sep">›</span>
            <span>Persetujuan Fase</span>
          </div>
        </div>
      </div>

      <PersetujuanSuperAdminClient
        initialRequests={requests}
        schools={schools || []}
      />
    </div>
  );
}
