"use client";

import React, { useState } from "react";
import { Badge, Button } from "@pemantik/ui";
import InterventionForm from "@/components/shared/InterventionForm";

interface IntervensiGuruClientProps {
  initialInterventions: any[];
  schoolId: string;
  schoolName: string;
  /** Stages yang sedang di fase 'intervensi' - bisa lebih dari satu jika ada multi-fase */
  activeStages?: any[];
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function IntervensiGuruClient({
  initialInterventions,
  schoolId,
  schoolName,
  activeStages = [],
}: IntervensiGuruClientProps) {
  const [selectedDetail, setSelectedDetail] = useState<any | null>(null);
  const [selectedStageForForm, setSelectedStageForForm] = useState<any | null>(null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Top Bar Info */}
      <div style={{
        backgroundColor: "white", padding: "1.25rem 1.5rem", borderRadius: "1rem",
        border: "1px solid #f1f3f5", boxShadow: "0 2px 4px rgba(0,0,0,0.03)",
        display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem"
      }}>
        <div>
          <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#102e50" }}>
            📋 Daftar Laporan Pembinaan &amp; Intervensi
          </h3>
          <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.85rem", color: "#64748b" }}>
            Total {initialInterventions.length} catatan pembinaan intervensi - {schoolName}
          </p>
        </div>
        {activeStages.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: 600 }}>
              {activeStages.length} Tahap Siap Intervensi
            </span>
          </div>
        )}
      </div>

      {/* Daftar Tahap Intervensi Aktif - sama dengan pola SekolahClient */}
      {activeStages.length > 0 && (
        <div style={{ backgroundColor: "#fffbeb", border: "1px solid #fde68a", padding: "1.25rem 1.5rem", borderRadius: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem", flexWrap: "wrap", gap: "0.5rem" }}>
            <h4 style={{ margin: 0, color: "#92400e", fontSize: "1.02rem" }}>
              ⚠️ Tahap Intervensi Sedang Berlangsung ({activeStages.length} Fase)
            </h4>
            <span style={{ fontSize: "0.82rem", color: "#b45309" }}>
              Isi laporan intervensi untuk setiap fase yang selesai asesmen.
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "0.75rem" }}>
            {activeStages.map((st) => {
              const isSubmittedByUs = initialInterventions.some((i: any) =>
                i.stage_id === st.id &&
                (i.users?.role === "school" || i.users?.role === "teacher")
              );
              const hasCommunity = !!st.community_id;

              return (
                <div
                  key={st.id}
                  style={{
                    backgroundColor: "white", padding: "1rem", borderRadius: "0.75rem",
                    border: "1px solid #fcd34d", display: "flex", justifyContent: "space-between", alignItems: "center"
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, color: "#1f2937", fontSize: "0.92rem" }}>Fase: {st.phase}</div>
                    {isSubmittedByUs && hasCommunity && (
                      <div style={{ marginTop: "0.3rem" }}>
                        <Badge variant="warning">⏳ Menunggu Form Komunitas</Badge>
                      </div>
                    )}
                  </div>
                  {!isSubmittedByUs ? (
                    <Button
                      size="sm"
                      style={{ backgroundColor: "#92400e", color: "white", fontSize: "0.78rem" }}
                      onClick={() => setSelectedStageForForm(st)}
                    >
                      + Catat Intervensi
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      style={{ backgroundColor: "#e2e8f0", color: "#64748b", fontSize: "0.78rem", cursor: "not-allowed" }}
                      disabled
                    >
                      Disubmit ✓
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* List Riwayat Intervensi */}
      <div style={{ backgroundColor: "white", padding: "1.5rem", borderRadius: "1rem", border: "1px solid #f1f3f5" }}>
        {initialInterventions.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3.5rem 2rem", color: "#6b7280", backgroundColor: "#f9fafb", borderRadius: "0.75rem" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>🌱</div>
            <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "#1f2937", marginBottom: "0.35rem" }}>
              Belum Ada Riwayat Intervensi
            </div>
            <p style={{ fontSize: "0.88rem", color: "#64748b", maxWidth: "480px", margin: "0 auto" }}>
              Laporan akan muncul di sini setelah intervensi dicatat untuk fase asesmen yang selesai.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="pemantik-table">
              <thead>
                <tr>
                  <th>Fase &amp; Pembina</th>
                  <th>Diagnosa Awal</th>
                  <th>Upaya Pembinaan</th>
                  <th>Tag Topik</th>
                  <th>Tanggal</th>
                  <th style={{ textAlign: "center" }}>Detail</th>
                </tr>
              </thead>
              <tbody>
                {initialInterventions.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div style={{ fontWeight: 700, color: "#102e50" }}>{item.phase}</div>
                      <div style={{ fontSize: "0.78rem", color: "#6b7280", marginTop: "0.15rem" }}>
                        Oleh: {(item as any).users?.role === "teacher" ? "Guru" : item.communities?.name || "Admin Sekolah"}
                      </div>
                    </td>
                    <td style={{ maxWidth: "220px" }}>
                      <div style={{ fontSize: "0.85rem", color: "#334155", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                        {item.kondisi_awal}
                      </div>
                    </td>
                    <td style={{ maxWidth: "240px" }}>
                      <div style={{ fontSize: "0.85rem", color: "#334155", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                        {item.upaya_dilakukan}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem", maxWidth: "180px" }}>
                        {(item.intervention_tag_links || []).map((lnk: any) => (
                          <span key={lnk.intervention_tags?.id} style={{ padding: "0.15rem 0.5rem", backgroundColor: "#f3e8ff", color: "#6b21a8", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 600 }}>
                            #{lnk.intervention_tags?.name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td style={{ fontSize: "0.82rem", color: "#64748b" }}>
                      {formatDate(item.created_at)}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <Button size="sm" variant="outline" onClick={() => setSelectedDetail(item)}>
                        Detail
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Detail */}
      {selectedDetail && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1100, padding: "1rem"
        }}>
          <div style={{
            backgroundColor: "white", borderRadius: "1.25rem", padding: "2rem",
            width: "100%", maxWidth: "620px", maxHeight: "90vh", overflowY: "auto",
            boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
            display: "flex", flexDirection: "column", gap: "1.25rem"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "#0874aa" }}>LAPORAN PEMBINAAN</span>
                <h3 style={{ margin: "0.2rem 0 0 0", color: "#102e50", fontSize: "1.3rem" }}>Fase {selectedDetail.phase}</h3>
              </div>
              <button onClick={() => setSelectedDetail(null)} style={{ border: "none", background: "none", fontSize: "1.5rem", cursor: "pointer", color: "#64748b" }}>×</button>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
              {(selectedDetail.intervention_tag_links || []).map((lnk: any) => (
                <span key={lnk.intervention_tags?.id} style={{ padding: "0.25rem 0.65rem", backgroundColor: "#f3e8ff", color: "#6b21a8", borderRadius: "999px", fontSize: "0.78rem", fontWeight: 600 }}>
                  #{lnk.intervention_tags?.name}
                </span>
              ))}
            </div>

            <hr style={{ border: 0, borderTop: "1px solid #f1f3f5", margin: 0 }} />

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", fontSize: "0.9rem" }}>
              {[
                { label: "1. Kondisi Awal / Diagnosa Asesmen:", value: selectedDetail.kondisi_awal, bg: "#f8fafc", border: "#e2e8f0", color: "#1e293b" },
                { label: "2. Upaya Intervensi yang Dilakukan:", value: selectedDetail.upaya_dilakukan, bg: "#f8fafc", border: "#e2e8f0", color: "#1e293b" },
                { label: "3. Perubahan Signifikan / Dampak Nyata:", value: selectedDetail.perubahan_signifikan, bg: "#f0fdf4", border: "#bbf7d0", color: "#166534" },
                { label: "4. Alasan Mengapa Praktik Ini Bermakna:", value: selectedDetail.alasan_bermakna, bg: "#eff6ff", border: "#bfdbfe", color: "#1e40af" },
              ].map((field, idx) => (
                <div key={idx}>
                  <strong style={{ display: "block", color: "#334155", marginBottom: "0.25rem" }}>{field.label}</strong>
                  <div style={{ backgroundColor: field.bg, padding: "0.875rem", borderRadius: "0.5rem", border: `1px solid ${field.border}`, color: field.color }}>
                    {field.value}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.5rem", borderTop: "1px solid #f1f3f5", paddingTop: "1rem" }}>
              <Button onClick={() => setSelectedDetail(null)}>Tutup</Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Form Intervensi */}
      {selectedStageForForm && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1100, padding: "1rem"
        }}>
          <div style={{
            backgroundColor: "white", borderRadius: "1.25rem", padding: "2rem",
            width: "100%", maxWidth: "700px", maxHeight: "90vh", overflowY: "auto",
            boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
            position: "relative"
          }}>
            <button
              onClick={() => setSelectedStageForForm(null)}
              style={{
                position: "absolute", top: "1.25rem", right: "1.5rem",
                background: "none", border: "none", fontSize: "1.5rem", color: "#94a3b8", cursor: "pointer"
              }}
            >
              &times;
            </button>
            <h3 style={{ margin: "0 0 0.2rem 0", color: "#102e50", fontSize: "1.3rem" }}>
              Form Laporan Intervensi (Guru)
            </h3>
            <p style={{ color: "#64748b", fontSize: "0.9rem", marginBottom: "1.5rem", paddingBottom: "1rem", borderBottom: "1px solid #f1f3f5" }}>
              Fase: <strong>{selectedStageForForm.phase}</strong>
            </p>
            <InterventionForm
              schoolId={schoolId}
              schoolName={schoolName}
              stageId={selectedStageForForm.id}
              phase={selectedStageForForm.phase}
              onSuccess={() => { setSelectedStageForForm(null); window.location.reload(); }}
              onCancel={() => setSelectedStageForForm(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
