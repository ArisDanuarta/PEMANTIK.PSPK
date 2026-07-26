"use client";

import React, { useState, useTransition, useRef, useEffect } from "react";
import { Badge, Button, useToast } from "@pemantik/ui";
import InterventionGraph from "@/components/shared/InterventionGraph";
import RawInterventionGraph from "@/components/shared/RawInterventionGraph";
import ReactMarkdown from "react-markdown";
import { 
  saveGeminiApiKeyAction, 
  generateAiKnowledgeGraph,
  createEmptyAiJobAction,
  addManualKnowledgeNodeAction,
  addManualKnowledgeEdgeAction
} from "@/app/actions/geminiGraph";
import { getGlobalInterventionGraph } from "@/app/actions/interventions";

interface IntervensiSuperAdminClientProps {
  initialInterventions: any[];
  graphNodes: any[];
  graphEdges: any[];
  aiGraph: any | null;
  hasGeminiKey: boolean;
}

function formatDate(iso: string) {
  if (!iso) return "-";
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
  const [activeTab, setActiveTab] = useState<"list" | "graph" | "ai_chat">("graph");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDetail, setSelectedDetail] = useState<any | null>(null);
  
  const [globalNodes, setGlobalNodes] = useState<any[]>(graphNodes || []);
  const [globalEdges, setGlobalEdges] = useState<any[]>(graphEdges || []);
  const [isLoadingGraph, setIsLoadingGraph] = useState(false);

  const handleTabClick = async (tab: "list" | "graph" | "ai_chat") => {
    setActiveTab(tab);
    if ((tab === "graph" || tab === "ai_chat") && globalNodes.length === 0 && !isLoadingGraph) {
      setIsLoadingGraph(true);
      const res = await getGlobalInterventionGraph();
      if (res.success) {
        setGlobalNodes(res.nodes || []);
        setGlobalEdges(res.edges || []);
      }
      setIsLoadingGraph(false);
    }
  };
  
  // AI Settings State
  const [showSettings, setShowSettings] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Modal for AI Graph
  const [showAiGraphModal, setShowAiGraphModal] = useState(false);

  // AI Chat State
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<{role: "user" | "ai", content: string}[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [hasLoadedHistory, setHasLoadedHistory] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("ai_chat_history");
    if (saved) {
      try {
        setChatMessages(JSON.parse(saved));
      } catch (e) {}
    }
    setHasLoadedHistory(true);
  }, []);

  useEffect(() => {
    if (hasLoadedHistory) {
      localStorage.setItem("ai_chat_history", JSON.stringify(chatMessages));
    }
  }, [chatMessages, hasLoadedHistory]);

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
      setShowAiGraphModal(true);
    } else {
      showError("Gagal Menganalisis", res.error || "Terjadi kesalahan internal AI.");
    }
  };

  const handleExportCSV = () => {
    const headers = ["Komunitas", "Sekolah", "Fase", "Kondisi Awal", "Upaya Dilakukan", "Perubahan Signifikan", "Alasan Bermakna", "Tags"];
    const csvRows = [];
    csvRows.push(headers.join(","));

    for (const item of initialInterventions) {
      const comm = item.communities?.name || "Tanpa Komunitas";
      const sch = item.schools?.name || "Tanpa Sekolah";
      const phase = item.phase || "";
      const kondisi = `"${(item.kondisi_awal || "").replace(/"/g, '""')}"`;
      const upaya = `"${(item.upaya_dilakukan || "").replace(/"/g, '""')}"`;
      const dampak = `"${(item.perubahan_signifikan || "").replace(/"/g, '""')}"`;
      const alasan = `"${(item.alasan_bermakna || "").replace(/"/g, '""')}"`;
      const tags = `"${(item.intervention_tag_links || []).map((t:any) => t.intervention_tags?.name).join(", ")}"`;
      
      csvRows.push([comm, sch, phase, kondisi, upaya, dampak, alasan, tags].join(","));
    }

    const csvString = csvRows.join("\n");
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Global_Intervention_Report_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages]);

  const handleAskAi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !hasGeminiKey) {
      if (!hasGeminiKey) {
        showError("Konfigurasi Diperlukan", "API Key diperlukan.");
        setShowSettings(true);
      }
      return;
    }

    const userMessage = chatInput.trim();
    const currentMessages = [...chatMessages, { role: "user" as const, content: userMessage }];
    setChatMessages([...currentMessages, { role: "ai" as const, content: "" }]);
    setChatInput("");
    setIsChatLoading(true);

    try {
      const response = await fetch('/api/chat-intervention', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: currentMessages, graphNodes })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Gagal menghubungi AI.");
      }

      setIsChatLoading(false);
      
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let done = false;

      if (reader) {
        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          if (value) {
            const chunkText = decoder.decode(value, { stream: true });
            setChatMessages((prev) => {
              const newMessages = [...prev];
              // Buat salinan baru dari objek terakhir untuk menghindari mutasi ganda di React Strict Mode
              const lastMessage = { ...newMessages[newMessages.length - 1] };
              lastMessage.content += chunkText;
              newMessages[newMessages.length - 1] = lastMessage;
              return newMessages;
            });
          }
        }
      }
    } catch (err: any) {
      setIsChatLoading(false);
      showError("Gagal Menjawab", err.message);
      setChatMessages((prev) => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1].content = "Maaf, terjadi kesalahan saat menghubungi AI.";
        return newMessages;
      });
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
            onClick={() => handleTabClick("list")}
            style={{
              padding: "0.6rem 1.25rem", borderRadius: "0.5rem", border: "none",
              backgroundColor: activeTab === "list" ? "#102e50" : "transparent",
              color: activeTab === "list" ? "white" : "#4b5563",
              fontWeight: 600, cursor: "pointer", transition: "all 0.2s"
            }}
          >
            Semua Laporan ({filteredInterventions.length})
          </button>
          <button
            onClick={() => handleTabClick("graph")}
            style={{
              padding: "0.6rem 1.25rem", borderRadius: "0.5rem", border: "none",
              backgroundColor: activeTab === "graph" ? "#102e50" : "transparent",
              color: activeTab === "graph" ? "white" : "#4b5563",
              fontWeight: 600, cursor: "pointer", transition: "all 0.2s"
            }}
          >
            Knowledge Graph & Analysis
          </button>
          <button
            onClick={() => handleTabClick("ai_chat")}
            style={{
              padding: "0.6rem 1.25rem", borderRadius: "0.5rem", border: activeTab === "ai_chat" ? "none" : "1px solid #e2e8f0",
              backgroundColor: activeTab === "ai_chat" ? "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)" : "transparent",
              color: activeTab === "ai_chat" ? "white" : "#4f46e5",
              fontWeight: 600, cursor: "pointer", transition: "all 0.2s",
              display: "flex", alignItems: "center", gap: "0.4rem",
              background: activeTab === "ai_chat" ? "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)" : "white"
            }}
          >
            Tanya Jawab AI
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
            Set API AI
          </Button>
        </div>
      </div>

      {/* Tab 1: Global List */}
      {activeTab === "list" && (
        <div style={{ backgroundColor: "white", padding: "1.5rem", borderRadius: "1rem", border: "1px solid #f1f3f5" }}>
          {/* Stats Summary Bar */}
          <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
            {[
              { label: "Total Laporan", value: initialInterventions.length, color: "#102e50", bg: "#f0f4ff" },
              { label: "Dari Komunitas", value: initialInterventions.filter((i: any) => ["community", "super_admin"].includes(i.users?.role)).length, color: "#4f46e5", bg: "#eef2ff" },
              { label: "Dari Sekolah", value: initialInterventions.filter((i: any) => i.users?.role === "school").length, color: "#0284c7", bg: "#e0f2fe" },
              { label: "Dari Guru", value: initialInterventions.filter((i: any) => i.users?.role === "teacher").length, color: "#059669", bg: "#d1fae5" },
              { label: "Independen", value: initialInterventions.filter((i: any) => !i.community_id).length, color: "#d97706", bg: "#fef3c7" },
            ].map((s) => (
              <div key={s.label} style={{ padding: "0.65rem 1rem", borderRadius: "0.625rem", backgroundColor: s.bg, minWidth: "110px" }}>
                <div style={{ fontSize: "1.35rem", fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: "0.7rem", color: s.color, fontWeight: 600 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {filteredInterventions.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3rem", color: "#6b7280", backgroundColor: "#f9fafb", borderRadius: "0.75rem" }}>
              Belum ada laporan intervensi atau tidak ada yang sesuai dengan filter pencarian.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="pemantik-table">
                <thead>
                  <tr>
                    <th>Sumber &amp; Pembina</th>
                    <th>Sekolah &amp; Fase</th>
                    <th>Diagnosa Awal</th>
                    <th>Upaya Dilakukan</th>
                    <th>Tag Topik</th>
                    <th>Tanggal</th>
                    <th style={{ textAlign: "center" }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInterventions.map((item: any) => {
                    const role = item.users?.role ?? "unknown";
                    const roleMeta: Record<string, { label: string; color: string; bg: string }> = {
                      community: { label: "Komunitas", color: "#4f46e5", bg: "#eef2ff" },
                      super_admin: { label: "SuperAdmin", color: "#102e50", bg: "#e0f7ff" },
                      school: { label: "Sekolah", color: "#0284c7", bg: "#e0f2fe" },
                      teacher: { label: "Guru", color: "#059669", bg: "#d1fae5" },
                    };
                    const rm = roleMeta[role] ?? { label: role, color: "#64748b", bg: "#f1f5f9" };
                    const isIndependent = !item.community_id;

                    return (
                      <tr key={item.id}>
                        <td>
                          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                            <span style={{ padding: "0.15rem 0.5rem", borderRadius: "999px", fontSize: "0.7rem", fontWeight: 700, backgroundColor: rm.bg, color: rm.color, display: "inline-block", width: "fit-content" }}>
                              {rm.label}
                            </span>
                            <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#102e50" }}>
                              {isIndependent ? "Sekolah Independen" : `${item.communities?.name || "Komunitas"}`}
                            </span>
                          </div>
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
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Hybrid Analysis Dashboard (Graph Only) */}
      {activeTab === "graph" && (
        <div style={{ backgroundColor: "white", padding: "1.5rem", borderRadius: "1rem", border: "1px solid #f1f3f5", minHeight: "780px" }}>
          <InterventionGraph />
        </div>
      )}

      {/* Tab 3: AI Q&A Chat */}
      {activeTab === "ai_chat" && (
        <div style={{ backgroundColor: "white", padding: "2rem", borderRadius: "1rem", border: "1px solid #f1f3f5", display: "flex", flexDirection: "column", minHeight: "750px" }}>
          <div style={{ marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h2 style={{ margin: "0 0 0.5rem 0", color: "#1e293b", fontSize: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                AI Report Q&A
              </h2>
              <p style={{ margin: 0, color: "#64748b", fontSize: "0.95rem", lineHeight: 1.5 }}>
                Tanyakan wawasan tersembunyi, ringkasan, atau korelasi khusus dari data intervensi secara langsung. Gemini AI hanya akan menggunakan informasi yang tertanam di dalam {isLoadingGraph ? "..." : globalNodes.length} node graf Anda.
              </p>
            </div>
            {chatMessages.length > 0 && (
              <Button 
                variant="outline" 
                onClick={() => {
                  setChatMessages([]);
                  localStorage.removeItem("ai_chat_history");
                }}
              >
                Hapus Riwayat
              </Button>
            )}
          </div>

          <div style={{ 
            flex: 1, backgroundColor: "#f8fafc", borderRadius: "1rem", padding: "1.5rem",
            overflowY: "auto", display: "flex", flexDirection: "column", gap: "1rem",
            border: "1px solid #e2e8f0", marginBottom: "1.5rem"
          }}>
            {chatMessages.length === 0 ? (
              <div style={{ textAlign: "center", color: "#94a3b8", fontSize: "0.95rem", marginTop: "auto", marginBottom: "auto" }}>
                Mulai percakapan dengan AI terkait data intervensi. Contoh:<br />
                <em>"Apa tantangan literasi yang paling sering muncul di jenjang SMP?"</em><br />
                <em>"Bagaimana rata-rata sekolah binaan menangani masalah kurangnya fasilitas?"</em>
              </div>
            ) : (
              chatMessages.map((msg, i) => (
                <div key={i} style={{ 
                  alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                  backgroundColor: msg.role === "user" ? "#102e50" : "white",
                  color: msg.role === "user" ? "white" : "#1e293b",
                  padding: "1rem 1.25rem", borderRadius: "1rem",
                  maxWidth: "85%", fontSize: "0.95rem", lineHeight: 1.6,
                  border: msg.role === "ai" ? "1px solid #e2e8f0" : "none",
                  boxShadow: msg.role === "ai" ? "0 4px 6px rgba(0,0,0,0.02)" : "0 4px 6px rgba(16, 46, 80, 0.2)"
                }}>
                  {msg.role === "ai" ? (
                    <div className="prose prose-sm max-w-none text-slate-800">
                      <ReactMarkdown>
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    msg.content
                  )}
                </div>
              ))
            )}
            {isChatLoading && (
              <div style={{ alignSelf: "flex-start", backgroundColor: "white", padding: "1rem 1.25rem", borderRadius: "1rem", border: "1px solid #e2e8f0", fontSize: "0.95rem", color: "#64748b", display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <span className="animate-spin">⏳</span> Gemini sedang membaca {graphNodes.length} node data...
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <form onSubmit={handleAskAi} style={{ display: "flex", gap: "0.75rem", padding: "0.5rem", backgroundColor: "#f8fafc", borderRadius: "1rem", border: "1px solid #e2e8f0" }}>
            <input 
              type="text" 
              value={chatInput} 
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Tanyakan sesuatu pada data intervensi Anda..." 
              disabled={isChatLoading}
              style={{ flex: 1, padding: "1rem 1.25rem", borderRadius: "0.75rem", border: "none", fontSize: "0.95rem", backgroundColor: "transparent", outline: "none" }}
            />
            <Button type="submit" disabled={isChatLoading || !chatInput.trim()} style={{ backgroundColor: "#102e50", color: "white", padding: "0 1.5rem", borderRadius: "0.75rem", fontSize: "1rem" }}>
              Kirim
            </Button>
          </form>
        </div>
      )}

      {/* Modal AI Graph */}
      {showAiGraphModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1100, padding: "2rem"
        }}>
          <div style={{
            backgroundColor: "white", borderRadius: "1.25rem", padding: "1.5rem",
            width: "100%", height: "90vh", display: "flex", flexDirection: "column", gap: "1rem",
            boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)", position: "relative"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, color: "#1e293b", fontSize: "1.25rem" }}>✨ Sintesis Pola Intervensi Makro AI</h3>
              <div style={{ display: "flex", gap: "1rem" }}>
                <Button variant="outline" onClick={() => setShowManualModal(true)}>
                  ➕ Pemrosesan Manual
                </Button>
                <Button variant="outline" onClick={() => setShowAiGraphModal(false)}>Tutup</Button>
              </div>
            </div>
            
            <div style={{ flex: 1, border: "1px solid #e2e8f0", borderRadius: "1rem", overflow: "hidden" }}>
              {(!aiGraph || aiGraph.nodes.length === 0) ? (
                <div style={{ textAlign: "center", padding: "4rem 2rem", color: "#64748b", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: "1rem" }}>
                  <span style={{ fontSize: "3rem" }}>🤖</span>
                  <h3>Belum Ada Knowledge Graph AI</h3>
                  <p>Klik tombol Generate AI Graph di panel sebelumnya untuk membuat.</p>
                </div>
              ) : (
                <RawInterventionGraph
                  initialNodes={aiGraph.nodes.map((n: any) => ({
                    id: n.id,
                    position: { x: Math.random() * 600, y: Math.random() * 400 },
                    data: { label: n.label, type: n.type, desc: n.description }
                  }))}
                  initialEdges={aiGraph.edges.map((e: any) => ({
                    id: e.id,
                    source: e.source_node_id,
                    target: e.target_node_id,
                    label: e.label
                  }))}
                  title=""
                  description=""
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Manual Editor */}
      {showManualModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1150, padding: "1rem"
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
                  {selectedDetail.communities?.name || "Komunitas Pembina"}
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
