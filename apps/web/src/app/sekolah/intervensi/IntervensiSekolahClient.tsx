"use client";

import React, { useState } from "react";
import { Badge, Button } from "@pemantik/ui";
import InterventionGraph from "@/components/shared/InterventionGraph";

interface IntervensiSekolahClientProps {
  initialInterventions: any[];
  graphNodes: any[];
  graphEdges: any[];
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function IntervensiSekolahClient({
  initialInterventions,
  graphNodes,
  graphEdges,
}: IntervensiSekolahClientProps) {
  const [activeTab, setActiveTab] = useState<"list" | "graph">("list");
  const [selectedDetail, setSelectedDetail] = useState<any | null>(null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Top Bar */}
      <div style={{
        backgroundColor: "white", padding: "1.25rem 1.5rem", borderRadius: "1rem",
        border: "1px solid #f1f3f5", boxShadow: "0 2px 4px rgba(0,0,0,0.03)",
        display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem"
      }}>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            onClick={() => setActiveTab("list")}
            style={{
              padding: "0.6rem 1.25rem", borderRadius: "0.5rem", border: "none",
              backgroundColor: activeTab === "list" ? "#102e50" : "transparent",
              color: activeTab === "list" ? "white" : "#4b5563",
              fontWeight: 600, cursor: "pointer", transition: "all 0.2s"
            }}
          >
            📋 Riwayat Pembinaan &amp; Intervensi ({initialInterventions.length})
          </button>
          <button
            onClick={() => setActiveTab("graph")}
            style={{
              padding: "0.6rem 1.25rem", borderRadius: "0.5rem", border: "none",
              backgroundColor: activeTab === "graph" ? "#102e50" : "transparent",
              color: activeTab === "graph" ? "white" : "#4b5563",
              fontWeight: 600, cursor: "pointer", transition: "all 0.2s"
            }}
          >
            🕸️ Knowledge Graph Sekolah ({graphNodes.length} Nodes)
          </button>
        </div>
      </div>

      {/* Tab 1: List */}
      {activeTab === "list" && (
        <div style={{ backgroundColor: "white", padding: "1.5rem", borderRadius: "1rem", border: "1px solid #f1f3f5" }}>
          {initialInterventions.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3rem", color: "#6b7280", backgroundColor: "#f9fafb", borderRadius: "0.75rem" }}>
              Belum ada riwayat intervensi yang dicatat oleh komunitas pembina atau admin sekolah Anda.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="pemantik-table">
                <thead>
                  <tr>
                    <th>Fase &amp; Komunitas</th>
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
                          Oleh: {item.communities?.name || "Komunitas"}
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
      )}

      {/* Tab 2: Graph */}
      {activeTab === "graph" && (
        <div style={{ backgroundColor: "white", padding: "1.5rem", borderRadius: "1rem", border: "1px solid #f1f3f5", minHeight: "700px" }}>
          <InterventionGraph
            initialNodes={graphNodes}
            initialEdges={graphEdges}
            title="Knowledge Graph Intervensi Sekolah Anda"
            description="Visualisasi hubungan antara laporan asesmen intervensi di sekolah Anda dengan topik-topik kunci."
          />
        </div>
      )}

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
                <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "#0874aa" }}>
                  LAPORAN PEMBINAAN
                </span>
                <h3 style={{ margin: "0.2rem 0 0 0", color: "#102e50", fontSize: "1.3rem" }}>
                  Fase {selectedDetail.phase}
                </h3>
              </div>
              <div style={{ marginTop: "0.2rem" }}><Badge variant="info">{selectedDetail.phase}</Badge></div>
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
              <div>
                <strong style={{ display: "block", color: "#334155", marginBottom: "0.25rem" }}>1. Kondisi Awal / Diagnosa Asesmen:</strong>
                <div style={{ backgroundColor: "#f8fafc", padding: "0.875rem", borderRadius: "0.5rem", border: "1px solid #e2e8f0", color: "#1e293b" }}>
                  {selectedDetail.kondisi_awal}
                </div>
              </div>

              <div>
                <strong style={{ display: "block", color: "#334155", marginBottom: "0.25rem" }}>2. Upaya Intervensi yang Dilakukan:</strong>
                <div style={{ backgroundColor: "#f8fafc", padding: "0.875rem", borderRadius: "0.5rem", border: "1px solid #e2e8f0", color: "#1e293b" }}>
                  {selectedDetail.upaya_dilakukan}
                </div>
              </div>

              <div>
                <strong style={{ display: "block", color: "#334155", marginBottom: "0.25rem" }}>3. Perubahan Signifikan / Dampak Nyata:</strong>
                <div style={{ backgroundColor: "#f0fdf4", padding: "0.875rem", borderRadius: "0.5rem", border: "1px solid #bbf7d0", color: "#166534" }}>
                  {selectedDetail.perubahan_signifikan}
                </div>
              </div>

              <div>
                <strong style={{ display: "block", color: "#334155", marginBottom: "0.25rem" }}>4. Alasan Mengapa Praktik Ini Bermakna:</strong>
                <div style={{ backgroundColor: "#eff6ff", padding: "0.875rem", borderRadius: "0.5rem", border: "1px solid #bfdbfe", color: "#1e40af" }}>
                  {selectedDetail.alasan_bermakna}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.5rem", borderTop: "1px solid #f1f3f5", paddingTop: "1rem", fontSize: "0.8rem", color: "#64748b" }}>
              <span>Disubmit oleh {selectedDetail.communities?.name || "Komunitas"} pada {formatDate(selectedDetail.created_at)}</span>
              <Button onClick={() => setSelectedDetail(null)}>
                Tutup
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
