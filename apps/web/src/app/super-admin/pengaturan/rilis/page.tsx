import React from "react";
import type { Metadata } from "next";
import { createServerClient } from "@pemantik/supabase";
import RilisFormClient from "./RilisFormClient";
import ReleaseTableClient from "./ReleaseTableClient";

export const metadata: Metadata = {
  title: "Rilis Aplikasi Mobile",
  description: "Manajemen rilis dan pembaruan APK Pemantik Mobile",
};

export default async function RilisPage() {
  const supabase = createServerClient();

  const { data: releases } = await supabase
    .from("app_releases" as any)
    .select("*")
    .order("version_code", { ascending: false });

  return (
    <div className="animate-fade-in">
      <style>{`
        .rilis-grid {
          display: grid;
          gap: 2rem;
          grid-template-columns: 1fr;
        }
        @media (min-width: 1024px) {
          .rilis-grid {
            grid-template-columns: 1fr 2fr; /* Form lebih sempit, tabel lebih lebar */
          }
        }
      `}</style>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Rilis Aplikasi Mobile</h1>
          <div className="page-breadcrumb">
            <span>Super Admin</span>
            <span className="page-breadcrumb-sep">›</span>
            <span>Pengaturan</span>
            <span className="page-breadcrumb-sep">›</span>
            <span>Rilis</span>
          </div>
        </div>
      </div>

      <div className="rilis-grid">
        {/* Form Upload */}
        <div style={{ maxWidth: "100%" }}>
          <RilisFormClient />
        </div>

        {/* Tabel Riwayat Rilis */}
        <ReleaseTableClient initialReleases={releases || []} />
      </div>
    </div>
  );
}
