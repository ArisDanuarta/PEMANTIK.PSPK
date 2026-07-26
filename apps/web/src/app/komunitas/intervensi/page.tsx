import type { Metadata } from "next";
import React from "react";
import IntervensiKomunitasClient from "./IntervensiKomunitasClient";
import { getInterventionsForCommunity, getInterventionGraph } from "@/app/actions/interventions";
import { createServerClient } from "@pemantik/supabase";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Laporan Intervensi & Knowledge Graph | Komunitas Pemantik",
  description: "Manajemen intervensi dan pemantauan Knowledge Graph komunitas",
};

export default async function KomunitasIntervensiPage() {
  const supabase = createServerClient();
  const headersList = await headers();
  const communityId = headersList.get("x-community-id");

  if (!communityId) {
    redirect("/login");
  }

  // 1. Dapatkan semua sekolah milik komunitas ini
  const { data: schools } = await (supabase as any)
    .from("schools")
    .select("id")
    .eq("community_id", communityId);
    
  const schoolIds = schools?.map((s: any) => s.id) || [];

  
  let unlockedStages: any[] = [];
  if (schoolIds.length > 0) {
    const { data } = await (supabase as any)
      .from("school_assessment_stages")
      .select("id, school_id, phase, current_stage, schools(id, name, npsn)")
      .in("school_id", schoolIds)
      .in("current_stage", ["intervensi", "selesai"]);
      
    unlockedStages = data || [];
  }

  // 2. Cek apakah sudah pernah ada riwayat intervensi
  const resList = await getInterventionsForCommunity();
  const interventions = resList.success ? (resList.data || []) : [];

  const hasUnlocked = (unlockedStages && unlockedStages.length > 0) || interventions.length > 0;

  if (!hasUnlocked) {
    return (
      <div className="animate-fade-in" style={{ padding: "2rem 0" }}>
        <div className="page-header">
          <div className="page-header-left">
            <h1 className="page-title">Form &amp; Laporan Intervensi</h1>
            <div className="page-breadcrumb">
              <span>Komunitas</span>
              <span className="page-breadcrumb-sep">›</span>
              <span>Intervensi</span>
            </div>
          </div>
        </div>

        <div style={{
          backgroundColor: "white",
          borderRadius: "1rem",
          padding: "3.5rem 2rem",
          textAlign: "center",
          boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
          border: "1px solid #e5e7eb",
          maxWidth: "640px",
          margin: "2rem auto"
        }}>
          <div style={{
            width: "72px",
            height: "72px",
            borderRadius: "50%",
            backgroundColor: "#fef3c7",
            color: "#d97706",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "2.25rem",
            margin: "0 auto 1.5rem"
          }}>
            🔒
          </div>
          <h2 style={{ color: "#102e50", fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.75rem" }}>
            Akses Intervensi Terkunci (Khusus Tahap 4 &amp; 5)
          </h2>
          <p style={{ color: "#4b5563", fontSize: "0.95rem", lineHeight: 1.6, marginBottom: "2rem" }}>
            Menu <strong>Form &amp; Laporan Intervensi</strong> baru dapat diakses setelah sekolah binaan Anda menyelesaikan atau melewati <strong>Tahap 3 (Proses Asesmen)</strong>.<br /><br />
            Sistem akan otomatis membuka akses halaman ini segera setelah masa asesmen berakhir atau saat Anda menekan tombol <em>&ldquo;Tutup Asesmen Sekarang&rdquo;</em> pada timeline asesmen sekolah binaan.
          </p>
          <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
            <a
              href="/komunitas/dashboard"
              style={{
                display: "inline-block",
                padding: "0.65rem 1.4rem",
                backgroundColor: "#102e50",
                color: "white",
                borderRadius: "0.5rem",
                fontWeight: 600,
                textDecoration: "none"
              }}
            >
              🏠 Kembali ke Dashboard
            </a>
            <a
              href="/komunitas/akses-ujian"
              style={{
                display: "inline-block",
                padding: "0.65rem 1.4rem",
                backgroundColor: "#f3f4f6",
                color: "#374151",
                border: "1px solid #d1d5db",
                borderRadius: "0.5rem",
                fontWeight: 600,
                textDecoration: "none"
              }}
            >
              📋 Lihat Timeline &amp; Pengajuan
            </a>
          </div>
        </div>
      </div>
    );
  }

  const stagesInInterventionOnly = (unlockedStages || []).filter((s: any) => s.current_stage === "intervensi");

  const resGraph = await getInterventionGraph();
  const nodes = resGraph.success ? (resGraph.nodes || []) : [];
  const edges = resGraph.success ? (resGraph.edges || []) : [];

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Form &amp; Laporan Intervensi</h1>
          <div className="page-breadcrumb">
            <span>Komunitas</span>
            <span className="page-breadcrumb-sep">›</span>
            <span>Intervensi</span>
          </div>
        </div>
      </div>

      <IntervensiKomunitasClient
        initialInterventions={interventions}
        graphNodes={nodes}
        graphEdges={edges}
        activeStages={stagesInInterventionOnly}
      />
    </div>
  );
}
