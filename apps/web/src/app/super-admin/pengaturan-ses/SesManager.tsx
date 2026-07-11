"use client";

import React, { useState } from "react";
import { updateSesThreshold, updateSesVariable, createSesVariable, deleteSesVariable } from "@/app/actions/ses";
import { useRouter } from "next/navigation";
import { useToast, useConfirm } from "@pemantik/ui";

export default function SesManager({ initialThresholds, initialVariables }: { initialThresholds: any[], initialVariables: any[] }) {
  const [thresholds, setThresholds] = useState(initialThresholds);
  const [variables, setVariables] = useState(initialVariables);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const [newVarName, setNewVarName] = useState("");
  const [newVarScore, setNewVarScore] = useState(1);
  const [newVarType, setNewVarType] = useState<"education" | "occupation">("education");
  const router = useRouter();
  const { success, error } = useToast();
  const { confirm } = useConfirm();

  const handleUpdateThreshold = async (id: string, min: number, max: number) => {
    setLoadingId(id);
    const res = await updateSesThreshold(id, min, max);
    if (!res.success) {
      error("Gagal Update", "Gagal update threshold: " + res.error);
    } else {
      success("Berhasil", "Threshold SES berhasil diperbarui");
    }
    setLoadingId(null);
  };

  const handleUpdateVariable = async (id: string, type: 'education' | 'occupation', name: string, score: number) => {
    setLoadingId(id);
    const res = await updateSesVariable(id, type, name, score);
    if (!res.success) {
      error("Gagal Update", "Gagal update bobot: " + res.error);
    } else {
      success("Berhasil", "Bobot SES berhasil diperbarui");
    }
    setLoadingId(null);
  };

  const handleCreateVariable = async () => {
    if (!newVarName) return error("Validasi", "Nama variabel harus diisi");
    setLoadingId("new");
    const res = await createSesVariable(newVarType, newVarName, newVarScore);
    if (!res.success) {
      error("Gagal Membuat", "Gagal membuat variabel: " + res.error);
    } else {
      success("Berhasil", "Variabel SES berhasil dibuat");
      setNewVarName("");
      setNewVarScore(1);
      router.refresh(); 
    }
    setLoadingId(null);
  };

  const handleDeleteVariable = async (id: string) => {
    const isConfirmed = await confirm({
      title: "Hapus Variabel SES",
      description: "Hapus variabel SES ini? Semua siswa yang terkait mungkin kehilangan kalkulasi nilainya.",
      confirmLabel: "Hapus",
      cancelLabel: "Batal",
      variant: "danger"
    });
    if (!isConfirmed) return;
    
    setLoadingId(id);
    const res = await deleteSesVariable(id);
    if (!res.success) {
      error("Gagal Menghapus", "Gagal hapus variabel: " + res.error);
    } else {
      success("Berhasil", "Variabel SES berhasil dihapus");
      router.refresh();
    }
    setLoadingId(null);
  };

  const Spinner = () => (
    <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "spin 1s linear infinite" }}>
      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
      <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
    </svg>
  );

  const TrashIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
    </svg>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2.5rem", marginTop: "1rem" }}>
      
      {/* BAGIAN 1: THRESHOLDS */}
      <div style={{ 
        background: "#ffffff", 
        borderRadius: "16px", 
        boxShadow: "0 4px 24px rgba(0,0,0,0.04)", 
        border: "1px solid #f0f0f0",
        overflow: "hidden" 
      }}>
        <div style={{ 
          padding: "1.5rem 2rem", 
          background: "linear-gradient(to right, #ffffff, #fafafa)",
          borderBottom: "1px solid #f0f0f0" 
        }}>
          <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700, color: "#111827", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00619A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
            Ambang Batas (Threshold) SES
          </h3>
          <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.95rem", color: "#6b7280" }}>
            Tentukan rentang nilai gabungan untuk setiap kelas sosial ekonomi berdasarkan standar instrumen penelitian.
          </p>
        </div>
        
        <div style={{ padding: "1rem 2rem 2rem 2rem" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "1rem" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "1rem", color: "#4b5563", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "2px solid #e5e7eb" }}>Klasifikasi SES</th>
                <th style={{ textAlign: "left", padding: "1rem", color: "#4b5563", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "2px solid #e5e7eb" }}>Skor Minimal</th>
                <th style={{ textAlign: "left", padding: "1rem", color: "#4b5563", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "2px solid #e5e7eb" }}>Skor Maksimal</th>
                <th style={{ textAlign: "right", padding: "1rem", color: "#4b5563", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "2px solid #e5e7eb" }}></th>
              </tr>
            </thead>
            <tbody>
              {thresholds.map((t) => (
                <tr key={t.id} style={{ transition: "all 0.2s" }} onMouseEnter={e => e.currentTarget.style.backgroundColor = "#f9fafb"} onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}>
                  <td style={{ padding: "1.2rem 1rem", borderBottom: "1px solid #f3f4f6" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: (t.name.toLowerCase().includes("menengah atas") || t.name.toLowerCase().includes("menengah_atas")) ? "#00619A" : (t.name.toLowerCase().includes("menengah bawah") || t.name.toLowerCase().includes("menengah_bawah")) ? "#F2AF3E" : t.name.toLowerCase().includes("atas") ? "#10b981" : "#ef4444" }}></div>
                      <strong style={{ color: "#1f2937", fontSize: "1rem" }}>{t.name}</strong>
                    </div>
                  </td>
                  <td style={{ padding: "1.2rem 1rem", borderBottom: "1px solid #f3f4f6" }}>
                    <input 
                      type="number" 
                      value={t.min_score} 
                      style={{ width: "100px", padding: "0.6rem 1rem", borderRadius: "8px", border: "1px solid #d1d5db", fontSize: "0.95rem", outline: "none", transition: "border-color 0.2s", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}
                      onFocus={e => e.currentTarget.style.borderColor = "#00619A"}
                      onBlur={(e) => { e.currentTarget.style.borderColor = "#d1d5db"; handleUpdateThreshold(t.id, t.min_score, t.max_score); }}
                      onChange={(e) => setThresholds(thresholds.map(x => x.id === t.id ? { ...x, min_score: parseInt(e.target.value) || 0 } : x))}
                    />
                  </td>
                  <td style={{ padding: "1.2rem 1rem", borderBottom: "1px solid #f3f4f6" }}>
                    <input 
                      type="number" 
                      value={t.max_score} 
                      style={{ width: "100px", padding: "0.6rem 1rem", borderRadius: "8px", border: "1px solid #d1d5db", fontSize: "0.95rem", outline: "none", transition: "border-color 0.2s", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}
                      onFocus={e => e.currentTarget.style.borderColor = "#00619A"}
                      onBlur={(e) => { e.currentTarget.style.borderColor = "#d1d5db"; handleUpdateThreshold(t.id, t.min_score, t.max_score); }}
                      onChange={(e) => setThresholds(thresholds.map(x => x.id === t.id ? { ...x, max_score: parseInt(e.target.value) || 0 } : x))}
                    />
                  </td>
                  <td style={{ padding: "1.2rem 1rem", borderBottom: "1px solid #f3f4f6", textAlign: "right" }}>
                    <span style={{ color: "#00619A", fontSize: "0.9rem", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "0.4rem", opacity: loadingId === t.id ? 1 : 0, transition: "opacity 0.2s" }}>
                      <Spinner /> Menyimpan...
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* BAGIAN 2: VARIABEL & BOBOT NILAI */}
      <div style={{ 
        background: "#ffffff", 
        borderRadius: "16px", 
        boxShadow: "0 4px 24px rgba(0,0,0,0.04)", 
        border: "1px solid #f0f0f0",
        overflow: "hidden" 
      }}>
        <div style={{ 
          padding: "1.5rem 2rem", 
          background: "linear-gradient(to right, #ffffff, #fafafa)",
          borderBottom: "1px solid #f0f0f0" 
        }}>
          <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700, color: "#111827", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F2AF3E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
            Bobot Nilai Indikator
          </h3>
          <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.95rem", color: "#6b7280" }}>
            Manajemen daftar kriteria pendidikan dan pekerjaan beserta besaran poinnya. Nilai otomatis tersimpan saat Anda selesai mengubah input.
          </p>
        </div>
        
        {/* Form Tambah Variabel */}
        <div style={{ 
          margin: "2rem", 
          padding: "1.5rem", 
          background: "linear-gradient(135deg, #f0f7ff, #ffffff)", 
          border: "1px dashed #93c5fd",
          borderRadius: "12px",
          display: "flex", 
          flexWrap: "wrap",
          gap: "1.25rem", 
          alignItems: "flex-end" 
        }}>
          <div style={{ flex: "1 1 200px" }}>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#4b5563", marginBottom: "0.5rem" }}>Kategori Indikator</label>
            <select 
              value={newVarType} 
              onChange={e => setNewVarType(e.target.value as any)} 
              style={{ width: "100%", padding: "0.75rem 1rem", borderRadius: "8px", border: "1px solid #bfdbfe", fontSize: "0.95rem", backgroundColor: "#fff", outline: "none", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}
            >
              <option value="education">🎓 Pendidikan</option>
              <option value="occupation">💼 Pekerjaan</option>
            </select>
          </div>
          
          <div style={{ flex: "2 1 300px" }}>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#4b5563", marginBottom: "0.5rem" }}>Nama Indikator (Contoh: S1 / PNS)</label>
            <input 
              type="text" 
              placeholder="Masukkan nama indikator..." 
              style={{ width: "100%", padding: "0.75rem 1rem", borderRadius: "8px", border: "1px solid #bfdbfe", fontSize: "0.95rem", outline: "none", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}
              value={newVarName}
              onChange={e => setNewVarName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreateVariable()}
            />
          </div>

          <div style={{ flex: "0 1 120px" }}>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#4b5563", marginBottom: "0.5rem" }}>Bobot / Skor</label>
            <input 
              type="number" 
              placeholder="Skor" 
              style={{ width: "100%", padding: "0.75rem 1rem", borderRadius: "8px", border: "1px solid #bfdbfe", fontSize: "0.95rem", outline: "none", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}
              value={newVarScore}
              onChange={e => setNewVarScore(parseInt(e.target.value) || 0)}
              onKeyDown={e => e.key === 'Enter' && handleCreateVariable()}
            />
          </div>

          <button 
            onClick={handleCreateVariable} 
            disabled={loadingId === "new"}
            style={{
              padding: "0.75rem 1.5rem",
              background: "#00619A",
              color: "#fff",
              fontWeight: 600,
              fontSize: "0.95rem",
              borderRadius: "8px",
              border: "none",
              cursor: loadingId === "new" ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              boxShadow: "0 4px 6px -1px rgba(0, 97, 154, 0.2), 0 2px 4px -1px rgba(0, 97, 154, 0.1)",
              transition: "all 0.2s"
            }}
          >
            {loadingId === "new" ? <Spinner /> : <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>}
            Tambahkan
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "2rem", padding: "0 2rem 2rem 2rem" }}>
          
          {/* TABEL PENDIDIKAN */}
          <div style={{ background: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
            <div style={{ padding: "1rem 1.25rem", background: "#f1f5f9", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "1.2rem" }}>🎓</span>
              <h4 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#334155" }}>Indikator Pendidikan</h4>
            </div>
            
            <div style={{ padding: "0.5rem 1.25rem 1.25rem 1.25rem", maxHeight: "500px", overflowY: "auto" }}>
              {variables.filter(v => v.type === "education").map((v) => (
                <div key={v.id} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem 0", borderBottom: "1px solid #f1f5f9", flexWrap: "wrap" }}>
                  {/* Badge needs_review (GAP 5) */}
                  {v.needs_review && (
                    <span title="Indikator dari import Dapodik, skor belum ditentukan" style={{
                      display: "inline-flex", alignItems: "center", gap: "0.25rem",
                      padding: "0.15rem 0.5rem", borderRadius: "99px",
                      backgroundColor: "#fef3c7", border: "1px solid #f59e0b",
                      color: "#92400e", fontSize: "0.7rem", fontWeight: 700,
                      whiteSpace: "nowrap", flexShrink: 0,
                    }}>⚠ Perlu Skor</span>
                  )}
                  <select 
                    value={v.type} 
                    style={{ flex: "0 0 110px", padding: "0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem", background: "#fff", outline: "none" }}
                    onChange={(e) => {
                      const newType = e.target.value as any;
                      setVariables(variables.map(x => x.id === v.id ? { ...x, type: newType } : x));
                      handleUpdateVariable(v.id, newType, v.name, v.score);
                    }}
                  >
                    <option value="education">Pendidikan</option>
                    <option value="occupation">Pekerjaan</option>
                  </select>
                  
                  <input 
                    type="text" 
                    value={v.name} 
                    style={{ flex: "1", minWidth: "120px", padding: "0.5rem 0.75rem", borderRadius: "6px", border: `1px solid ${v.needs_review ? "#f59e0b" : "#cbd5e1"}`, fontSize: "0.9rem", outline: "none", transition: "border-color 0.2s" }}
                    onFocus={e => e.currentTarget.style.borderColor = "#00619A"}
                    onBlur={(e) => { e.currentTarget.style.borderColor = v.needs_review ? "#f59e0b" : "#cbd5e1"; handleUpdateVariable(v.id, v.type, v.name, v.score); }}
                    onChange={(e) => setVariables(variables.map(x => x.id === v.id ? { ...x, name: e.target.value } : x))}
                  />
                  
                  <input 
                    type="number" 
                    value={v.score} 
                    style={{ flex: "0 0 60px", padding: "0.5rem", borderRadius: "6px", border: `1px solid ${v.needs_review ? "#f59e0b" : "#cbd5e1"}`, fontSize: "0.9rem", textAlign: "center", outline: "none", transition: "border-color 0.2s" }}
                    onFocus={e => e.currentTarget.style.borderColor = "#00619A"}
                    onBlur={(e) => { e.currentTarget.style.borderColor = v.needs_review ? "#f59e0b" : "#cbd5e1"; handleUpdateVariable(v.id, v.type, v.name, v.score); }}
                    onChange={(e) => setVariables(variables.map(x => x.id === v.id ? { ...x, score: parseInt(e.target.value) || 0 } : x))}
                  />

                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", width: "32px", justifyContent: "center" }}>
                    {loadingId === v.id ? (
                      <span style={{ color: "#00619A" }}><Spinner /></span>
                    ) : (
                      <button 
                        onClick={() => handleDeleteVariable(v.id)}
                        title="Hapus Indikator"
                        style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", padding: "4px", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.2s" }}
                      >
                        <TrashIcon />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {variables.filter(v => v.type === "education").length === 0 && (
                <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#94a3b8", fontSize: "0.9rem" }}>
                  Belum ada indikator pendidikan.<br/>Silakan tambah melalui form di atas.
                </div>
              )}
            </div>
          </div>

          {/* TABEL PEKERJAAN */}
          <div style={{ background: "#fcf8f3", borderRadius: "12px", border: "1px solid #fde6ca", overflow: "hidden" }}>
            <div style={{ padding: "1rem 1.25rem", background: "#fdf3e7", borderBottom: "1px solid #fde6ca", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "1.2rem" }}>💼</span>
              <h4 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#9a5b00" }}>Indikator Pekerjaan</h4>
            </div>
            
            <div style={{ padding: "0.5rem 1.25rem 1.25rem 1.25rem", maxHeight: "500px", overflowY: "auto" }}>
              {variables.filter(v => v.type === "occupation").map((v) => (
                <div key={v.id} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem 0", borderBottom: "1px solid #fdf3e7", flexWrap: "wrap" }}>
                  {/* Badge needs_review (GAP 5) */}
                  {v.needs_review && (
                    <span title="Indikator dari import Dapodik, skor belum ditentukan" style={{
                      display: "inline-flex", alignItems: "center", gap: "0.25rem",
                      padding: "0.15rem 0.5rem", borderRadius: "99px",
                      backgroundColor: "#fef3c7", border: "1px solid #f59e0b",
                      color: "#92400e", fontSize: "0.7rem", fontWeight: 700,
                      whiteSpace: "nowrap", flexShrink: 0,
                    }}>⚠ Perlu Skor</span>
                  )}
                  <select 
                    value={v.type} 
                    style={{ flex: "0 0 110px", padding: "0.5rem", borderRadius: "6px", border: "1px solid #f6d2a8", fontSize: "0.85rem", background: "#fff", outline: "none" }}
                    onChange={(e) => {
                      const newType = e.target.value as any;
                      setVariables(variables.map(x => x.id === v.id ? { ...x, type: newType } : x));
                      handleUpdateVariable(v.id, newType, v.name, v.score);
                    }}
                  >
                    <option value="education">Pendidikan</option>
                    <option value="occupation">Pekerjaan</option>
                  </select>
                  
                  <input 
                    type="text" 
                    value={v.name} 
                    style={{ flex: "1", minWidth: "120px", padding: "0.5rem 0.75rem", borderRadius: "6px", border: `1px solid ${v.needs_review ? "#f59e0b" : "#f6d2a8"}`, fontSize: "0.9rem", outline: "none", transition: "border-color 0.2s" }}
                    onFocus={e => e.currentTarget.style.borderColor = "#F2AF3E"}
                    onBlur={(e) => { e.currentTarget.style.borderColor = v.needs_review ? "#f59e0b" : "#f6d2a8"; handleUpdateVariable(v.id, v.type, v.name, v.score); }}
                    onChange={(e) => setVariables(variables.map(x => x.id === v.id ? { ...x, name: e.target.value } : x))}
                  />
                  
                  <input 
                    type="number" 
                    value={v.score} 
                    style={{ flex: "0 0 60px", padding: "0.5rem", borderRadius: "6px", border: `1px solid ${v.needs_review ? "#f59e0b" : "#f6d2a8"}`, fontSize: "0.9rem", textAlign: "center", outline: "none", transition: "border-color 0.2s" }}
                    onFocus={e => e.currentTarget.style.borderColor = "#F2AF3E"}
                    onBlur={(e) => { e.currentTarget.style.borderColor = v.needs_review ? "#f59e0b" : "#f6d2a8"; handleUpdateVariable(v.id, v.type, v.name, v.score); }}
                    onChange={(e) => setVariables(variables.map(x => x.id === v.id ? { ...x, score: parseInt(e.target.value) || 0 } : x))}
                  />

                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", width: "32px", justifyContent: "center" }}>
                    {loadingId === v.id ? (
                      <span style={{ color: "#F2AF3E" }}><Spinner /></span>
                    ) : (
                      <button 
                        onClick={() => handleDeleteVariable(v.id)}
                        title="Hapus Indikator"
                        style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", padding: "4px", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.2s" }}
                      >
                        <TrashIcon />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {variables.filter(v => v.type === "occupation").length === 0 && (
                <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#d9a05b", fontSize: "0.9rem" }}>
                  Belum ada indikator pekerjaan.<br/>Silakan tambah melalui form di atas.
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
