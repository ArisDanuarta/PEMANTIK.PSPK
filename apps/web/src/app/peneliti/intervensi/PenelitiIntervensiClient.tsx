"use client";

import React, { useState, useRef, useEffect } from "react";
import { Badge, Button } from "@pemantik/ui";
import InterventionGraph from "@/components/shared/InterventionGraph";
import ReactMarkdown from "react-markdown";
import { getGlobalInterventionGraph } from "@/app/actions/interventions";

interface PenelitiIntervensiClientProps {
  initialInterventions: any[];
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
  const [selectedDetail, setSelectedDetail] = useState<any | null>(null);

  // Filter interventions
  const filtered = initialInterventions.filter(inv => 
    inv.student?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inv.intervention_type?.toLowerCase().includes(searchQuery.toLowerCase())
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
                placeholder="Cari nama siswa atau jenis intervensi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-input"
                style={{ width: "300px" }}
              />
            </div>
            
            <div style={{ overflowX: "auto" }}>
              <table className="pemantik-table">
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th>Siswa</th>
                    <th>Komunitas</th>
                    <th>Jenis Intervensi</th>
                    <th>Status</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center", padding: "2rem", color: "#6b7280" }}>
                        Tidak ada catatan intervensi.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((inv: any) => (
                      <tr key={inv.id}>
                        <td>{formatDate(inv.created_at)}</td>
                        <td style={{ fontWeight: 600 }}>{inv.student?.full_name || "-"}</td>
                        <td>{inv.school?.communities?.name || "-"}</td>
                        <td style={{ textTransform: "capitalize" }}>{inv.intervention_type?.replace(/_/g, ' ')}</td>
                        <td>
                          <Badge variant={inv.status === 'completed' ? 'success' : 'warning'}>
                            {inv.status}
                          </Badge>
                        </td>
                        <td>
                          <button onClick={() => setSelectedDetail(inv)} className="action-btn-text" style={{ color: "#0874aa" }}>
                            Detail
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
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
                <p style={{ fontSize: "0.85rem", color: "#6b7280", margin: 0 }}>Siswa</p>
                <p style={{ fontWeight: 600, margin: 0 }}>{selectedDetail.student?.full_name}</p>
              </div>
              <div>
                <p style={{ fontSize: "0.85rem", color: "#6b7280", margin: 0 }}>Komunitas / Sekolah</p>
                <p style={{ fontWeight: 600, margin: 0 }}>
                  {selectedDetail.school?.communities?.name} / {selectedDetail.school?.name}
                </p>
              </div>
            </div>
            
            <div style={{ marginBottom: "1rem" }}>
              <p style={{ fontSize: "0.85rem", color: "#6b7280", margin: 0 }}>Catatan Guru</p>
              <div style={{ backgroundColor: "#f3f4f6", padding: "1rem", borderRadius: "0.5rem", marginTop: "0.5rem" }}>
                {selectedDetail.notes || <i>Tidak ada catatan</i>}
              </div>
            </div>

            {selectedDetail.ai_feedback && (
              <div style={{ marginBottom: "1.5rem" }}>
                <p style={{ fontSize: "0.85rem", color: "#6b7280", margin: 0 }}>Analisis AI</p>
                <div style={{ backgroundColor: "#eff6ff", padding: "1rem", borderRadius: "0.5rem", marginTop: "0.5rem", fontSize: "0.95rem" }}>
                  <ReactMarkdown>{selectedDetail.ai_feedback}</ReactMarkdown>
                </div>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", borderTop: "1px solid #e5e7eb", paddingTop: "1rem" }}>
              <Button onClick={() => setSelectedDetail(null)} variant="outline">Tutup</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
