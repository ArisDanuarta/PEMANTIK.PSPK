"use client";

import React, { useState, useEffect, useTransition } from "react";
import { Button, Badge, useToast } from "@pemantik/ui";
import { submitInterventionAction, getAllInterventionTags, type InterventionPayload } from "@/app/actions/interventions";
import { useRouter } from "next/navigation";

interface InterventionFormProps {
  schoolId: string;
  schoolName: string;
  stageId: string;
  phase: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function InterventionForm({
  schoolId,
  schoolName,
  stageId,
  phase,
  onSuccess,
  onCancel,
}: InterventionFormProps) {
  const router = useRouter();
  const [kondisiAwal, setKondisiAwal] = useState("");
  const [upayaDilakukan, setUpayaDilakukan] = useState("");
  const [perubahanSignifikan, setPerubahanSignifikan] = useState("");
  const [alasanBermakna, setAlasanBermakna] = useState("");

  // Tags state
  const [availableTags, setAvailableTags] = useState<{ id: string; name: string }[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [isSubmitting, startTransition] = useTransition();

  const { success: showSuccess, error: showError } = useToast();

  useEffect(() => {
    getAllInterventionTags().then((res) => {
      if (res.success && res.data) {
        setAvailableTags(res.data);
      }
    });
  }, []);

  const handleAddTag = (tagName: string) => {
    const tagsToAdd = tagName.split(",").map(t => t.trim()).filter(Boolean);
    if (tagsToAdd.length === 0) return;

    setSelectedTags(prev => {
      const newSelected = [...prev];
      let changed = false;
      tagsToAdd.forEach(t => {
        if (!newSelected.some((existing) => existing.toLowerCase() === t.toLowerCase())) {
          newSelected.push(t);
          changed = true;
        }
      });
      return changed ? newSelected : prev;
    });
    setTagInput("");
  };

  const handleRemoveTag = (tagName: string) => {
    setSelectedTags(selectedTags.filter((t) => t !== tagName));
  };

  const handleKeyDownTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      handleAddTag(tagInput);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!kondisiAwal.trim() || !upayaDilakukan.trim() || !perubahanSignifikan.trim() || !alasanBermakna.trim()) {
      showError("Peringatan", "Keempat narasi intervensi wajib diisi lengkap.");
      return;
    }
    if (selectedTags.length === 0) {
      showError("Peringatan", "Minimal tambahkan 1 tag/kata kunci intervensi (misal: #numerasi-dasar, #bimbingan-guru).");
      return;
    }

    startTransition(async () => {
      const payload: InterventionPayload = {
        schoolId,
        phase,
        stageId,
        kondisiAwal: kondisiAwal.trim(),
        upayaDilakukan: upayaDilakukan.trim(),
        perubahanSignifikan: perubahanSignifikan.trim(),
        alasanBermakna: alasanBermakna.trim(),
        tagNames: selectedTags,
      };

      const res = await submitInterventionAction(payload);
      if (res.success) {
        showSuccess("Intervensi Berhasil Disimpan & Selesai!", "Data intervensi telah masuk ke Knowledge Graph dan tahap asesmen selesai.");
        router.refresh();
        if (onSuccess) onSuccess();
      } else {
        showError("Gagal Menyimpan Intervensi", res.error || "Terjadi kesalahan pada server.");
      }
    });
  };

  const filteredSuggestions = availableTags.filter(
    (t) =>
      tagInput.trim().length > 0 &&
      t.name.toLowerCase().includes(tagInput.trim().toLowerCase()) &&
      !selectedTags.includes(t.name)
  );

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div style={{ backgroundColor: "#f8fafc", padding: "1rem", borderRadius: "0.75rem", border: "1px solid #e2e8f0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>TARGET INTERVENSI</span>
            <div style={{ fontSize: "1rem", fontWeight: 700, color: "#102e50" }}>{schoolName}</div>
          </div>
          <Badge variant="info">{phase}</Badge>
        </div>
      </div>

      {/* Field 1: Kondisi Awal */}
      <div>
        <label style={{ display: "block", fontSize: "0.88rem", fontWeight: 700, color: "#102e50", marginBottom: "0.25rem" }}>
          1. Ceritakan kondisi awal <span style={{ color: "#ef4444" }}>*</span>
        </label>
        <p style={{ fontSize: "0.8rem", color: "#64748b", margin: "0 0 0.5rem 0" }}>
          Bagaimana kondisi literasi/numerasi murid sebelum upaya ini dilakukan?
        </p>
        <textarea
          rows={3}
          value={kondisiAwal}
          onChange={(e) => setKondisiAwal(e.target.value)}
          placeholder="Jelaskan kondisi awal murid sebelum intervensi dilakukan..."
          style={{ width: "100%", padding: "0.65rem 0.875rem", borderRadius: "0.5rem", border: "1px solid #cbd5e1", fontSize: "0.88rem" }}
          required
        />
      </div>

      {/* Field 2: Upaya Dilakukan */}
      <div>
        <label style={{ display: "block", fontSize: "0.88rem", fontWeight: 700, color: "#102e50", marginBottom: "0.25rem" }}>
          2. Ceritakan upaya yang dilakukan <span style={{ color: "#ef4444" }}>*</span>
        </label>
        <p style={{ fontSize: "0.8rem", color: "#64748b", margin: "0 0 0.5rem 0" }}>
          Apa yang Anda/sekolah/komunitas lakukan untuk meningkatkan literasi dan numerasi murid? Kapan dan di mana upaya itu berlangsung?
        </p>
        <textarea
          rows={3}
          value={upayaDilakukan}
          onChange={(e) => setUpayaDilakukan(e.target.value)}
          placeholder="Jelaskan upaya konkret yang telah dilakukan, waktu, dan tempat pelaksanaannya..."
          style={{ width: "100%", padding: "0.65rem 0.875rem", borderRadius: "0.5rem", border: "1px solid #cbd5e1", fontSize: "0.88rem" }}
          required
        />
      </div>

      {/* Field 3: Perubahan Signifikan */}
      <div>
        <label style={{ display: "block", fontSize: "0.88rem", fontWeight: 700, color: "#102e50", marginBottom: "0.25rem" }}>
          3. Ceritakan perubahan paling signifikan <span style={{ color: "#ef4444" }}>*</span>
        </label>
        <p style={{ fontSize: "0.8rem", color: "#64748b", margin: "0 0 0.5rem 0" }}>
          Menurut pandangan Anda, apa perubahan paling signifikan yang Anda alami atau amati pada murid sejak upaya ini dilakukan? Ceritakan secara utuh, apa yang terjadi dan bagaimana kondisinya sekarang.
        </p>
        <textarea
          rows={3}
          value={perubahanSignifikan}
          onChange={(e) => setPerubahanSignifikan(e.target.value)}
          placeholder="Jelaskan perubahan signifikan yang terlihat pada murid saat ini..."
          style={{ width: "100%", padding: "0.65rem 0.875rem", borderRadius: "0.5rem", border: "1px solid #cbd5e1", fontSize: "0.88rem" }}
          required
        />
      </div>

      {/* Field 4: Alasan Bermakna */}
      <div>
        <label style={{ display: "block", fontSize: "0.88rem", fontWeight: 700, color: "#102e50", marginBottom: "0.25rem" }}>
          4. Mengapa perubahan ini yang paling bermakna? <span style={{ color: "#ef4444" }}>*</span>
        </label>
        <p style={{ fontSize: "0.8rem", color: "#64748b", margin: "0 0 0.5rem 0" }}>
          Dari semua perubahan yang terjadi, mengapa perubahan inilah yang paling penting menurut Anda?
        </p>
        <textarea
          rows={3}
          value={alasanBermakna}
          onChange={(e) => setAlasanBermakna(e.target.value)}
          placeholder="Refleksikan mengapa perubahan ini menjadi yang paling penting dan bermakna..."
          style={{ width: "100%", padding: "0.65rem 0.875rem", borderRadius: "0.5rem", border: "1px solid #cbd5e1", fontSize: "0.88rem" }}
          required
        />
      </div>

      {/* Tag Selector */}
      <div>
        <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#334155", marginBottom: "0.35rem" }}>
          🏷️ Tag &amp; Kata Kunci Intervensi <span style={{ color: "#ef4444" }}>*</span>
        </label>
        <p style={{ fontSize: "0.78rem", color: "#64748b", margin: "0 0 0.5rem 0" }}>
          Ketik kata kunci lalu tekan <kbd style={{ background: "#e2e8f0", padding: "0.1rem 0.3rem", borderRadius: 4 }}>Enter</kbd> atau <kbd style={{ background: "#e2e8f0", padding: "0.1rem 0.3rem", borderRadius: 4 }}>Koma</kbd>. Anda juga bisa menyalin (paste) banyak tag sekaligus.
        </p>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "0.5rem" }}>
          {selectedTags.map((t) => (
            <span
              key={t}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                padding: "0.25rem 0.65rem",
                backgroundColor: "#e0f2fe",
                color: "#0369a1",
                borderRadius: "999px",
                fontSize: "0.8rem",
                fontWeight: 600,
                border: "1px solid #bae6fd",
              }}
            >
              #{t}
              <button
                type="button"
                onClick={() => handleRemoveTag(t)}
                style={{ background: "none", border: "none", color: "#0369a1", cursor: "pointer", fontWeight: 800, padding: 0, lineHeight: 1 }}
              >
                &times;
              </button>
            </span>
          ))}
        </div>

        <div style={{ display: "flex", gap: "0.5rem" }}>
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleKeyDownTag}
            placeholder="Ketik tag misal: Numerasi, Pedagogi Guru..."
            style={{ flex: 1, padding: "0.55rem 0.875rem", borderRadius: "0.5rem", border: "1px solid #cbd5e1", fontSize: "0.88rem" }}
          />
          <Button
            type="button"
            variant="secondary"
            onClick={() => handleAddTag(tagInput)}
            disabled={!tagInput.trim()}
          >
            + Tambah Tag
          </Button>
        </div>

        {/* Suggestion list */}
        {filteredSuggestions.length > 0 && (
          <div style={{ marginTop: "0.5rem", display: "flex", flexWrap: "wrap", gap: "0.35rem", alignItems: "center" }}>
            <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>Rekomendasi tag:</span>
            {filteredSuggestions.slice(0, 8).map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => handleAddTag(st.name)}
                style={{
                  padding: "0.2rem 0.55rem",
                  borderRadius: "0.3rem",
                  border: "1px dashed #cbd5e1",
                  backgroundColor: "#f8fafc",
                  color: "#475569",
                  fontSize: "0.75rem",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                + #{st.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Buttons */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.5rem", borderTop: "1px solid #e2e8f0", paddingTop: "1rem" }}>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Batal
          </Button>
        )}
        <Button
          type="submit"
          style={{ backgroundColor: "#102e50", color: "white" }}
          disabled={isSubmitting || selectedTags.length === 0}
        >
          {isSubmitting ? "⏳ Menyimpan Intervensi..." : "💾 Simpan Intervensi & Selesaikan Tahap"}
        </Button>
      </div>
    </form>
  );
}
