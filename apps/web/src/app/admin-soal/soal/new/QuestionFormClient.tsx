"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createQuestion, updateQuestion, uploadQuestionMedia } from "@/app/actions/questions";
import { getQuestionCategories, getQuestionLevels } from "@/app/actions/questionCategories";
import { Badge, useToast } from "@pemantik/ui";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getYouTubeId(url: string) {
  const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type DragDropSubtype = "fill_blank" | "sorting" | "matching";

interface ImageOption {
  url: string;
  label: string;
  uploading: boolean;
}

interface DragDropItem {
  id: string;
  text: string;
}

interface MatchPair {
  id: string;
  left: string;
  right: string;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Reusable upload-or-url field */
function MediaField({
  label, hint, value, onChange, accept, onUpload, uploading,
}: {
  label: string; hint?: string; value: string;
  onChange: (v: string) => void;
  accept: string; onUpload: (f: File) => void; uploading: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      <label className="form-label" style={{ fontWeight: 600 }}>{label}</label>
      <div style={{ display: "flex", gap: "0.75rem" }}>
        <input
          type="text" className="form-input"
          placeholder="https://... (URL langsung)"
          style={{ flex: 1 }} value={value}
          onChange={e => onChange(e.target.value)}
        />
        <label className="btn btn-outline" style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", whiteSpace: "nowrap" }}>
          {uploading ? "Mengunggah..." : "Upload File"}
          <input type="file" style={{ display: "none" }} accept={accept} disabled={uploading}
            onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f); }} />
        </label>
      </div>
      {hint && <small style={{ color: "var(--color-gray-500)" }}>{hint}</small>}
      {value && accept.startsWith("image") && (
        <img src={value} alt="preview" style={{ maxHeight: "80px", borderRadius: "6px", objectFit: "cover", marginTop: "0.25rem" }} />
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function QuestionFormClient({ initialData }: { initialData?: any }) {
  const router = useRouter();
  const { success, error } = useToast();

  // ── Mount guard - prevents SSR/client SCALE hydration mismatch ─────────────
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => { setIsMounted(true); }, []);

  // ── Meta state ──────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [questionCode, setQuestionCode] = useState(initialData?.question_code || "");
  const [subjectArea, setSubjectArea] = useState(initialData?.subject_area || "literasi");
  const [questionType, setQuestionType] = useState(initialData?.question_type || "multiple_choice");
  const [categoryId, setCategoryId] = useState("");
  const [levelId, setLevelId] = useState(initialData?.level_id || "");
  const [questionText, setQuestionText] = useState(initialData?.question_text || "");

  // ── FIX: use question_image_url from DB schema, not media_url ──────────────
  const [mediaUrl, setMediaUrl] = useState(
    initialData?.question_audio_url ||
    initialData?.question_video_url ||
    initialData?.question_image_url ||
    ""
  );

  const [explanation, setExplanation] = useState(initialData?.explanation || "");
  const [categories, setCategories] = useState<any[]>([]);
  const [levels, setLevels] = useState<any[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingLevels, setLoadingLevels] = useState(false);

  // ── Multiple Choice ─────────────────────────────────────────────────────────
  const [mcOptions, setMcOptions] = useState<string[]>(["", "", ""]);
  const [mcCorrectIndex, setMcCorrectIndex] = useState(0);

  // ── Image Choice ────────────────────────────────────────────────────────────
  const [imgOptions, setImgOptions] = useState<ImageOption[]>([
    { url: "", label: "", uploading: false },
    { url: "", label: "", uploading: false },
    { url: "", label: "", uploading: false },
  ]);
  const [imgCorrectIndex, setImgCorrectIndex] = useState(0);

  // ── Drag & Drop ─────────────────────────────────────────────────────────────
  const [dragSubtype, setDragSubtype] = useState<DragDropSubtype>("fill_blank");
  const [fbSentence, setFbSentence] = useState("");
  const [fbWordBank, setFbWordBank] = useState<DragDropItem[]>([
    { id: "w1", text: "" }, { id: "w2", text: "" }, { id: "w3", text: "" },
  ]);
  const [fbCorrectOrder, setFbCorrectOrder] = useState<string[]>([]);
  const [sortItems, setSortItems] = useState<DragDropItem[]>([
    { id: "s1", text: "" }, { id: "s2", text: "" }, { id: "s3", text: "" },
  ]);
  const [matchPairs, setMatchPairs] = useState<MatchPair[]>([
    { id: "m1", left: "", right: "" },
    { id: "m2", left: "", right: "" },
    { id: "m3", left: "", right: "" },
  ]);

  // ── Audio / Video Question ──────────────────────────────────────────────────
  const [avOptions, setAvOptions] = useState<string[]>(["", "", ""]);
  const [avCorrectIndex, setAvCorrectIndex] = useState(0);

  // ── Voice Recording ─────────────────────────────────────────────────────────
  const [vrTargetText, setVrTargetText] = useState("");
  const [vrThreshold, setVrThreshold] = useState(80);

  // ─── Data loading & Initial Data Parsing ─────────────────────────────────────

  useEffect(() => {
    if (initialData) {
      if (initialData.question_type === "multiple_choice" && initialData.options) {
        setMcOptions(initialData.options);
        const idx = initialData.options.findIndex((o: any) => o === initialData.correct_answer);
        if (idx !== -1) setMcCorrectIndex(idx);
      } else if (initialData.question_type === "image_choice" && initialData.options) {
        setImgOptions(initialData.options.map((o: any) => ({ ...o, uploading: false })));
        setImgCorrectIndex(initialData.correct_answer?.index ?? 0);
      } else if (initialData.question_type === "audio_question" || initialData.question_type === "video_question") {
        if (initialData.options) {
          setAvOptions(initialData.options);
          const idx = initialData.options.findIndex((o: any) => o === initialData.correct_answer);
          if (idx !== -1) setAvCorrectIndex(idx);
        }
      } else if (initialData.question_type === "drag_drop" && initialData.options) {
        const subtype = initialData.options.subtype || "fill_blank";
        setDragSubtype(subtype);
        if (subtype === "fill_blank") {
          setFbSentence(initialData.options.sentence || "");
          if (initialData.options.word_bank) setFbWordBank(initialData.options.word_bank);
        } else if (subtype === "sorting") {
          if (initialData.options.items) setSortItems(initialData.options.items);
        } else if (subtype === "matching") {
          if (initialData.options.pairs) setMatchPairs(initialData.options.pairs);
        }
      } else if (initialData.question_type === "voice_recording" && initialData.correct_answer) {
        setVrTargetText(initialData.correct_answer.target_text || "");
        setVrThreshold(initialData.correct_answer.threshold_pct || 80);
      }
    }
  }, [initialData]);

  useEffect(() => {
    async function loadCategories() {
      setLoadingCategories(true);
      const res = await getQuestionCategories(subjectArea);
      if (res.success && res.data) {
        setCategories(res.data);
        if (initialData?.question_levels?.category_id) {
          setCategoryId(initialData.question_levels.category_id);
        } else if (res.data.length > 0 && !categoryId) {
          setCategoryId(res.data[0].id);
        } else if (res.data.length === 0) {
          setCategoryId("");
        }
        if (res.data.length === 0) { setLevels([]); setLevelId(""); }
      }
      setLoadingCategories(false);
    }
    loadCategories();
  }, [subjectArea]);

  useEffect(() => {
    async function loadLevels() {
      if (!categoryId) return;
      setLoadingLevels(true);
      const res = await getQuestionLevels(categoryId);
      if (res.success && res.data) {
        setLevels(res.data);
        if (initialData?.level_id && res.data.find((l: any) => l.id === initialData.level_id)) {
          setLevelId(initialData.level_id);
        } else if (res.data.length > 0 && !levelId) {
          setLevelId(res.data[0].id);
        } else if (res.data.length === 0) {
          setLevelId("");
        }
      }
      setLoadingLevels(false);
    }
    loadLevels();
  }, [categoryId]);

  // ─── Upload helper ─────────────────────────────────────────────────────────

  const uploadFile = async (file: File): Promise<string | null> => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await uploadQuestionMedia(formData);
    if (res.success && res.url) return res.url;
    error("Gagal Unggah", res.error || "Gagal mengunggah file");
    return null;
  };

  const handleMainMediaUpload = async (file: File) => {
    setUploading(true);
    const url = await uploadFile(file);
    setUploading(false);
    if (url) { setMediaUrl(url); success("Berhasil", "File berhasil diunggah"); }
  };

  const handleImgOptionUpload = async (index: number, file: File) => {
    setImgOptions(prev => prev.map((o, i) => i === index ? { ...o, uploading: true } : o));
    const url = await uploadFile(file);
    setImgOptions(prev => prev.map((o, i) => i === index ? { ...o, url: url ?? o.url, uploading: false } : o));
    if (url) success("Berhasil", `Gambar opsi ${index + 1} diunggah`);
  };

  // ─── Multiple choice helpers ───────────────────────────────────────────────

  const updateMcOption = (i: number, v: string) =>
    setMcOptions(prev => prev.map((o, idx) => idx === i ? v : o));
  const addMcOption = () => setMcOptions(prev => [...prev, ""]);
  const removeMcOption = (i: number) => {
    if (mcOptions.length <= 2) return error("Validasi", "Minimal 2 opsi");
    setMcOptions(prev => prev.filter((_, idx) => idx !== i));
    if (mcCorrectIndex >= mcOptions.length - 1) setMcCorrectIndex(0);
  };

  const updateAvOption = (i: number, v: string) =>
    setAvOptions(prev => prev.map((o, idx) => idx === i ? v : o));
  const addAvOption = () => setAvOptions(prev => [...prev, ""]);
  const removeAvOption = (i: number) => {
    if (avOptions.length <= 2) return error("Validasi", "Minimal 2 opsi");
    setAvOptions(prev => prev.filter((_, idx) => idx !== i));
    if (avCorrectIndex >= avOptions.length - 1) setAvCorrectIndex(0);
  };

  const addImgOption = () => setImgOptions(prev => [...prev, { url: "", label: "", uploading: false }]);
  const removeImgOption = (i: number) => {
    if (imgOptions.length <= 2) return error("Validasi", "Minimal 2 opsi");
    setImgOptions(prev => prev.filter((_, idx) => idx !== i));
    if (imgCorrectIndex >= imgOptions.length - 1) setImgCorrectIndex(0);
  };

  const addFbWord = () => setFbWordBank(prev => [...prev, { id: `w${Date.now()}`, text: "" }]);
  const removeFbWord = (id: string) => setFbWordBank(prev => prev.filter(w => w.id !== id));
  const updateFbWord = (id: string, text: string) =>
    setFbWordBank(prev => prev.map(w => w.id === id ? { ...w, text } : w));

  const addSortItem = () => setSortItems(prev => [...prev, { id: `s${Date.now()}`, text: "" }]);
  const removeSortItem = (id: string) => setSortItems(prev => prev.filter(s => s.id !== id));
  const updateSortItem = (id: string, text: string) =>
    setSortItems(prev => prev.map(s => s.id === id ? { ...s, text } : s));

  const addMatchPair = () => setMatchPairs(prev => [...prev, { id: `m${Date.now()}`, left: "", right: "" }]);
  const removeMatchPair = (id: string) => setMatchPairs(prev => prev.filter(p => p.id !== id));
  const updateMatchPair = (id: string, side: "left" | "right", text: string) =>
    setMatchPairs(prev => prev.map(p => p.id === id ? { ...p, [side]: text } : p));

  // ─── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async (isPublished: boolean) => {
    if (!questionCode.trim()) return error("Validasi", "Kode Soal wajib diisi.");
    if (!levelId) return error("Validasi", "Silakan pilih Jenis Soal dan Level terlebih dahulu.");
    setLoading(true);

    const payload: any = {
      question_code: questionCode.trim(),
      subject_area: subjectArea,
      question_type: questionType,
      level_id: levelId,
      question_text: questionText,
      explanation,
      is_published: isPublished,
    };

    if (questionType === "audio_question") {
      payload.question_audio_url = mediaUrl;
    } else if (questionType === "video_question") {
      payload.question_video_url = mediaUrl;
    } else {
      payload.question_image_url = mediaUrl;
    }

    switch (questionType) {
      case "multiple_choice":
        payload.options = mcOptions;
        payload.correct_answer = mcOptions[mcCorrectIndex];
        break;

      case "image_choice":
        payload.options = imgOptions.map(o => ({ url: o.url, label: o.label }));
        payload.correct_answer = { index: imgCorrectIndex, url: imgOptions[imgCorrectIndex]?.url };
        break;

      case "audio_question":
        payload.options = avOptions;
        payload.correct_answer = avOptions[avCorrectIndex];
        break;

      case "video_question":
        payload.options = avOptions;
        payload.correct_answer = avOptions[avCorrectIndex];
        break;

      case "drag_drop":
        payload.options = (() => {
          if (dragSubtype === "fill_blank") return { subtype: "fill_blank", sentence: fbSentence, word_bank: fbWordBank };
          if (dragSubtype === "sorting") return { subtype: "sorting", items: sortItems };
          return { subtype: "matching", pairs: matchPairs };
        })();
        payload.correct_answer = (() => {
          if (dragSubtype === "fill_blank") return { order: fbWordBank.map(w => w.id) };
          if (dragSubtype === "sorting") return { order: sortItems.map(s => s.id) };
          return { pairs: matchPairs.map(p => ({ id: p.id, left: p.left, right: p.right })) };
        })();
        break;

      case "voice_recording":
        payload.options = [];
        payload.correct_answer = {
          target_text: vrTargetText,
          threshold_pct: vrThreshold,
        };
        break;

      default:
        payload.options = [];
        payload.correct_answer = null;
    }

    let res;
    if (initialData?.id) {
      res = await updateQuestion(initialData.id, payload);
    } else {
      res = await createQuestion(payload);
    }
    setLoading(false);

    if (res.success) {
      success("Berhasil", `Soal berhasil ${initialData?.id ? 'diperbarui' : 'disimpan'}!`);
      router.push("/admin-soal/soal");
    } else {
      error("Gagal Menyimpan", res.error || `Gagal ${initialData?.id ? 'memperbarui' : 'menyimpan'} soal`);
    }
  };

  // ─── Mobile Preview ────────────────────────────────────────────────────────
  // FIX: Skala diturunkan ke 0.72 agar phone (320×640) muat dalam kolom 260px
  // tanpa terpotong. Rumus: PHONE_W * SCALE = 320 * 0.72 = 230px < 260px ✓
  // PHONE_H * SCALE = 640 * 0.72 = 461px - jauh lebih kecil dari viewport.
  const renderMobilePreview = () => {
    const ytId = getYouTubeId(mediaUrl);
    const selectedLevel = levels.find(l => l.id === levelId);

    const SCALE = 0.82;
    const PHONE_W = 320;
    const PHONE_H = 640;
    const accent = subjectArea === "literasi" ? "#0874aa" : "#102e50";
    const accentBg = subjectArea === "literasi" ? "#eef8ff" : "#eef2ff";

    const renderPreviewAnswers = () => {
      switch (questionType) {
        case "multiple_choice":
          return (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {mcOptions.map((opt, i) => (
                <div key={i} style={{ padding: "0.625rem 0.875rem", border: `2px solid ${i === mcCorrectIndex ? accent : "#e0e0e0"}`, borderRadius: "10px", backgroundColor: i === mcCorrectIndex ? accentBg : "#fff", display: "flex", alignItems: "center", gap: "0.625rem" }}>
                  <div style={{ width: "18px", height: "18px", borderRadius: "50%", border: i === mcCorrectIndex ? `5px solid ${accent}` : "2px solid #ccc", flexShrink: 0 }} />
                  <span style={{ fontSize: "0.8rem", fontWeight: i === mcCorrectIndex ? 600 : 400, color: i === mcCorrectIndex ? accent : "#333" }}>{opt || `Opsi ${i + 1}`}</span>
                </div>
              ))}
            </div>
          );

        case "image_choice":
          return (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
              {imgOptions.map((opt, i) => (
                <div key={i} style={{ border: `2px solid ${i === imgCorrectIndex ? accent : "#e0e0e0"}`, borderRadius: "10px", overflow: "hidden", backgroundColor: i === imgCorrectIndex ? accentBg : "#f8f9fa" }}>
                  {opt.url
                    ? <img src={opt.url} alt={opt.label || `Opsi ${i+1}`} style={{ width: "100%", height: "60px", objectFit: "cover", display: "block" }} />
                    : <div style={{ height: "60px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", color: "#adb5bd" }}>Gambar {i+1}</div>}
                  {opt.label && <div style={{ fontSize: "0.65rem", textAlign: "center", padding: "0.25rem", fontWeight: i === imgCorrectIndex ? 600 : 400 }}>{opt.label}</div>}
                </div>
              ))}
            </div>
          );

        case "audio_question":
          return (
            <>
              <div style={{ background: "#f0f0f0", borderRadius: "8px", padding: "0.5rem", marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ fontSize: "1rem" }}>🎵</span>
                <span style={{ fontSize: "0.7rem", color: "#555" }}>Dengarkan audio, lalu pilih jawaban</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {avOptions.map((opt, i) => (
                  <div key={i} style={{ padding: "0.625rem 0.875rem", border: `2px solid ${i === avCorrectIndex ? accent : "#e0e0e0"}`, borderRadius: "10px", backgroundColor: i === avCorrectIndex ? accentBg : "#fff", display: "flex", alignItems: "center", gap: "0.625rem" }}>
                    <div style={{ width: "18px", height: "18px", borderRadius: "50%", border: i === avCorrectIndex ? `5px solid ${accent}` : "2px solid #ccc", flexShrink: 0 }} />
                    <span style={{ fontSize: "0.8rem", fontWeight: i === avCorrectIndex ? 600 : 400 }}>{opt || `Opsi ${i + 1}`}</span>
                  </div>
                ))}
              </div>
            </>
          );

        case "video_question":
          return (
            <>
              <div style={{ background: "#f0f0f0", borderRadius: "8px", padding: "0.5rem", marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ fontSize: "1rem" }}>🎬</span>
                <span style={{ fontSize: "0.7rem", color: "#555" }}>Tonton video, lalu pilih jawaban</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {avOptions.map((opt, i) => (
                  <div key={i} style={{ padding: "0.625rem 0.875rem", border: `2px solid ${i === avCorrectIndex ? accent : "#e0e0e0"}`, borderRadius: "10px", backgroundColor: i === avCorrectIndex ? accentBg : "#fff", display: "flex", alignItems: "center", gap: "0.625rem" }}>
                    <div style={{ width: "18px", height: "18px", borderRadius: "50%", border: i === avCorrectIndex ? `5px solid ${accent}` : "2px solid #ccc", flexShrink: 0 }} />
                    <span style={{ fontSize: "0.8rem", fontWeight: i === avCorrectIndex ? 600 : 400 }}>{opt || `Opsi ${i + 1}`}</span>
                  </div>
                ))}
              </div>
            </>
          );

        case "drag_drop":
          if (dragSubtype === "fill_blank") return (
            <div>
              <div style={{ fontSize: "0.78rem", color: "#333", lineHeight: 1.6, marginBottom: "0.75rem", padding: "0.5rem", background: "#f8f9fa", borderRadius: "6px" }}>
                {fbSentence ? fbSentence.split("___").map((part, i, arr) => (
                  <span key={i}>{part}{i < arr.length - 1 && <span style={{ display: "inline-block", minWidth: "50px", borderBottom: `2px solid ${accent}`, margin: "0 4px" }}>&nbsp;</span>}</span>
                )) : <span style={{ color: "#adb5bd" }}>Kalimat dengan ___ akan muncul di sini</span>}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem" }}>
                {fbWordBank.map(w => (
                  <span key={w.id} style={{ fontSize: "0.72rem", padding: "0.25rem 0.6rem", background: "#fff", border: `1.5px solid ${accent}`, borderRadius: "6px", color: accent, fontWeight: 500 }}>{w.text || "kata"}</span>
                ))}
              </div>
            </div>
          );
          if (dragSubtype === "sorting") return (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
              {sortItems.map((s, i) => (
                <div key={s.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 0.75rem", background: "#f8f9fa", borderRadius: "8px", border: "1.5px solid #dee2e6" }}>
                  <span style={{ fontSize: "0.7rem", color: "#adb5bd", fontWeight: 700 }}>⠿</span>
                  <span style={{ fontSize: "0.75rem" }}>{s.text || `Item ${i + 1}`}</span>
                </div>
              ))}
              <div style={{ fontSize: "0.65rem", color: "#adb5bd", textAlign: "center", marginTop: "0.25rem" }}>Anak akan mengurutkan item di atas</div>
            </div>
          );
          return (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
              {matchPairs.map((p, i) => (
                <div key={p.id} style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: "0.25rem", alignItems: "center" }}>
                  <div style={{ fontSize: "0.72rem", padding: "0.375rem 0.5rem", background: "#f8f9fa", border: "1.5px solid #dee2e6", borderRadius: "6px", textAlign: "center" }}>{p.left || `Kiri ${i+1}`}</div>
                  <span style={{ fontSize: "0.7rem", color: "#adb5bd" }}>↔</span>
                  <div style={{ fontSize: "0.72rem", padding: "0.375rem 0.5rem", background: accentBg, border: `1.5px solid ${accent}`, borderRadius: "6px", textAlign: "center", color: accent }}>{p.right || `Kanan ${i+1}`}</div>
                </div>
              ))}
            </div>
          );

        case "voice_recording":
          return (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem", padding: "0.5rem 0" }}>
              <div style={{ width: "56px", height: "56px", borderRadius: "50%", background: `linear-gradient(135deg, ${accent}, ${accent}99)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", boxShadow: `0 0 0 8px ${accentBg}` }}>🎤</div>
              <div style={{ fontSize: "0.75rem", color: "#555", textAlign: "center" }}>Tekan mikrofon dan bacakan:</div>
              <div style={{ fontSize: "0.85rem", fontWeight: 700, color: accent, textAlign: "center", padding: "0.5rem 1rem", background: accentBg, borderRadius: "8px", border: `1.5px solid ${accent}` }}>
                {vrTargetText || "Teks target akan muncul di sini"}
              </div>
              <div style={{ fontSize: "0.65rem", color: "#adb5bd" }}>Toleransi kemiripan: {vrThreshold}%</div>
            </div>
          );

        default:
          return null;
      }
    };

    return (
      // FIX: wrapper memakai dimensi yang sudah discale agar tidak ada ruang kosong
      // dan overflow tidak terpotong. transformOrigin "top center" memastikan phone
      // terpusat secara horizontal di dalam kolom preview.
      <div style={{
        width: `${PHONE_W * SCALE}px`,
        height: `${PHONE_H * SCALE}px`,
        position: "relative",
        flexShrink: 0,
        margin: "0 auto",
      }}>
        <div style={{
          width: `${PHONE_W}px`,
          height: `${PHONE_H}px`,
          transform: `scale(${SCALE})`,
          transformOrigin: "top left",
          border: "12px solid #1a1a1a",
          borderRadius: "40px",
          backgroundColor: "#fff",
          boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
          overflow: "hidden",
          position: "absolute",
          top: 0,
          left: 0,
          display: "flex",
          flexDirection: "column",
        }}>
          {/* Notch */}
          <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: "110px", height: "22px", backgroundColor: "#1a1a1a", borderBottomLeftRadius: "14px", borderBottomRightRadius: "14px", zIndex: 10 }} />
          {/* Header */}
          <div style={{ backgroundColor: accent, color: "white", padding: "2rem 1rem 0.875rem", textAlign: "center", fontWeight: 700, fontSize: "0.95rem", flexShrink: 0 }}>
            {subjectArea === "literasi" ? "Latihan Literasi" : "Latihan Numerasi"}
          </div>
          {/* Body */}
          <div style={{ padding: "1rem", flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", padding: "0.2rem 0.6rem", borderRadius: "999px", background: "#e9ecef", color: "#495057" }}>Level {selectedLevel?.level_number ?? "0"}</span>
              {selectedLevel?.time_limit_sec && <span style={{ fontSize: "0.72rem", color: "#6c757d" }}>{selectedLevel.time_limit_sec} dtk</span>}
            </div>
            <p style={{ fontSize: "0.9rem", fontWeight: 600, lineHeight: 1.55, color: "#1a1a1a", wordBreak: "break-word", whiteSpace: "pre-wrap", margin: 0 }}>
              {questionText || "Teks pertanyaan akan muncul di sini..."}
            </p>
            {mediaUrl && questionType !== "audio_question" && questionType !== "video_question" && (
              <div style={{ borderRadius: "8px", overflow: "hidden", background: "#f0f0f0" }}>
                {ytId
                  ? <iframe width="100%" height="140" src={`https://www.youtube.com/embed/${ytId}`} title="yt" frameBorder="0" allowFullScreen style={{ display: "block" }} />
                  : <img src={mediaUrl} alt="media" style={{ width: "100%", display: "block", maxHeight: "120px", objectFit: "cover" }} />}
              </div>
            )}
            {mediaUrl && questionType === "audio_question" && (
              <audio key={mediaUrl} src={mediaUrl} controls style={{ width: "100%", display: "block", marginBottom: "0.5rem" }} />
            )}
            {mediaUrl && questionType === "video_question" && (
              ytId
                ? <iframe key={mediaUrl} width="100%" height="140" src={`https://www.youtube.com/embed/${ytId}`} title="yt" frameBorder="0" allowFullScreen style={{ display: "block", borderRadius: "8px", marginBottom: "0.5rem" }} />
                : <video key={mediaUrl} src={mediaUrl} controls style={{ width: "100%", display: "block", borderRadius: "8px", marginBottom: "0.5rem" }} />
            )}
            {renderPreviewAnswers()}
          </div>
        </div>
      </div>
    );
  };

  // ─── Answer section renderer ───────────────────────────────────────────────

  const renderAnswerSection = () => {
    const cardStyle = { padding: "1rem", backgroundColor: "#f8f9fa", borderRadius: "8px", border: "1px solid #e9ecef" };
    const subtypeBtn = (t: DragDropSubtype, label: string) => (
      <button type="button" onClick={() => setDragSubtype(t)}
        style={{ padding: "0.375rem 0.875rem", borderRadius: "6px", border: "1.5px solid", cursor: "pointer", fontSize: "0.8rem", fontWeight: 500,
          borderColor: dragSubtype === t ? "var(--clr-biru)" : "#dee2e6",
          backgroundColor: dragSubtype === t ? "rgba(16,46,80,0.08)" : "#fff",
          color: dragSubtype === t ? "var(--clr-biru)" : "#6c757d" }}>
        {label}
      </button>
    );

    switch (questionType) {

      case "multiple_choice":
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <label className="form-label" style={{ fontWeight: 600 }}>Opsi Jawaban <span style={{ color: "#6c757d", fontWeight: 400, textTransform: "none", fontSize: "0.75rem" }}>- centang radio untuk jawaban benar</span></label>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
              {mcOptions.map((opt, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.5rem", borderRadius: "8px", border: mcCorrectIndex === i ? "1px solid rgba(45,158,95,0.3)" : "1px solid transparent", backgroundColor: mcCorrectIndex === i ? "rgba(45,158,95,0.04)" : "transparent" }}>
                  <input type="radio" name="mc_correct" checked={mcCorrectIndex === i} onChange={() => setMcCorrectIndex(i)} style={{ width: "18px", height: "18px", cursor: "pointer", accentColor: "#2d9e5f" }} />
                  <input type="text" className="form-input" placeholder={`Opsi ${i + 1}`} value={opt} onChange={e => updateMcOption(i, e.target.value)} style={{ flex: 1, borderColor: mcCorrectIndex === i ? "#2d9e5f" : undefined }} />
                  <button type="button" onClick={() => removeMcOption(i)} className="btn btn-outline btn-sm" style={{ color: "var(--clr-merah)", borderColor: "var(--clr-merah)", flexShrink: 0 }}>Hapus</button>
                </div>
              ))}
            </div>
            <button type="button" onClick={addMcOption} className="btn btn-outline btn-sm" style={{ borderStyle: "dashed", alignSelf: "flex-start", marginTop: "0.25rem" }}>+ Tambah Opsi</button>
          </div>
        );

      case "image_choice":
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <label className="form-label" style={{ fontWeight: 600 }}>Opsi Gambar <span style={{ color: "#6c757d", fontWeight: 400, textTransform: "none", fontSize: "0.75rem" }}>- centang radio untuk jawaban benar</span></label>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {imgOptions.map((opt, i) => (
                <div key={i} style={{ display: "flex", gap: "0.875rem", alignItems: "flex-start", padding: "0.875rem", borderRadius: "10px", border: imgCorrectIndex === i ? "1.5px solid rgba(45,158,95,0.4)" : "1.5px solid #e9ecef", backgroundColor: imgCorrectIndex === i ? "rgba(45,158,95,0.03)" : "#fff" }}>
                  <input type="radio" name="img_correct" checked={imgCorrectIndex === i} onChange={() => setImgCorrectIndex(i)} style={{ width: "18px", height: "18px", marginTop: "0.5rem", cursor: "pointer", accentColor: "#2d9e5f" }} />
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <MediaField
                      label={`Gambar Opsi ${i + 1}`}
                      value={opt.url}
                      onChange={url => setImgOptions(prev => prev.map((o, idx) => idx === i ? { ...o, url } : o))}
                      accept="image/*"
                      onUpload={file => handleImgOptionUpload(i, file)}
                      uploading={opt.uploading}
                    />
                    <input type="text" className="form-input" placeholder="Label gambar (opsional)" value={opt.label} onChange={e => setImgOptions(prev => prev.map((o, idx) => idx === i ? { ...o, label: e.target.value } : o))} />
                  </div>
                  <button type="button" onClick={() => removeImgOption(i)} className="btn btn-outline btn-sm" style={{ color: "var(--clr-merah)", borderColor: "var(--clr-merah)", marginTop: "0.25rem", flexShrink: 0 }}>Hapus</button>
                </div>
              ))}
            </div>
            <button type="button" onClick={addImgOption} className="btn btn-outline btn-sm" style={{ borderStyle: "dashed", alignSelf: "flex-start" }}>+ Tambah Opsi Gambar</button>
          </div>
        );

      case "audio_question":
      case "video_question": {
        const isAudio = questionType === "audio_question";
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ ...cardStyle, display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
              <span style={{ fontSize: "1.5rem" }}>{isAudio ? "🎵" : "🎬"}</span>
              <div>
                <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--clr-biru)", marginBottom: "0.25rem" }}>
                  {isAudio ? "File audio di atas adalah soal utama" : "File video di atas adalah soal utama"}
                </div>
                <div style={{ fontSize: "0.78rem", color: "#6c757d" }}>
                  Anak akan {isAudio ? "mendengarkan audio" : "menonton video"} tersebut, lalu memilih jawaban dari opsi di bawah.
                </div>
              </div>
            </div>
            <div>
              <label className="form-label" style={{ fontWeight: 600, marginBottom: "0.5rem", display: "block" }}>Opsi Jawaban Pilihan Ganda <span style={{ color: "#6c757d", fontWeight: 400, textTransform: "none", fontSize: "0.75rem" }}>- centang radio untuk jawaban benar</span></label>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                {avOptions.map((opt, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.5rem", borderRadius: "8px", border: avCorrectIndex === i ? "1px solid rgba(45,158,95,0.3)" : "1px solid transparent", backgroundColor: avCorrectIndex === i ? "rgba(45,158,95,0.04)" : "transparent" }}>
                    <input type="radio" name="av_correct" checked={avCorrectIndex === i} onChange={() => setAvCorrectIndex(i)} style={{ width: "18px", height: "18px", cursor: "pointer", accentColor: "#2d9e5f" }} />
                    <input type="text" className="form-input" placeholder={`Opsi ${i + 1}`} value={opt} onChange={e => updateAvOption(i, e.target.value)} style={{ flex: 1, borderColor: avCorrectIndex === i ? "#2d9e5f" : undefined }} />
                    <button type="button" onClick={() => removeAvOption(i)} className="btn btn-outline btn-sm" style={{ color: "var(--clr-merah)", borderColor: "var(--clr-merah)", flexShrink: 0 }}>Hapus</button>
                  </div>
                ))}
              </div>
              <button type="button" onClick={addAvOption} className="btn btn-outline btn-sm" style={{ borderStyle: "dashed", alignSelf: "flex-start", marginTop: "0.5rem" }}>+ Tambah Opsi</button>
            </div>
          </div>
        );
      }

      case "drag_drop":
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div>
              <label className="form-label" style={{ fontWeight: 600, marginBottom: "0.5rem", display: "block" }}>Sub-tipe Drag & Drop</label>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                {subtypeBtn("fill_blank", "Isi Kalimat (Fill in the Blank)")}
                {subtypeBtn("sorting", "Urutkan (Sorting)")}
                {subtypeBtn("matching", "Pasangkan (Matching)")}
              </div>
            </div>

            {dragSubtype === "fill_blank" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div style={{ ...cardStyle }}>
                  <div style={{ fontSize: "0.78rem", color: "#6c757d", marginBottom: "0.5rem" }}>💡 Gunakan <code style={{ background: "#e9ecef", padding: "0 4px", borderRadius: "3px" }}>___</code> (tiga underscore) untuk menandai posisi blank.</div>
                  <label className="form-label" style={{ fontWeight: 600 }}>Kalimat Soal</label>
                  <input type="text" className="form-input" style={{ marginTop: "0.375rem" }} placeholder='Contoh: "Ibu ___ ke pasar setiap ___"' value={fbSentence} onChange={e => setFbSentence(e.target.value)} />
                </div>
                <div>
                  <label className="form-label" style={{ fontWeight: 600, marginBottom: "0.5rem", display: "block" }}>Bank Kata <span style={{ color: "#6c757d", fontWeight: 400, textTransform: "none", fontSize: "0.75rem" }}>- urutan input = urutan jawaban benar</span></label>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {fbWordBank.map((w, i) => (
                      <div key={w.id} style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                        <span style={{ fontSize: "0.75rem", color: "#adb5bd", width: "20px", textAlign: "right", flexShrink: 0 }}>{i + 1}.</span>
                        <input type="text" className="form-input" placeholder={`Kata ${i + 1}`} value={w.text} onChange={e => updateFbWord(w.id, e.target.value)} style={{ flex: 1 }} />
                        <button type="button" onClick={() => removeFbWord(w.id)} className="btn btn-outline btn-sm" style={{ color: "var(--clr-merah)", borderColor: "var(--clr-merah)", flexShrink: 0 }}>✕</button>
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={addFbWord} className="btn btn-outline btn-sm" style={{ borderStyle: "dashed", marginTop: "0.5rem" }}>+ Tambah Kata</button>
                </div>
              </div>
            )}

            {dragSubtype === "sorting" && (
              <div>
                <div style={{ ...cardStyle, marginBottom: "0.75rem" }}>
                  <div style={{ fontSize: "0.78rem", color: "#6c757d" }}>💡 Masukkan item dalam <strong>urutan yang benar</strong>. Saat ditampilkan ke anak, urutannya akan diacak otomatis.</div>
                </div>
                <label className="form-label" style={{ fontWeight: 600, marginBottom: "0.5rem", display: "block" }}>Item (Urutan Benar)</label>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {sortItems.map((s, i) => (
                    <div key={s.id} style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                      <span style={{ fontSize: "0.8rem", color: "#adb5bd", width: "20px", textAlign: "right", flexShrink: 0 }}>#{i + 1}</span>
                      <input type="text" className="form-input" placeholder={`Item ${i + 1}`} value={s.text} onChange={e => updateSortItem(s.id, e.target.value)} style={{ flex: 1 }} />
                      <button type="button" onClick={() => removeSortItem(s.id)} className="btn btn-outline btn-sm" style={{ color: "var(--clr-merah)", borderColor: "var(--clr-merah)", flexShrink: 0 }}>✕</button>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={addSortItem} className="btn btn-outline btn-sm" style={{ borderStyle: "dashed", marginTop: "0.5rem" }}>+ Tambah Item</button>
              </div>
            )}

            {dragSubtype === "matching" && (
              <div>
                <div style={{ ...cardStyle, marginBottom: "0.75rem" }}>
                  <div style={{ fontSize: "0.78rem", color: "#6c757d" }}>💡 Masukkan pasangan yang benar. Kolom kanan akan diacak saat ditampilkan ke anak.</div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr auto", gap: "0.5rem", alignItems: "center", marginBottom: "0.375rem" }}>
                  <span className="form-label" style={{ textAlign: "center" }}>Kolom Kiri</span>
                  <span />
                  <span className="form-label" style={{ textAlign: "center" }}>Kolom Kanan (Pasangannya)</span>
                  <span />
                </div>
                {matchPairs.map((p, i) => (
                  <div key={p.id} style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr auto", gap: "0.5rem", alignItems: "center", marginBottom: "0.5rem" }}>
                    <input type="text" className="form-input" placeholder={`Kiri ${i + 1}`} value={p.left} onChange={e => updateMatchPair(p.id, "left", e.target.value)} />
                    <span style={{ color: "#adb5bd", textAlign: "center", fontSize: "1rem" }}>↔</span>
                    <input type="text" className="form-input" placeholder={`Kanan ${i + 1}`} value={p.right} onChange={e => updateMatchPair(p.id, "right", e.target.value)} />
                    <button type="button" onClick={() => removeMatchPair(p.id)} className="btn btn-outline btn-sm" style={{ color: "var(--clr-merah)", borderColor: "var(--clr-merah)" }}>✕</button>
                  </div>
                ))}
                <button type="button" onClick={addMatchPair} className="btn btn-outline btn-sm" style={{ borderStyle: "dashed", marginTop: "0.25rem" }}>+ Tambah Pasangan</button>
              </div>
            )}
          </div>
        );

      case "voice_recording":
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ ...cardStyle, display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
              <span style={{ fontSize: "1.5rem" }}>🎤</span>
              <div>
                <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--clr-biru)", marginBottom: "0.25rem" }}>Cara Kerja Voice Recording</div>
                <div style={{ fontSize: "0.78rem", color: "#6c757d", lineHeight: 1.6 }}>
                  Anak merekam suara membaca teks target. Sistem membandingkan dengan <strong>Levenshtein Distance</strong>. Skor ≥ threshold = benar.
                </div>
              </div>
            </div>

            <div>
              <label className="form-label" style={{ fontWeight: 600 }}>Teks Target (Original Word)</label>
              <small style={{ color: "#6c757d", display: "block", marginBottom: "0.375rem" }}>Teks yang harus dibacakan siswa.</small>
              <textarea
                className="form-input"
                rows={3}
                style={{ width: "100%", resize: "vertical" }}
                placeholder='Contoh: "Buku itu ada di atas meja"'
                value={vrTargetText}
                onChange={e => setVrTargetText(e.target.value)}
              />
            </div>

            <div>
              <label className="form-label" style={{ fontWeight: 600 }}>
                Threshold Toleransi: <span style={{ color: "var(--clr-biru)", fontFamily: "monospace" }}>{vrThreshold}%</span>
              </label>
              <small style={{ color: "#6c757d", display: "block", marginBottom: "0.5rem" }}>
                Rekomendasi: 75–85% untuk toleransi ejaan/dialek.
              </small>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <input
                  type="range" min={50} max={100} step={5}
                  value={vrThreshold} onChange={e => setVrThreshold(Number(e.target.value))}
                  style={{ flex: 1, accentColor: "var(--clr-biru)" }}
                />
                <input
                  type="number" className="form-input" min={50} max={100}
                  value={vrThreshold} onChange={e => setVrThreshold(Number(e.target.value))}
                  style={{ width: "72px", textAlign: "center" }}
                />
                <span style={{ fontSize: "0.8rem", color: "#6c757d" }}>%</span>
              </div>
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                {[60, 70, 75, 80, 85, 90].map(v => (
                  <button key={v} type="button" onClick={() => setVrThreshold(v)}
                    style={{ padding: "0.2rem 0.5rem", fontSize: "0.72rem", borderRadius: "4px", border: "1px solid", cursor: "pointer",
                      borderColor: vrThreshold === v ? "var(--clr-biru)" : "#dee2e6",
                      backgroundColor: vrThreshold === v ? "rgba(16,46,80,0.08)" : "#fff",
                      color: vrThreshold === v ? "var(--clr-biru)" : "#6c757d", fontWeight: vrThreshold === v ? 600 : 400 }}>
                    {v}%
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{
      display: "flex",
      gap: "2rem",
      flexWrap: "wrap",
      height: "100%",
      minHeight: 0,
      overflow: "auto",
    }}>

      {/* ── Kolom kiri: HANYA ini yang scroll ── */}
      {/* overflowY: auto → scroll bar muncul di dalam kolom kiri saja.         */}
      {/* Header dan preview (kolom kanan) tidak bergerak sama sekali.           */}
      <div style={{
        flex: "1 1 300px",
        minWidth: 0,
        overflowY: "auto",
        paddingRight: "0.5rem",
        paddingBottom: "2rem",
      }} className="pemantik-scrollbar">

        {/* SECTION 1: Klasifikasi */}
        <div className="card" style={{ padding: "2rem", marginBottom: "2rem" }}>
          <h2 style={{ margin: "0 0 1.5rem 0", fontSize: "1.2rem", fontWeight: 600, borderBottom: "1px solid #eee", paddingBottom: "1rem" }}>
            1. Klasifikasi Soal
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <label className="form-label" style={{ fontWeight: 600 }}>Kode Soal <span style={{ color: "var(--color-danger)" }}>*</span></label>
              <input type="text" className="form-input" placeholder="Misal: LIT-01" value={questionCode} onChange={e => setQuestionCode(e.target.value)} required />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <label className="form-label" style={{ fontWeight: 600 }}>Mata Pelajaran</label>
              <select className="form-input" value={subjectArea} onChange={e => setSubjectArea(e.target.value)}>
                <option value="literasi">Literasi</option>
                <option value="numerasi">Numerasi</option>
              </select>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <label className="form-label" style={{ fontWeight: 600 }}>Tipe Soal</label>
              <select className="form-input" value={questionType} onChange={e => setQuestionType(e.target.value)}>
                <option value="multiple_choice">Pilihan Ganda</option>
                <option value="image_choice">Pilihan Gambar</option>
                <option value="drag_drop">Drag &amp; Drop</option>
                <option value="audio_question">Soal Audio</option>
                <option value="video_question">Soal Video</option>
                <option value="voice_recording">Voice Recording</option>
              </select>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <label className="form-label" style={{ fontWeight: 600 }}>Jenis Soal (Kategori)</label>
              <select className="form-input" value={categoryId} onChange={e => setCategoryId(e.target.value)} disabled={loadingCategories}>
                {loadingCategories && <option>Memuat...</option>}
                {!loadingCategories && categories.length === 0 && <option value="">Belum ada kategori</option>}
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {categories.length === 0 && !loadingCategories && (
                <div style={{ fontSize: "0.8rem", color: "var(--color-danger)" }}>Buat Kategori terlebih dahulu di menu pengaturan.</div>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <label className="form-label" style={{ fontWeight: 600 }}>Level</label>
              <select className="form-input" value={levelId} onChange={e => setLevelId(e.target.value)} disabled={loadingLevels || !categoryId}>
                {loadingLevels && <option>Memuat...</option>}
                {!loadingLevels && levels.length === 0 && <option value="">Belum ada level</option>}
                {levels.map(l => <option key={l.id} value={l.id}>Level {l.level_number}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* SECTION 2: Konten */}
        <div className="card" style={{ padding: "2rem", marginBottom: "2rem" }}>
          <h2 style={{ margin: "0 0 1.5rem 0", fontSize: "1.2rem", fontWeight: 600, borderBottom: "1px solid #eee", paddingBottom: "1rem" }}>
            2. Konten Pertanyaan
          </h2>

          <div style={{ marginBottom: "1.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <label className="form-label" style={{ fontWeight: 600 }}>Teks Pertanyaan</label>
            <textarea className="form-input" style={{ width: "100%", minHeight: "120px", resize: "vertical" }} rows={4}
              placeholder="Tuliskan pertanyaan di sini..." value={questionText} onChange={e => setQuestionText(e.target.value)} />
          </div>

          <MediaField
            label={
              questionType === "audio_question" ? "File Audio Soal (wajib)"
              : questionType === "video_question" ? "File Video Soal (URL YouTube atau upload)"
              : "Media Stimulus (URL YouTube, gambar, audio, video - opsional)"
            }
            hint={
              questionType === "audio_question" ? "Anak akan mendengarkan audio ini sebagai soal utama."
              : questionType === "video_question" ? "Anak akan menonton video ini sebagai soal utama."
              : "Gunakan upload jika media belum ada di internet. Tersimpan di Supabase Storage."
            }
            value={mediaUrl}
            onChange={setMediaUrl}
            accept={
              questionType === "audio_question" ? "audio/*"
              : questionType === "video_question" ? "video/*"
              : "image/*,audio/*,video/*"
            }
            onUpload={handleMainMediaUpload}
            uploading={uploading}
          />
        </div>

        {/* SECTION 3: Jawaban */}
        <div className="card" style={{ padding: "2rem", marginBottom: "2rem" }}>
          <h2 style={{ margin: "0 0 1.5rem 0", fontSize: "1.2rem", fontWeight: 600, borderBottom: "1px solid #eee", paddingBottom: "1rem" }}>
            3. Jawaban &amp; Penjelasan
          </h2>

          {renderAnswerSection()}

          <div style={{ marginTop: "1.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <label className="form-label" style={{ fontWeight: 600 }}>Penjelasan Jawaban (Opsional)</label>
            <textarea className="form-input" style={{ width: "100%", minHeight: "80px", resize: "vertical" }} rows={3}
              placeholder="Tuliskan penjelasan mengapa jawaban tersebut benar..." value={explanation} onChange={e => setExplanation(e.target.value)} />
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
          <button type="button" className="btn btn-outline" onClick={() => handleSubmit(false)} disabled={loading}>
            {loading ? "Menyimpan..." : "Simpan sbg Draft"}
          </button>
          <button type="button" className="btn btn-primary" onClick={() => handleSubmit(true)} disabled={loading}>
            {loading ? "Mempublikasi..." : "Simpan & Publish"}
          </button>
        </div>
      </div>

      {/* ── Kolom kanan: preview - TIDAK scroll, tetap di tempat ── */}
      {/* Karena parent pakai overflow: hidden + height: 100%, kolom ini         */}
      {/* otomatis tingginya sama dengan kolom kiri (area konten).               */}
      {/* overflowY: auto hanya sebagai fallback jika preview lebih tinggi       */}
      {/* dari area - tapi normalnya preview (461px) < tinggi area konten.       */}
      {isMounted && (
        <div style={{
          flex: "1 1 260px",
          maxWidth: "400px",
          position: "relative",
          zIndex: 5,
          overflowY: "auto",
          paddingBottom: "1.5rem",
          paddingTop: "0",
        }} className="pemantik-scrollbar">
          <div style={{
            marginBottom: "0.75rem",
            textAlign: "center",
            fontWeight: 600,
            color: "var(--color-gray-500)",
            textTransform: "uppercase",
            fontSize: "0.75rem",
            letterSpacing: "1px",
          }}>
            Live Preview (Mobile)
          </div>
          {renderMobilePreview()}
        </div>
      )}

    </div>
  );
}