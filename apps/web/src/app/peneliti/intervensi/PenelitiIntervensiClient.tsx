"use client";

import React, { useState } from "react";
import { Badge, Button, DataTable, ColumnDef } from "@pemantik/ui";
import SafeHtml from "@/components/shared/SafeHtml";
import InterventionGraph from "@/components/shared/InterventionGraph";
import { InterventionRow } from "@/app/actions/interventions";

interface PenelitiIntervensiClientProps {
  initialInterventions: InterventionRow[];
}

function formatDate(iso: string) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function PenelitiIntervensiClient({
  initialInterventions,
}: PenelitiIntervensiClientProps) {
  const [activeTab, setActiveTab] = useState<"list" | "ai_graph">("ai_graph");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDetail, setSelectedDetail] = useState<InterventionRow | null>(null);

  // Filter interventions
  const filtered = initialInterventions.filter(inv => 
    inv.schools?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inv.phase?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div className="card">
        <div style={{ display: "flex", gap: "1rem", borderBottom: "1px solid #e5e7eb", marginBottom: "1.5rem" }}>
          <button
            className={`tab-btn ${activeTab === "ai_graph" ? "active" : ""}`}
            onClick={() => setActiveTab("ai_graph")}
            style={{ 
              padding: "0.75rem 1rem", 
              background: "none", 
              border: "none",
              borderBottom: activeTab === "ai_graph" ? "2px solid #0874aa" : "2px solid transparent",
              color: activeTab === "ai_graph" ? "#0874aa" : "#6b7280",
              fontWeight: activeTab === "ai_graph" ? 600 : 400,
              cursor: "pointer"
            }}
          >
            AI Knowledge Graph
          </button>
          <button
            className={`tab-btn ${activeTab === "list" ? "active" : ""}`}
            onClick={() => setActiveTab("list")}
            style={{ 
              padding: "0.75rem 1rem", 
              background: "none", 
              border: "none",
              borderBottom: activeTab === "list" ? "2px solid #0874aa" : "2px solid transparent",
              color: activeTab === "list" ? "#0874aa" : "#6b7280",
              fontWeight: activeTab === "list" ? 600 : 400,
              cursor: "pointer"
            }}
          >
            Log Intervensi Nasional
          </button>
        </div>

        {activeTab === "ai_graph" && (
          <div style={{ backgroundColor: "white", padding: "1.5rem", borderRadius: "1rem", border: "1px solid #f1f3f5", minHeight: "780px" }}>
            <InterventionGraph />
          </div>
        )}

        {activeTab === "list" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <input
                type="text"
                placeholder="Cari nama sekolah atau fase..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-input"
                style={{ width: "300px" }}
              />
            </div>
            
            <div style={{ overflowX: "auto" }}>
              {(() => {
                const columns: ColumnDef<any>[] = [
                  {
                    key: "created_at",
                    label: "Tanggal",
                    sortable: true,
                    render: (_: any, inv: any) => formatDate(inv.created_at)
                  },
                  {
                    key: "school_name",
                    label: "Sekolah",
                    sortable: true,
                    render: (_: any, inv: any) => (
                      <span style={{ fontWeight: 600 }}>{inv.schools?.name || "-"}</span>
                    )
                  },
                  {
                    key: "phase",
                    label: "Fase",
                    sortable: true,
                    render: (_: any, inv: any) => (
                      <span style={{ textTransform: "capitalize" }}>{inv.phase}</span>
                    )
                  },
                  {
                    key: "submitted_by",
                    label: "Submiter",
                    sortable: true
                  },
                  {
                    key: "tags",
                    label: "Tag Intervensi",
                    render: (_: any, inv: any) => (
                      <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                        {inv.intervention_tag_links?.slice(0, 2).map((tl: any, i: number) => (
                          <Badge key={i} variant="default">{tl.intervention_tags.name}</Badge>
                        ))}
                        {(inv.intervention_tag_links?.length || 0) > 2 && <Badge variant="default">+{inv.intervention_tag_links!.length - 2}</Badge>}
                      </div>
                    )
                  },
                  {
                    key: "actions",
                    label: "Aksi",
                    render: (_: any, inv: any) => (
                      <button onClick={() => setSelectedDetail(inv)} className="action-btn-text" style={{ color: "#0874aa" }}>
                        Detail
                      </button>
                    )
                  }
                ];

                return <DataTable columns={columns} data={filtered} emptyMessage="Tidak ada catatan intervensi." />;
              })()}
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedDetail && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1000,
          display: "flex", justifyContent: "center", alignItems: "center", padding: "1rem"
        }}>
          <div style={{
            backgroundColor: "white", borderRadius: "0.5rem", width: "100%", maxWidth: "600px",
            maxHeight: "90vh", overflowY: "auto", padding: "1.5rem"
          }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "#102e50", marginBottom: "1rem" }}>
              Detail Intervensi
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
              <div>
                <p style={{ fontSize: "0.85rem", color: "#6b7280", margin: 0 }}>Sekolah</p>
                <p style={{ fontWeight: 600, margin: 0 }}>{selectedDetail.schools?.name}</p>
              </div>
              <div>
                <p style={{ fontSize: "0.85rem", color: "#6b7280", margin: 0 }}>Fase / Waktu</p>
                <p style={{ fontWeight: 600, margin: 0 }}>
                  {selectedDetail.phase} / {formatDate(selectedDetail.created_at)}
                </p>
              </div>
            </div>
            
            <div style={{ marginBottom: "1rem" }}>
              <p style={{ fontSize: "0.85rem", color: "#6b7280", margin: 0 }}>Kondisi Awal</p>
              {selectedDetail.kondisi_awal ? (
                <SafeHtml html={selectedDetail.kondisi_awal} style={{ backgroundColor: "#f3f4f6", padding: "1rem", borderRadius: "0.5rem", marginTop: "0.5rem" }} />
              ) : (
                <div style={{ backgroundColor: "#f3f4f6", padding: "1rem", borderRadius: "0.5rem", marginTop: "0.5rem" }}><i>Tidak ada data</i></div>
              )}
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <p style={{ fontSize: "0.85rem", color: "#6b7280", margin: 0 }}>Upaya Dilakukan</p>
              {selectedDetail.upaya_dilakukan ? (
                <SafeHtml html={selectedDetail.upaya_dilakukan} style={{ backgroundColor: "#f3f4f6", padding: "1rem", borderRadius: "0.5rem", marginTop: "0.5rem" }} />
              ) : (
                <div style={{ backgroundColor: "#f3f4f6", padding: "1rem", borderRadius: "0.5rem", marginTop: "0.5rem" }}><i>Tidak ada data</i></div>
              )}
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <p style={{ fontSize: "0.85rem", color: "#6b7280", margin: 0 }}>Perubahan Signifikan</p>
              {selectedDetail.perubahan_signifikan ? (
                <SafeHtml html={selectedDetail.perubahan_signifikan} style={{ backgroundColor: "#f3f4f6", padding: "1rem", borderRadius: "0.5rem", marginTop: "0.5rem" }} />
              ) : (
                <div style={{ backgroundColor: "#f3f4f6", padding: "1rem", borderRadius: "0.5rem", marginTop: "0.5rem" }}><i>Tidak ada data</i></div>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", borderTop: "1px solid #e5e7eb", paddingTop: "1rem" }}>
              <Button onClick={() => setSelectedDetail(null)} variant="outline">Tutup</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
