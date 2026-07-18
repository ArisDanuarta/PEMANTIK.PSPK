import type { Metadata } from "next";
import { createServerClient } from "@pemantik/supabase";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import React from "react";
import DapodikSekolahClient from "./DapodikSekolahClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Upload Data Dapodik | Sekolah - Pemantik",
  description: "Impor dan pemutakhiran data Dapodik sekolah (Guru, Anak, dan Kelas)",
};

export default async function SekolahDapodikPage() {
  const supabase = createServerClient();
  const headersList = await headers();
  const schoolId = headersList.get("x-school-id");

  if (!schoolId) {
    redirect("/login");
  }

  let school: any = null;
  try {
    const { data } = await (supabase as any)
      .from("schools")
      .select("id, name, npsn, community_id, dapodik_imported_at, import_source")
      .eq("id", schoolId)
      .maybeSingle();
    school = data;
  } catch (err) {
    console.error("Gagal memuat info sekolah untuk dapodik:", err);
  }

  if (!school) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <h2>Sekolah tidak ditemukan.</h2>
      </div>
    );
  }

  // Jika sekolah memiliki induk (komunitas binaan), maka menu / halaman upload dapodik dikunci
  if (school.community_id) {
    return (
      <div className="animate-fade-in" style={{ padding: "1rem 0" }}>
        <div className="page-header">
          <div className="page-header-left">
            <h1 className="page-title">Upload Data Dapodik</h1>
            <div className="page-breadcrumb">
              <span>{school.name}</span>
              <span className="page-breadcrumb-sep">›</span>
              <span>Manajemen</span>
              <span className="page-breadcrumb-sep">›</span>
              <span>Dapodik</span>
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
            backgroundColor: "#eff6ff",
            color: "#3b82f6",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "2.25rem",
            margin: "0 auto 1.5rem"
          }}>
            🏢
          </div>
          <h2 style={{ color: "#102e50", fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.75rem" }}>
            Menu Upload Dapodik Tidak Tersedia
          </h2>
          <p style={{ color: "#4b5563", fontSize: "0.95rem", lineHeight: 1.6, marginBottom: "2rem" }}>
            Sekolah Anda terdaftar sebagai <strong>Sekolah Binaan Komunitas</strong>.<br /><br />
            Seluruh data Dapodik (Guru, Anak, dan Kelas) untuk sekolah binaan diunggah dan dikelola secara terpusat oleh administrator Komunitas Induk Anda agar sinkron dengan jadwal asesmen komunitas.
          </p>
          <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
            <a
              href="/sekolah/dashboard"
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
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Upload Data Dapodik</h1>
          <div className="page-breadcrumb">
            <span>{school.name}</span>
            <span className="page-breadcrumb-sep">›</span>
            <span>Manajemen</span>
            <span className="page-breadcrumb-sep">›</span>
            <span>Dapodik</span>
          </div>
        </div>
      </div>

      <DapodikSekolahClient school={school} />
    </div>
  );
}
