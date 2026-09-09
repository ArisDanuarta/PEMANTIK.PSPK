"use client";

import React, { useState } from "react";
import { DataTable, Badge, Button } from "@pemantik/ui";
import type { ColumnDef } from "@pemantik/ui";
import SafeHtml from "@/components/shared/SafeHtml";
import InterventionForm from "@/components/shared/InterventionForm";
import InterventionGraph from "@/components/shared/InterventionGraph";

interface IntervensiKomunitasClientProps {
  initialInterventions: any[];
  graphNodes: any[];
  graphEdges: any[];
  activeStages: any[];
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function IntervensiKomunitasClient({
  initialInterventions,
  graphNodes,
  graphEdges,
  activeStages,
}: IntervensiKomunitasClientProps) {
  const [selectedStageForForm, setSelectedStageForForm] = useState<any | null>(null);
  const [selectedInterventionDetail, setSelectedInterventionDetail] = useState<any | null>(null);

  const uniqueActiveStages = Array.from(
    new Map(activeStages.map((st: any) => [`${st.school_id}-${st.phase}`, st])).values()
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Top Bar / Header Action */}
      <div style={{
        backgroundColor: "white", padding: "1.25rem 1.5rem", borderRadius: "1rem",
        border: "1px solid #f1f3f5", boxShadow: "0 2px 4px rgba(0,0,0,0.03)",
        display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem"
      }}>
        <div>
          <h3 style={{ margin: 0, fontSize: "1.15rem", color: "#102e50", fontWeight: 700 }}>
            📋 Riwayat &amp; Submit Laporan Intervensi ({initialInterventions.length})
          </h3>
          <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.85rem", color: "#64748b" }}>
            Lengkapi form narasi kualitatif intervensi untuk sekolah binaan yang telah menyelesaikan asesmen.
          </p>
        </div>

        {uniqueActiveStages.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: 600 }}>
              {uniqueActiveStages.length} Sekolah Siap Intervensi
            </span>
          </div>
        )}
      </div>

      {/* Daftar Intervensi & Alert Sekolah Butuh Intervensi */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {/* Active Stages Need Intervention Alert / List */}
        {uniqueActiveStages.length > 0 && (
          <div style={{ backgroundColor: "#fffbeb", border: "1px solid #fde68a", padding: "1.25rem 1.5rem", borderRadius: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem", flexWrap: "wrap", gap: "0.5rem" }}>
              <h4 style={{ margin: 0, color: "#92400e", fontSize: "1.02rem" }}>
                ⚠️ Tahap Intervensi Sedang Berlangsung ({uniqueActiveStages.length} Sekolah)
              </h4>
              <span style={{ fontSize: "0.82rem", color: "#b45309" }}>
                Sekolah-sekolah berikut telah menyelesaikan asesmen dan siap dicatat intervensinya.
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "0.75rem" }}>
              {uniqueActiveStages.map((st: any) => {
                const isSubmittedByUs = initialInterventions.some((i: any) => 
                  i.stage_id === st.id && 
                  (i.users?.role === 'community' || i.users?.role === 'super_admin')
                );

                return (
                  <div
                    key={st.id}
                    style={{
                      backgroundColor: "white", padding: "1rem", borderRadius: "0.75rem",
                      border: "1px solid #fcd34d", display: "flex", justifyContent: "space-between", alignItems: "center"
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, color: "#1f2937", fontSize: "0.92rem" }}>{st.schools?.name}</div>
                      <div style={{ fontSize: "0.78rem", color: "#6b7280" }}>Fase: {st.phase}</div>
                      {isSubmittedByUs && (
                        <div style={{ marginTop: "0.3rem" }}>
                          <Badge variant="warning">⏳ Menunggu Form Sekolah</Badge>
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

        {/* Tabel Riwayat Intervensi */}
        <div style={{ backgroundColor: "white", padding: "1.5rem", borderRadius: "1rem", border: "1px solid #f1f3f5" }}>
          <h4 style={{ margin: "0 0 1rem 0", color: "#102e50", fontSize: "1.1rem" }}>
            Riwayat Laporan Intervensi yang Disubmit
          </h4>

          {initialInterventions.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3.5rem", color: "#6b7280", backgroundColor: "#f9fafb", borderRadius: "0.75rem", border: "1px dashed #e5e7eb" }}>
              Belum ada laporan intervensi yang pernah disubmit oleh komunitas Anda.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              {(() => {
                const columns: ColumnDef<any>[] = [
                  {
                    key: "school_phase",
                    label: "Sekolah & Fase",
                    sortable: true,
                    render: (_: any, item: any) => (
                      <>
                        <div style={{ fontWeight: 700, color: "#102e50" }}>{item.schools?.name || "Sekolah"}</div>
                        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginTop: "0.2rem" }}>
                          <Badge variant="info">{item.phase}</Badge>
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.4rem" }}>
                          Oleh: {(item as any).users?.role === "teacher" 
                            ? `Guru (${(item as any).users?.full_name || "Tanpa Nama"})` 
                            : (item as any).users?.role === "community"
                              ? `Komunitas (${item.communities?.name || "Tanpa Nama"})`
                              : "Admin Sekolah"}
                        </div>
                      </>
                    )
                  },
                  {
                    key: "kondisi_awal",
                    label: "1. Kondisi Awal",
                    render: (_: any, item: any) => (
                      <div style={{ maxWidth: "200px" }}>
                        <SafeHtml html={item.kondisi_awal || ""} style={{ fontSize: "0.85rem", color: "#334155", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }} />
                      </div>
                    )
                  },
                  {
                    key: "upaya_dilakukan",
                    label: "2. Upaya Dilakukan",
                    render: (_: any, item: any) => (
                      <div style={{ maxWidth: "220px" }}>
                        <SafeHtml html={item.upaya_dilakukan || ""} style={{ fontSize: "0.85rem", color: "#334155", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }} />
                      </div>
                    )
                  },
                  {
                    key: "tag_topik",
                    label: "Tag Topik",
                    render: (_: any, item: any) => (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem", maxWidth: "180px" }}>
                        {(item.intervention_tag_links || []).map((lnk: any) => (
                          <span key={lnk.intervention_tags?.id} style={{ padding: "0.15rem 0.5rem", backgroundColor: "#f3e8ff", color: "#6b21a8", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 600 }}>
                            #{lnk.intervention_tags?.name}
                          </span>
                        ))}
                      </div>
                    )
                  },
                  {
                    key: "created_at",
                    label: "Tanggal",
                    sortable: true,
                    render: (_: any, item: any) => (
                      <span style={{ fontSize: "0.82rem", color: "#64748b" }}>
                        {formatDate(item.created_at)}
                      </span>
                    )
                  },
                  {
                    key: "detail",
                    label: "Detail",
                    align: "center" as const,
                    render: (_: any, item: any) => (
                      <Button size="sm" variant="outline" onClick={() => setSelectedInterventionDetail(item)}>
                        Lihat Detail
                      </Button>
                    )
                  }
                ];
                return (
                  <DataTable
                    columns={columns}
                    data={initialInterventions}
                    emptyMessage="Belum ada laporan intervensi yang pernah disubmit oleh komunitas Anda."
                    striped
                    minWidth="900px"
                  />
                );
              })()}
            </div>
          )}
        </div>
      </div>

      {/* Modal Form Submit Intervensi */}
      {selectedStageForForm && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1100, padding: "1rem"
        }}>
          <div style={{
            backgroundColor: "white", borderRadius: "1.25rem", padding: "2rem",
            width: "100%", maxWidth: "680px", maxHeight: "92vh", overflowY: "auto",
            boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)"
          }}>
            <h3 style={{ margin: "0 0 0.5rem 0", color: "#102e50", fontSize: "1.3rem" }}>
              ✨ Form Pencatatan Intervensi &amp; Penyelesaian Tahap
            </h3>
            <p style={{ margin: "0 0 1.25rem 0", color: "#64748b", fontSize: "0.85rem" }}>
              Isi narasi pembinaan dan tag topik di bawah ini. Setelah disimpan, tahap intervensi pada timeline akan otomatis selesai.
            </p>

            <InterventionForm
              schoolId={selectedStageForForm.school_id}
              schoolName={selectedStageForForm.schools?.name || "Sekolah"}
              stageId={selectedStageForForm.id}
              phase={selectedStageForForm.phase}
              onSuccess={() => { setSelectedStageForForm(null); }}
              onCancel={() => setSelectedStageForForm(null)}
            />
          </div>
        </div>
      )}

      {/* Modal Detail Intervensi */}
      {selectedInterventionDetail && (
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
                <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b" }}>DETAIL LAPORAN INTERVENSI</span>
                <h3 style={{ margin: "0.2rem 0 0 0", color: "#102e50", fontSize: "1.25rem" }}>
                  {selectedInterventionDetail.schools?.name || "Sekolah"}
                </h3>
              </div>
              <Badge variant="info">{selectedInterventionDetail.phase}</Badge>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
              {(selectedInterventionDetail.intervention_tag_links || []).map((lnk: any) => (
                <span key={lnk.intervention_tags?.id} style={{ padding: "0.25rem 0.65rem", backgroundColor: "#f3e8ff", color: "#6b21a8", borderRadius: "999px", fontSize: "0.78rem", fontWeight: 600 }}>
                  #{lnk.intervention_tags?.name}
                </span>
              ))}
            </div>

            <hr style={{ border: 0, borderTop: "1px solid #f1f3f5", margin: 0 }} />

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", fontSize: "0.9rem" }}>
              <div>
                <strong style={{ display: "block", color: "#102e50", marginBottom: "0.35rem" }}>1. Ceritakan kondisi awal:</strong>
                <p style={{ fontSize: "0.78rem", color: "#64748b", margin: "0 0 0.35rem 0" }}>Bagaimana kondisi literasi/numerasi murid sebelum upaya ini dilakukan?</p>
                <SafeHtml html={selectedInterventionDetail.kondisi_awal || ""} style={{ backgroundColor: "#f8fafc", padding: "0.875rem", borderRadius: "0.5rem", border: "1px solid #e2e8f0", color: "#1e293b", whiteSpace: "pre-wrap" }} />
              </div>

              <div>
                <strong style={{ display: "block", color: "#102e50", marginBottom: "0.35rem" }}>2. Ceritakan upaya yang dilakukan:</strong>
                <p style={{ fontSize: "0.78rem", color: "#64748b", margin: "0 0 0.35rem 0" }}>Apa yang Anda/sekolah/komunitas lakukan untuk meningkatkan literasi dan numerasi murid?</p>
                <SafeHtml html={selectedInterventionDetail.upaya_dilakukan || ""} style={{ backgroundColor: "#f8fafc", padding: "0.875rem", borderRadius: "0.5rem", border: "1px solid #e2e8f0", color: "#1e293b", whiteSpace: "pre-wrap" }} />
              </div>

              <div>
                <strong style={{ display: "block", color: "#102e50", marginBottom: "0.35rem" }}>3. Ceritakan perubahan paling signifikan:</strong>
                <p style={{ fontSize: "0.78rem", color: "#64748b", margin: "0 0 0.35rem 0" }}>Perubahan paling signifikan pada murid sejak upaya ini dilakukan:</p>
                <SafeHtml html={selectedInterventionDetail.perubahan_signifikan || ""} style={{ backgroundColor: "#f0fdf4", padding: "0.875rem", borderRadius: "0.5rem", border: "1px solid #bbf7d0", color: "#166534", whiteSpace: "pre-wrap" }} />
              </div>

              <div>
                <strong style={{ display: "block", color: "#102e50", marginBottom: "0.35rem" }}>4. Mengapa perubahan ini yang paling bermakna?</strong>
                <p style={{ fontSize: "0.78rem", color: "#64748b", margin: "0 0 0.35rem 0" }}>Dari semua perubahan, mengapa ini yang paling penting:</p>
                <SafeHtml html={selectedInterventionDetail.alasan_bermakna || ""} style={{ backgroundColor: "#eff6ff", padding: "0.875rem", borderRadius: "0.5rem", border: "1px solid #bfdbfe", color: "#1e40af", whiteSpace: "pre-wrap" }} />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.5rem", borderTop: "1px solid #f1f3f5", paddingTop: "1rem", fontSize: "0.8rem", color: "#64748b" }}>
              <span>Disubmit pada {formatDate(selectedInterventionDetail.created_at)}</span>
              <Button onClick={() => setSelectedInterventionDetail(null)}>
                Tutup
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
