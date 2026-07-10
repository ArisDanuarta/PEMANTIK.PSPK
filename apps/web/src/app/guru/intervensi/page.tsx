import type { Metadata } from "next";
import React from "react";
import IntervensiGuruClient from "./IntervensiGuruClient";
import { getInterventionsForSchool } from "@/app/actions/interventions";
import { getStagesForSchool } from "@/app/actions/stages";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@pemantik/supabase";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Riwayat Intervensi | Guru — Pemantik",
  description: "Daftar laporan pembinaan intervensi",
};

export default async function GuruIntervensiPage() {
  const headersList = await headers();
  const schoolId = headersList.get("x-school-id");
  const teacherId = headersList.get("x-user-id");

  if (!schoolId || !teacherId) {
    redirect("/login");
  }

  const supabase = createServerClient();
  const { data: school } = await supabase.from("schools").select("name").eq("id", schoolId).maybeSingle();
  const schoolName = school?.name || "Sekolah Anda";

  const stagesRes = await getStagesForSchool(schoolId);
  const stages = stagesRes.success ? (stagesRes.data || []) : [];
  const currentStageKey = stages[0]?.current_stage || "persiapan_akun";
  const currentStageId = stages[0]?.id || "";
  const currentPhase = stages[0]?.phase || "Awal";

  const resList = await getInterventionsForSchool(schoolId);
  const interventions = resList.success ? (resList.data || []) : [];

  // Akses terbuka apabila tracking progres minimal berada di tahap 4 (intervensi / selesai)
  // atau jika sudah terdapat riwayat intervensi yang tercatat
  const isUnlocked = ["intervensi", "selesai"].includes(currentStageKey) || interventions.length > 0;
  const canAdd = ["intervensi", "selesai"].includes(currentStageKey);

  if (!isUnlocked) {
    return (
      <div className="animate-fade-in" style={{ padding: "1rem 0" }}>
        <div className="page-header">
          <div className="page-header-left">
            <h1 className="page-title">Daftar Intervensi</h1>
            <div className="page-breadcrumb">
              <span>Guru</span>
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
            Menu <strong>Intervensi</strong> baru dapat diakses setelah sekolah Anda menyelesaikan atau melewati <strong>Tahap 3 (Proses Asesmen)</strong>.<br /><br />
            Sistem akan otomatis membuka akses halaman ini setelah masa asesmen berakhir dan tracking progress di timeline berada pada <strong>Tahap 4 (Intervensi)</strong>.
          </p>
          <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
            <a
              href="/guru/dashboard"
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
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ padding: "1rem 0" }}>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Riwayat Intervensi Guru</h1>
          <div className="page-breadcrumb">
            <span>Guru</span>
            <span className="page-breadcrumb-sep">›</span>
            <span>Intervensi</span>
          </div>
        </div>
      </div>
      <IntervensiGuruClient
        schoolId={schoolId}
        schoolName={schoolName}
        stageId={currentStageId}
        phase={currentPhase}
        initialInterventions={interventions}
        canAdd={canAdd}
      />
    </div>
  );
}
