"use client";

import React, { useState, useTransition } from "react";
import { Badge, Button, useToast } from "@pemantik/ui";
import InterventionGraph from "@/components/shared/InterventionGraph";
import { 
  saveGeminiApiKeyAction, 
  generateAiKnowledgeGraph,
  createEmptyAiJobAction,
  addManualKnowledgeNodeAction,
  addManualKnowledgeEdgeAction
} from "@/app/actions/geminiGraph";

interface IntervensiSuperAdminClientProps {
  initialInterventions: any[];
  graphNodes: any[];
  graphEdges: any[];
  aiGraph: any | null;
  hasGeminiKey: boolean;
}

function formatDate(iso: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function IntervensiSuperAdminClient({
  initialInterventions,
  graphNodes,
  graphEdges,
  aiGraph,
  hasGeminiKey,
}: IntervensiSuperAdminClientProps) {
  const [activeTab, setActiveTab] = useState<"list" | "graph" | "ai_graph">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDetail, setSelectedDetail] = useState<any | null>(null);
  
  // AI Settings State
  const [showSettings, setShowSettings] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Manual Fallback State
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualType, setManualType] = useState<"node" | "edge">("node");
  const [manualLabel, setManualLabel] = useState("");
  const [manualDesc, setManualDesc] = useState("");
  const [manualNodeType, setManualNodeType] = useState("theme");
  const [manualSource, setManualSource] = useState("");
  const [manualTarget, setManualTarget] = useState("");
  const [isManualSaving, setIsManualSaving] = useState(false);

  const { success: showSuccess, error: showError } = useToast();

  const filteredInterventions = initialInterventions.filter((item) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const commName = ((item.communities?.name || "") as string).toLowerCase();
    const schName = ((item.schools?.name || "") as string).toLowerCase();
    const phaseName = ((item.phase || "") as string).toLowerCase();
    const tags = (item.intervention_tag_links || []).map((l: any) => l.intervention_tags?.name || "").join(" ").toLowerCase();
    return commName.includes(q) || schName.includes(q) || phaseName.includes(q) || tags.includes(q);
  });
  
  const handleSaveApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKeyInput.trim()) return;
    
    startTransition(async () => {
      const res = await saveGeminiApiKeyAction(apiKeyInput.trim());
      if (res.success) {
        showSuccess("Tersimpan", "Gemini API Key berhasil disimpan.");
        setShowSettings(false);
        setApiKeyInput("");
      } else {
        showError("Gagal menyimpan", res.error);
      }
    });
  };
  
  const handleGenerateAi = async () => {
    if (!hasGeminiKey) {
      showError("Konfigurasi Diperlukan", "Harap simpan Gemini API Key terlebih dahulu di Pengaturan AI.");
      setShowSettings(true);
      return;
    }
    
    setIsGenerating(true);
    showSuccess("Menganalisis", "Gemini AI sedang membaca ratusan laporan intervensi... Ini mungkin memakan waktu hingga 1 menit.");
    
    const res = await generateAiKnowledgeGraph();
    setIsGenerating(false);
    
    if (res.success) {
      showSuccess("Analisis Selesai", "Knowledge Graph berhasil dibuat ulang.");
      setActiveTab("ai_graph");
    } else {
      showError("Gagal Menganalisis", res.error || "Terjadi kesalahan internal AI.");
    }
  };
  
  const handleSaveManual = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsManualSaving(true);
    
    let jobId = aiGraph?.job?.id;
    if (!jobId) {
      const jobRes = await createEmptyAiJobAction();
      if (!jobRes.success) {
        showError("Gagal", "Tidak dapat membuat sesi manual.");
        setIsManualSaving(false);
        return;
      }
      jobId = jobRes.id;
    }
    
    if (manualType === "node") {
      if (!manualLabel) return setIsManualSaving(false);
      const res = await addManualKnowledgeNodeAction(jobId, manualLabel, manualNodeType, manualDesc);
      if (res.success) {
        showSuccess("Berhasil", "Node ditambahkan.");
        setShowManualModal(false);
      } else {
        showError("Gagal", res.error);
      }
    } else {
      if (!manualSource || !manualTarget) return setIsManualSaving(false);
      const res = await addManualKnowledgeEdgeAction(jobId, manualSource, manualTarget, manualLabel);
      if (res.success) {
        showSuccess("Berhasil", "Edge ditambahkan.");
        setShowManualModal(false);
      } else {
        showError("Gagal", res.error);
      }
    }
    setIsManualSaving(false);
    setManualLabel("");
    setManualDesc("");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Top Banner Switcher */}
      <div style={{
        backgroundColor: "white", padding: "1.25rem 1.5rem", borderRadius: "1rem",
        border: "1px solid #f1f3f5", boxShadow: "0 2px 4px rgba(0,0,0,0.03)",
        display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem"
      }}>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button
            onClick={() => setActiveTab("list")}
            style={{
              padding: "0.6rem 1.25rem", borderRadius: "0.5rem", border: "none",
              backgroundColor: activeTab === "list" ? "#102e50" : "transparent",
              color: activeTab === "list" ? "white" : "#4b5563",
              fontWeight: 600, cursor: "pointer", transition: "all 0.2s"
            }}
          >
            📋 Semua Laporan ({filteredInterventions.length})
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
            🌐 Raw Graph ({graphNodes.length} Nodes)
          </button>
          <button
            onClick={() => setActiveTab("ai_graph")}
            style={{
              padding: "0.6rem 1.25rem", borderRadius: "0.5rem", border: activeTab === "ai_graph" ? "none" : "1px solid #e2e8f0",
              backgroundColor: activeTab === "ai_graph" ? "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)" : "transparent",
              color: activeTab === "ai_graph" ? "white" : "#4f46e5",
              fontWeight: 600, cursor: "pointer", transition: "all 0.2s",
              display: "flex", alignItems: "center", gap: "0.4rem",
              background: activeTab === "ai_graph" ? "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)" : "white"
            }}
          >
            ✨ AI Insights Graph
          </button>
        </div>

        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          {activeTab === "list" && (
            <input
              type="text"
              placeholder="🔍 Cari laporan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ padding: "0.55rem 1rem", borderRadius: "0.5rem", border: "1px solid #cbd5e1", fontSize: "0.88rem", width: "240px" }}
            />
          )}
          <Button variant="outline" onClick={() => setShowSettings(true)} style={{ borderColor: "#cbd5e1", color: "#475569" }}>
            ⚙️ Pengaturan AI
          </Button>
        </div>
      </div>

      {/* Tab 1: Global List */}
      {activeTab === "list" && (
        <div style={{ backgroundColor: "white", padding: "1.5rem", borderRadius: "1rem", border: "1px solid #f1f3f5" }}>
          {filteredInterventions.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3rem", color: "#6b7280", backgroundColor: "#f9fafb", borderRadius: "0.75rem" }}>
              Belum ada laporan intervensi atau tidak ada yang sesuai dengan filter pencarian.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="pemantik-table">
                <thead>
                  <tr>
                    <th>Komunitas Pembina</th>
                    <th>Sekolah &amp; Fase</th>
                    <th>Diagnosa Awal</th>
                    <th>Upaya Dilakukan</th>
                    <th>Tag Topik</th>
                    <th>Tanggal</th>
                    <th style={{ textAlign: "center" }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInterventions.map((item) => (
                    <tr key={item.id}>
                      <td style={{ fontWeight: 600, color: "#102e50", fontSize: "0.92rem" }}>
                        🏢 {item.communities?.name || "Komunitas"}
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: "#1e293b" }}>{item.schools?.name || "Sekolah"}</div>
                        <div style={{ marginTop: "0.2rem" }}><Badge variant="info">{item.phase}</Badge></div>
                      </td>
                      <td style={{ maxWidth: "200px" }}>
                        <div style={{ fontSize: "0.85rem", color: "#334155", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                          {item.kondisi_awal}
                        </div>
                      </td>
                      <td style={{ maxWidth: "220px" }}>
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

      {/* Tab 2: Global Knowledge Graph (Raw) */}
      {activeTab === "graph" && (
        <div style={{ backgroundColor: "white", padding: "1.5rem", borderRadius: "1rem", border: "1px solid #f1f3f5", minHeight: "750px" }}>
          <InterventionGraph
            initialNodes={graphNodes}
            initialEdges={graphEdges}
            title="Peta Knowledge Graph Nasional (Data Mentah)"
            description="Interkoneksi antar komunitas pembina, sekolah, laporan intervensi, serta tag kata kunci permasalahan."
          />
        </div>
      )}
      
      {/* Tab 3: AI Insights Graph */}
      {activeTab === "ai_graph" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ 
            backgroundColor: "white", padding: "1.5rem", borderRadius: "1rem", 
            border: "1px solid #e2e8f0", borderLeft: "4px solid #4f46e5",
            display: "flex", justifyContent: "space-between", alignItems: "center",
            flexWrap: "wrap", gap: "1rem"
          }}>
            <div>
              <h2 style={{ margin: "0 0 0.5rem 0", color: "#1e293b", fontSize: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                ✨ Analisis Makro oleh Gemini AI
              </h2>
              <p style={{ margin: 0, color: "#64748b", fontSize: "0.9rem" }}>
                Status Analisis Terakhir: {aiGraph?.job?.status === "completed" ? (
                  <strong style={{ color: "#16a34a" }}>Berhasil ({formatDate(aiGraph.job.completed_at)})</strong>
                ) : aiGraph?.job?.status === "failed" ? (
                  <strong style={{ color: "#dc2626" }}>Gagal ({aiGraph.job.error_message})</strong>
                ) : (
                  "Belum pernah dilakukan"
                )}
              </p>
            </div>
            
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <Button 
                variant="outline"
                onClick={() => setShowManualModal(true)} 
                style={{ borderColor: "#cbd5e1", color: "#475569" }}
              >
                ➕ Pemrosesan Manual
              </Button>
              <Button 
                onClick={handleGenerateAi} 
                disabled={isGenerating || initialInterventions.length === 0}
                style={{
                  background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
                  border: "none", color: "white", padding: "0.85rem 1.5rem", borderRadius: "0.75rem",
                  fontWeight: 600, boxShadow: "0 4px 6px -1px rgba(79, 70, 229, 0.3)"
                }}
              >
                {isGenerating ? "⏳ Menganalisis Data..." : "✨ Generate AI Graph"}
              </Button>
            </div>
          </div>
          
          <div style={{ backgroundColor: "white", padding: "1.5rem", borderRadius: "1rem", border: "1px solid #f1f3f5", minHeight: "700px" }}>
            {(!aiGraph || aiGraph.nodes.length === 0) ? (
              <div style={{ textAlign: "center", padding: "4rem 2rem", color: "#64748b", display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
                <span style={{ fontSize: "3rem" }}>🤖</span>
                <h3>Belum Ada Knowledge Graph AI</h3>
                <p>Gemini AI belum pernah menganalisis data intervensi Anda. Klik tombol "Generate AI Graph" di atas untuk mulai memproses ratusan data kualitatif menjadi insight terstruktur, atau gunakan Pemrosesan Manual.</p>
              </div>
            ) : (
              <InterventionGraph
                initialNodes={aiGraph.nodes.map((n: any) => ({
                  id: n.id,
                  position: { x: Math.random() * 600, y: Math.random() * 400 },
                  data: {
                    label: n.label,
                    type: n.type,
                    desc: n.description
                  }
                }))}
                initialEdges={aiGraph.edges.map((e: any) => ({
                  id: e.id,
                  source: e.source_node_id,
                  target: e.target_node_id,
                  label: e.label
                }))}
                title="Sintesis Pola Intervensi Makro"
                description="Hasil analisis NLP Gemini atau Pemrosesan Manual: menyimpulkan masalah umum, solusi terbaik, dan dampak yang terjadi secara global."
              />
            )}
          </div>
        </div>
      )}

      {/* Modal Manual Editor */}
      {showManualModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1100, padding: "1rem"
        }}>
          <div style={{
            backgroundColor: "white", borderRadius: "1.25rem", padding: "2rem",
            width: "100%", maxWidth: "500px",
            boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
          }}>
            <h3 style={{ margin: "0 0 1.5rem 0", color: "#1e293b", fontSize: "1.25rem" }}>➕ Pemrosesan Manual</h3>
            
            <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
              <Button variant={manualType === "node" ? "primary" : "outline"} onClick={() => setManualType("node")}>Tambah Node</Button>
              <Button variant={manualType === "edge" ? "primary" : "outline"} onClick={() => setManualType("edge")}>Tambah Edge (Relasi)</Button>
            </div>
            
            <form onSubmit={handleSaveManual} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {manualType === "node" ? (
                <>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "#334155" }}>Label / Judul</label>
                    <input type="text" value={manualLabel} onChange={e => setManualLabel(e.target.value)} required style={{ padding: "0.75rem", borderRadius: "0.5rem", border: "1px solid #cbd5e1" }} />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "#334155" }}>Tipe Node</label>
                    <select value={manualNodeType} onChange={e => setManualNodeType(e.target.value)} style={{ padding: "0.75rem", borderRadius: "0.5rem", border: "1px solid #cbd5e1" }}>
                      <option value="problem">Masalah (Problem)</option>
                      <option value="solution">Solusi (Solution)</option>
                      <option value="outcome">Hasil (Outcome)</option>
                      <option value="theme">Tema (Theme)</option>
                    </select>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "#334155" }}>Deskripsi Opsional</label>
                    <textarea value={manualDesc} onChange={e => setManualDesc(e.target.value)} rows={3} style={{ padding: "0.75rem", borderRadius: "0.5rem", border: "1px solid #cbd5e1" }} />
                  </div>
                </>
              ) : (
                <>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "#334155" }}>Source Node ID</label>
                    <select value={manualSource} onChange={e => setManualSource(e.target.value)} required style={{ padding: "0.75rem", borderRadius: "0.5rem", border: "1px solid #cbd5e1" }}>
                      <option value="">-- Pilih Node Asal --</option>
                      {aiGraph?.nodes?.map((n: any) => <option key={n.id} value={n.id}>{n.label}</option>)}
                    </select>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "#334155" }}>Target Node ID</label>
                    <select value={manualTarget} onChange={e => setManualTarget(e.target.value)} required style={{ padding: "0.75rem", borderRadius: "0.5rem", border: "1px solid #cbd5e1" }}>
                      <option value="">-- Pilih Node Tujuan --</option>
                      {aiGraph?.nodes?.map((n: any) => <option key={n.id} value={n.id}>{n.label}</option>)}
                    </select>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "#334155" }}>Label Relasi (contoh: "mengatasi")</label>
                    <input type="text" value={manualLabel} onChange={e => setManualLabel(e.target.value)} style={{ padding: "0.75rem", borderRadius: "0.5rem", border: "1px solid #cbd5e1" }} />
                  </div>
                </>
              )}
              
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1rem" }}>
                <Button type="button" variant="outline" onClick={() => setShowManualModal(false)}>Batal</Button>
                <Button type="submit" disabled={isManualSaving} style={{ backgroundColor: "#102e50", color: "white" }}>
                  {isManualSaving ? "Menyimpan..." : "Simpan Manual"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Settings */}
      {showSettings && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1100, padding: "1rem"
        }}>
          <div style={{
            backgroundColor: "white", borderRadius: "1.25rem", padding: "2rem",
            width: "100%", maxWidth: "480px",
            boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
          }}>
            <h3 style={{ margin: "0 0 1.5rem 0", color: "#1e293b", fontSize: "1.25rem" }}>⚙️ Pengaturan Integrasi Gemini AI</h3>
            
            <form onSubmit={handleSaveApiKey} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "#334155" }}>Google Gemini API Key</label>
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder={hasGeminiKey ? "•••••••••••••••• (Tersimpan)" : "AIzaSy..."}
                  style={{
                    padding: "0.75rem 1rem", borderRadius: "0.5rem", border: "1px solid #cbd5e1",
                    fontSize: "0.9rem", width: "100%", boxSizing: "border-box"
                  }}
                />
                <p style={{ margin: 0, fontSize: "0.75rem", color: "#64748b" }}>
                  Kunci API disimpan secara aman di database dan hanya digunakan oleh Super Admin untuk melakukan analisis teks intervensi.
                </p>
              </div>
              
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1rem" }}>
                <Button type="button" variant="outline" onClick={() => setShowSettings(false)} disabled={isPending}>
                  Batal
                </Button>
                <Button type="submit" disabled={isPending || !apiKeyInput.trim()} style={{ backgroundColor: "#102e50", color: "white" }}>
                  {isPending ? "Menyimpan..." : "Simpan Kunci API"}
                </Button>
              </div>
            </form>
          </div>
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
            width: "100%", maxWidth: "640px", maxHeight: "90vh", overflowY: "auto",
            boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
            display: "flex", flexDirection: "column", gap: "1.25rem"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "#0874aa" }}>
                  🏢 {selectedDetail.communities?.name || "Komunitas Pembina"}
                </span>
                <h3 style={{ margin: "0.2rem 0 0 0", color: "#102e50", fontSize: "1.3rem" }}>
                  {selectedDetail.schools?.name || "Sekolah"}
                </h3>
              </div>
              <Badge variant="info">{selectedDetail.phase}</Badge>
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
              <span>Disubmit pada {formatDate(selectedDetail.created_at)}</span>
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
