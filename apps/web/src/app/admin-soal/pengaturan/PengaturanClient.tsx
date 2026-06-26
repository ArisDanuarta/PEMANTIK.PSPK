"use client";

import React, { useState, useEffect } from "react";
import { Button, Badge, useToast, useConfirm } from "@pemantik/ui";
import {
  getQuestionCategories,
  getQuestionLevels,
  createQuestionCategory,
  updateQuestionCategory,
  deleteQuestionCategory,
  createQuestionLevel,
  updateQuestionLevel,
  deleteQuestionLevel,
} from "@/app/actions/questionCategories";
import { getQuestions, updateQuestionOrders } from "@/app/actions/questions";

function ReorderModal({ level, onClose }: { level: any, onClose: () => void }) {
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { success, error } = useToast();

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    setLoading(true);
    // Fetch all questions for this level (limit 1000 assuming it fits)
    const res = await getQuestions(1, 1000, { levelId: level.id });
    if (res.success) {
      setQuestions(res.data);
    } else {
      error("Gagal memuat soal: " + res.error);
    }
    setLoading(false);
  };

  const moveQuestion = (index: number, direction: 'up' | 'down') => {
    const newQs = [...questions];
    if (direction === 'up' && index > 0) {
      const temp = newQs[index - 1];
      newQs[index - 1] = newQs[index];
      newQs[index] = temp;
      setQuestions(newQs);
    } else if (direction === 'down' && index < newQs.length - 1) {
      const temp = newQs[index + 1];
      newQs[index + 1] = newQs[index];
      newQs[index] = temp;
      setQuestions(newQs);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const updates = questions.map((q, idx) => ({ id: q.id, order_index: idx + 1 }));
    const res = await updateQuestionOrders(updates);
    setSaving(false);
    if (res.success) {
      success("Urutan soal berhasil disimpan!");
      onClose();
    } else {
      error("Gagal menyimpan: " + res.error);
    }
  };

  const formatAnswer = (q: any) => {
    const ans = q.correct_answer;
    const opts = q.options;
    const type = q.question_type;

    if (!ans) return "-";

    try {
      if (typeof ans === "string") return ans;

      if (type === "drag_drop" && typeof ans === "object") {
        if (opts?.subtype === "matching" && ans.pairs) {
          return ans.pairs.map((p: any) => `${p.left} ➔ ${p.right}`).join(" | ");
        }
        if (opts?.subtype === "sorting" && ans.order && opts.items) {
          return ans.order.map((id: string) => opts.items.find((i: any) => i.id === id)?.text || id).join(" ➔ ");
        }
        if (opts?.subtype === "fill_blank" && ans.order && opts.word_bank) {
          return ans.order.map((id: string) => opts.word_bank.find((w: any) => w.id === id)?.text || id).join(", ");
        }
      }

      if (type === "image_choice" && typeof ans === "object") {
        const label = opts?.[ans.index]?.label;
        return `Gambar ke-${(ans.index ?? 0) + 1}${label ? ` (${label})` : ''}`;
      }

      if (type === "voice_recording" && typeof ans === "object") {
        return `"${ans.target_text}" (Akurasi min: ${ans.threshold_pct}%)`;
      }

      if (Array.isArray(ans)) return ans.join(", ");
      if (typeof ans === "object") return Object.values(ans).join(", ");
      
      return JSON.stringify(ans);
    } catch {
      return "-";
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)', zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
    }}>
      <div className="card" style={{ width: '100%', maxWidth: '700px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e9ecef', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, color: 'var(--clr-biru)' }}>Atur Urutan Soal - Level {level.level_number}</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        
        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ textAlign: 'center', color: '#adb5bd', padding: '2rem' }}>Memuat soal...</div>
          ) : questions.length === 0 ? (
            <div className="empty-state">Belum ada soal di level ini.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {questions.map((q, idx) => (
                <div key={q.id} style={{
                  display: 'flex', alignItems: 'center', gap: '1rem',
                  padding: '0.75rem 1rem', border: '1px solid #e9ecef', borderRadius: 'var(--radius-sm)',
                  background: '#f8f9fa'
                }}>
                  <div style={{ width: '2rem', height: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--clr-biru)', color: '#fff', borderRadius: '50%', fontWeight: 'bold', flexShrink: 0 }}>
                    {idx + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                    <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} dangerouslySetInnerHTML={{ __html: q.question_text || '<i>Soal media/kosong</i>' }} />
                    <div style={{ fontSize: '0.75rem', color: '#198754', marginTop: '0.25rem', fontWeight: 600 }}>
                      Kunci: {formatAnswer(q)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
                    <button 
                      className="btn btn-outline btn-sm" 
                      onClick={() => moveQuestion(idx, 'up')}
                      disabled={idx === 0}
                      title="Geser ke Atas"
                    >
                      ↑
                    </button>
                    <button 
                      className="btn btn-outline btn-sm" 
                      onClick={() => moveQuestion(idx, 'down')}
                      disabled={idx === questions.length - 1}
                      title="Geser ke Bawah"
                    >
                      ↓
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e9ecef', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button className="btn btn-ghost" onClick={onClose}>Batal</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={loading || saving || questions.length === 0}>
            {saving ? "Menyimpan..." : "Simpan Urutan"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PengaturanClient() {
  const [subjectFilter, setSubjectFilter] = useState("literasi");

  // Category State
  const [categories, setCategories] = useState<any[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [creatingCat, setCreatingCat] = useState(false);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState("");

  // Level State
  const [selectedCategory, setSelectedCategory] = useState<any | null>(null);
  const [levels, setLevels] = useState<any[]>([]);
  const [loadingLevels, setLoadingLevels] = useState(false);

  // Add Level form
  const [newLevelNumber, setNewLevelNumber] = useState<number | "">("");
  const [newTimeLimit, setNewTimeLimit] = useState<number | "">("");
  const [newThreshold, setNewThreshold] = useState<number | "">("");
  const [newAccessCode, setNewAccessCode] = useState("");
  const [creatingLevel, setCreatingLevel] = useState(false);

  // Edit Level
  const [editingLevelId, setEditingLevelId] = useState<string | null>(null);
  const [editLevel, setEditLevel] = useState({ levelNumber: 0, timeLimit: 0, threshold: 0, accessCode: "" });

  // Reorder State
  const [reorderLevel, setReorderLevel] = useState<any | null>(null);

  const { success, error } = useToast();
  const { confirm } = useConfirm();

  useEffect(() => {
    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectFilter]);

  const fetchCategories = async () => {
    setLoadingCategories(true);
    setSelectedCategory(null);
    setLevels([]);
    const res = await getQuestionCategories(subjectFilter);
    if (res.success) setCategories(res.data);
    else error("Gagal memuat kategori: " + res.error);
    setLoadingCategories(false);
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    setCreatingCat(true);
    const res = await createQuestionCategory(subjectFilter, newCatName.trim());
    setCreatingCat(false);
    if (res.success) { setNewCatName(""); success("Kategori berhasil ditambahkan!"); fetchCategories(); }
    else error("Gagal menambah kategori: " + res.error);
  };

  const handleUpdateCategory = async (id: string) => {
    if (!editCatName.trim()) return;
    const res = await updateQuestionCategory(id, editCatName.trim());
    if (res.success) {
      success("Kategori diperbarui!");
      setEditingCatId(null);
      fetchCategories();
    } else error("Gagal memperbarui: " + res.error);
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    const ok = await confirm({
      title: "Hapus Kategori",
      description: `Hapus kategori "${name}"? Semua level di dalamnya juga akan terhapus.`,
      confirmLabel: "Ya, Hapus",
      cancelLabel: "Batal",
      variant: "danger",
    });
    if (!ok) return;
    const res = await deleteQuestionCategory(id);
    if (res.success) { success("Kategori dihapus."); fetchCategories(); }
    else error("Gagal menghapus: " + res.error);
  };

  const selectCategory = async (cat: any) => {
    setSelectedCategory(cat);
    setLoadingLevels(true);
    const res = await getQuestionLevels(cat.id);
    if (res.success) setLevels(res.data);
    else error("Gagal memuat level: " + res.error);
    setLoadingLevels(false);
  };

  const handleCreateLevel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory) return;
    if (newLevelNumber === "" || newTimeLimit === "" || newThreshold === "") return;
    setCreatingLevel(true);
    const res = await createQuestionLevel(
      selectedCategory.id,
      Number(newLevelNumber),
      Number(newTimeLimit),
      Number(newThreshold),
      newAccessCode.trim() || undefined
    );
    setCreatingLevel(false);
    if (res.success) {
      setNewLevelNumber(""); setNewTimeLimit(""); setNewThreshold(""); setNewAccessCode("");
      success("Level berhasil ditambahkan!");
      selectCategory(selectedCategory);
    } else error("Gagal menambah level: " + res.error);
  };

  const handleUpdateLevel = async (level: any) => {
    const res = await updateQuestionLevel(
      level.id,
      editLevel.levelNumber,
      editLevel.timeLimit,
      editLevel.threshold,
      editLevel.accessCode || undefined
    );
    if (res.success) {
      success("Level diperbarui!");
      setEditingLevelId(null);
      selectCategory(selectedCategory);
    } else error("Gagal memperbarui level: " + res.error);
  };

  const handleDeleteLevel = async (id: string, num: number) => {
    const ok = await confirm({
      title: "Hapus Level",
      description: `Hapus Level ${num}? Soal yang terhubung ke level ini akan kehilangan referensinya.`,
      confirmLabel: "Ya, Hapus",
      cancelLabel: "Batal",
      variant: "danger",
    });
    if (!ok) return;
    const res = await deleteQuestionLevel(id);
    if (res.success) { success("Level dihapus."); selectCategory(selectedCategory); }
    else error("Gagal menghapus level: " + res.error);
  };

  return (
    <div>
      {reorderLevel && (
        <ReorderModal level={reorderLevel} onClose={() => setReorderLevel(null)} />
      )}
      
      {/* Page header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Pengaturan Kategori &amp; Level</h1>
          <div className="page-breadcrumb">
            <span>Admin Soal</span>
            <span className="page-breadcrumb-sep">›</span>
            <span>Sistem</span>
            <span className="page-breadcrumb-sep">›</span>
            <span>Pengaturan</span>
          </div>
        </div>
      </div>

      {/* Subject Toggle */}
      <div style={{ marginBottom: "1.5rem", display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        <button
          className={`btn btn-md ${subjectFilter === "literasi" ? "btn-primary" : "btn-outline"}`}
          onClick={() => setSubjectFilter("literasi")}
        >
          📖 Literasi
        </button>
        <button
          className={`btn btn-md ${subjectFilter === "numerasi" ? "btn-primary" : "btn-outline"}`}
          onClick={() => setSubjectFilter("numerasi")}
        >
          🔢 Numerasi
        </button>
      </div>

      <div className="content-grid-2" style={{ alignItems: "start" }}>

        {/* ── KOLOM KIRI: KATEGORI ── */}
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid #e9ecef", background: "#f8f9fa" }}>
            <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "var(--clr-biru)" }}>
              Kategori — {subjectFilter === "literasi" ? "Literasi" : "Numerasi"}
            </h2>
            <p style={{ margin: "0.25rem 0 0", fontSize: "0.8rem", color: "#6c757d" }}>
              Klik kategori untuk melihat level di dalamnya
            </p>
          </div>

          {/* Add Category form */}
          <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid #e9ecef" }}>
            <form onSubmit={handleCreateCategory} style={{ display: "flex", gap: "0.5rem" }}>
              <input
                type="text"
                className="form-input"
                placeholder="Nama kategori baru..."
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                style={{ flex: 1 }}
                required
              />
              <button type="submit" disabled={creatingCat || !newCatName.trim()} className="btn btn-primary btn-sm">
                {creatingCat ? "..." : "+ Tambah"}
              </button>
            </form>
          </div>

          {/* Category list */}
          <div style={{ maxHeight: "480px", overflowY: "auto" }}>
            {loadingCategories ? (
              <div style={{ padding: "2rem", textAlign: "center", color: "#adb5bd" }}>Memuat kategori...</div>
            ) : categories.length === 0 ? (
              <div className="empty-state" style={{ padding: "2rem" }}>
                <div className="empty-state-title">Belum ada kategori</div>
                <div className="empty-state-desc">Tambahkan kategori di atas</div>
              </div>
            ) : (
              categories.map((cat) => {
                const isActive = selectedCategory?.id === cat.id;
                const isEditing = editingCatId === cat.id;
                return (
                  <div
                    key={cat.id}
                    style={{
                      borderBottom: "1px solid #f1f3f5",
                      background: isActive ? "rgba(16,46,80,0.04)" : "#fff",
                      borderLeft: `3px solid ${isActive ? "var(--clr-biru)" : "transparent"}`,
                      transition: "all 0.15s",
                    }}
                  >
                    {isEditing ? (
                      <div style={{ padding: "0.75rem 1.25rem", display: "flex", gap: "0.5rem" }}>
                        <input
                          autoFocus
                          type="text"
                          className="form-input"
                          value={editCatName}
                          onChange={(e) => setEditCatName(e.target.value)}
                          style={{ flex: 1 }}
                        />
                        <button className="btn btn-primary btn-sm" onClick={() => handleUpdateCategory(cat.id)}>Simpan</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => setEditingCatId(null)}>Batal</button>
                      </div>
                    ) : (
                      <div
                        style={{ padding: "0.875rem 1.25rem", display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer" }}
                        onClick={() => selectCategory(cat)}
                      >
                        <span style={{ flex: 1, fontWeight: isActive ? 600 : 400, fontSize: "0.875rem", color: "#343a40" }}>
                          {cat.name}
                        </span>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                          onClick={(e) => { e.stopPropagation(); setEditingCatId(cat.id); setEditCatName(cat.name); }}
                          title="Edit kategori"
                        >
                          ✏️
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem", color: "var(--clr-merah)" }}
                          onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat.id, cat.name); }}
                          title="Hapus kategori"
                        >
                          🗑️
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── KOLOM KANAN: LEVEL ── */}
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid #e9ecef", background: "#f8f9fa" }}>
            <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "var(--clr-biru)" }}>
              {selectedCategory ? `Level: ${selectedCategory.name}` : "Pilih Kategori"}
            </h2>
            <p style={{ margin: "0.25rem 0 0", fontSize: "0.8rem", color: "#6c757d" }}>
              {selectedCategory ? "Level yang tersedia dalam kategori ini" : "Pilih kategori di sebelah kiri"}
            </p>
          </div>

          {!selectedCategory ? (
            <div className="empty-state" style={{ padding: "4rem 2rem" }}>
              <div className="empty-state-icon">👈</div>
              <div className="empty-state-title">Pilih Kategori</div>
              <div className="empty-state-desc">Klik kategori di sebelah kiri untuk mengelola levelnya</div>
            </div>
          ) : (
            <div style={{ padding: "1.25rem 1.5rem" }}>

              {/* Add Level form */}
              <div style={{ padding: "1rem", background: "#f8f9fa", borderRadius: "var(--radius-md)", border: "1px solid #e9ecef", marginBottom: "1.5rem" }}>
                <h3 style={{ margin: "0 0 0.75rem", fontSize: "0.9rem", fontWeight: 700, color: "var(--clr-biru)" }}>+ Tambah Level Baru</h3>
                <form onSubmit={handleCreateLevel} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <div className="form-group">
                    <label className="form-label">Nomor Level</label>
                    <input type="number" min="0" className="form-input" value={newLevelNumber} onChange={(e) => setNewLevelNumber(e.target.value ? Number(e.target.value) : "")} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Durasi (Detik)</label>
                    <input type="number" min="1" className="form-input" value={newTimeLimit} onChange={(e) => setNewTimeLimit(e.target.value ? Number(e.target.value) : "")} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Min. Jawaban Benar</label>
                    <input type="number" min="0" className="form-input" value={newThreshold} onChange={(e) => setNewThreshold(e.target.value ? Number(e.target.value) : "")} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Kode Akses (Opsional)</label>
                    <input type="text" className="form-input" value={newAccessCode} onChange={(e) => setNewAccessCode(e.target.value)} placeholder="Misal: L1-A" />
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <button type="submit" className="btn btn-primary btn-md" style={{ width: "100%" }} disabled={creatingLevel}>
                      {creatingLevel ? "Menyimpan..." : "Tambah Level"}
                    </button>
                  </div>
                </form>
              </div>

              {/* Level list */}
              <h3 style={{ margin: "0 0 0.75rem", fontSize: "0.9rem", fontWeight: 700, color: "var(--clr-biru)" }}>Daftar Level</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {loadingLevels ? (
                  <div style={{ padding: "2rem", textAlign: "center", color: "#adb5bd" }}>Memuat level...</div>
                ) : levels.length === 0 ? (
                  <div className="empty-state" style={{ padding: "2rem" }}>
                    <div className="empty-state-title">Belum ada level</div>
                    <div className="empty-state-desc">Tambahkan level di form atas</div>
                  </div>
                ) : (
                  levels.map((l) => {
                    const isEditing = editingLevelId === l.id;
                    return (
                      <div key={l.id} style={{ border: "1px solid #e9ecef", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
                        {isEditing ? (
                          <div style={{ padding: "1rem" }}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "0.75rem" }}>
                              <div className="form-group">
                                <label className="form-label">Nomor Level</label>
                                <input type="number" className="form-input" value={editLevel.levelNumber}
                                  onChange={(e) => setEditLevel((p) => ({ ...p, levelNumber: Number(e.target.value) }))} />
                              </div>
                              <div className="form-group">
                                <label className="form-label">Durasi (dtk)</label>
                                <input type="number" className="form-input" value={editLevel.timeLimit}
                                  onChange={(e) => setEditLevel((p) => ({ ...p, timeLimit: Number(e.target.value) }))} />
                              </div>
                              <div className="form-group">
                                <label className="form-label">Min. Benar</label>
                                <input type="number" className="form-input" value={editLevel.threshold}
                                  onChange={(e) => setEditLevel((p) => ({ ...p, threshold: Number(e.target.value) }))} />
                              </div>
                              <div className="form-group">
                                <label className="form-label">Kode Akses</label>
                                <input type="text" className="form-input" value={editLevel.accessCode}
                                  onChange={(e) => setEditLevel((p) => ({ ...p, accessCode: e.target.value }))} />
                              </div>
                            </div>
                            <div style={{ display: "flex", gap: "0.5rem" }}>
                              <button className="btn btn-primary btn-sm" onClick={() => handleUpdateLevel(l)}>Simpan</button>
                              <button className="btn btn-ghost btn-sm" onClick={() => setEditingLevelId(null)}>Batal</button>
                            </div>
                          </div>
                        ) : (
                          <div style={{ padding: "0.875rem 1rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
                            <div style={{
                              width: 40, height: 40, borderRadius: "var(--radius-md)", flexShrink: 0,
                              background: "rgba(16,46,80,0.07)", display: "flex", flexDirection: "column",
                              alignItems: "center", justifyContent: "center",
                            }}>
                              <span style={{ fontSize: "0.55rem", fontWeight: 600, color: "#6c757d", textTransform: "uppercase" }}>Level</span>
                              <span style={{ fontSize: "1rem", fontWeight: 700, color: "var(--clr-biru)", lineHeight: 1 }}>{l.level_number}</span>
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: "flex", gap: "0.75rem", fontSize: "0.8rem", color: "#495057", flexWrap: "wrap" }}>
                                <span>⏱ {l.time_limit_sec} dtk</span>
                                <span>🎯 Min. {l.passing_threshold} benar</span>
                                {l.access_code && <span>🔑 {l.access_code}</span>}
                              </div>
                            </div>
                            <div style={{ display: "flex", gap: "0.35rem", flexShrink: 0 }}>
                              <button
                                className="btn btn-outline btn-sm"
                                style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                                onClick={() => setReorderLevel(l)}
                                title="Atur Urutan Soal"
                              >📋 Atur Soal</button>
                              <button
                                className="btn btn-outline btn-sm"
                                style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                                onClick={() => {
                                  setEditingLevelId(l.id);
                                  setEditLevel({ levelNumber: l.level_number, timeLimit: l.time_limit_sec, threshold: l.passing_threshold, accessCode: l.access_code || "" });
                                }}
                              >✏️</button>
                              <button
                                className="btn btn-danger btn-sm"
                                style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                                onClick={() => handleDeleteLevel(l.id, l.level_number)}
                              >🗑️</button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
