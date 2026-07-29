import React from "react";
import type { Metadata } from "next";
import { createServerClient } from "@pemantik/supabase";
import RilisFormClient from "./RilisFormClient";

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

      <div style={{ display: "grid", gap: "2rem", gridTemplateColumns: "1fr 2fr" }}>
        {/* Form Upload */}
        <div>
          <RilisFormClient />
        </div>

        {/* Tabel Riwayat Rilis */}
        <div className="card">
          <h2 style={{ marginBottom: "1rem" }}>Riwayat Rilis</h2>
          {releases && releases.length > 0 ? (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Versi</th>
                    <th>Code</th>
                    <th>Tanggal Rilis</th>
                    <th>Status</th>
                    <th>Wajib?</th>
                    <th>Link Download</th>
                  </tr>
                </thead>
                <tbody>
                  {releases.map((r: any) => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 600 }}>{r.version_name}</td>
                      <td>{r.version_code}</td>
                      <td>{new Date(r.created_at).toLocaleString("id-ID", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
                      <td>
                        <span className={`badge ${r.is_active ? 'badge-success' : 'badge-secondary'}`}>
                          {r.is_active ? 'Aktif' : 'Non-Aktif'}
                        </span>
                      </td>
                      <td>{r.is_mandatory ? 'Ya' : 'Tidak'}</td>
                      <td>
                        <a 
                          href={r.download_url} 
                          target="_blank" 
                          rel="noreferrer" 
                          style={{ color: "var(--clr-biru)", textDecoration: "underline", fontSize: "0.85rem" }}
                        >
                          Download APK
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: "2rem", textAlign: "center", color: "#6c757d" }}>
              Belum ada versi rilis aplikasi yang diunggah.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
