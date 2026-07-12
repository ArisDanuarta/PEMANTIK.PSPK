"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@pemantik/supabase";
import { markPersiapanSelesaiAction, closeAssessmentManuallyAction, type SchoolAssessmentStageRow } from "@/app/actions/stages";
import { Button } from "@pemantik/ui";

export interface StageTimelineProps {
  stages: SchoolAssessmentStageRow[];
  userRole: "community" | "school" | "teacher" | "super_admin";
  onRefresh?: () => void;
}

const STAGE_ORDER = [
  { key: "persiapan_akun", label: "Persiapan Akun", desc: "Verifikasi data & akun guru/siswa" },
  { key: "pengajuan_fase", label: "Pengajuan Fase", desc: "Menunggu persetujuan Super Admin" },
  { key: "proses_asesmen", label: "Proses Asesmen", desc: "Anak mengerjakan ujian di kelas" },
  { key: "intervensi", label: "Intervensi", desc: "Analisis & pendampingan sasaran" },
  { key: "selesai", label: "Selesai", desc: "Siklus asesmen selesai" },
];

export default function StageTimeline({ stages, userRole, onRefresh }: StageTimelineProps) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");

  // Realtime subscription untuk auto-refresh saat ada perubahan stage
  useEffect(() => {
    const supabase = createBrowserClient();
    const channel = supabase
      .channel("stage_timeline_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "school_assessment_stages",
        },
        () => {
          router.refresh();
          if (onRefresh) onRefresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router, onRefresh]);

  const handleMarkPersiapan = async (schoolId: string, phase: string, stageId?: string) => {
    try {
      setLoadingId(stageId || schoolId);
      setErrorMessage(null);
      const res = await markPersiapanSelesaiAction(schoolId, phase);
      if (!res.success) {
        setErrorMessage(res.error || "Gagal menandai persiapan selesai");
      } else {
        router.refresh();
        if (onRefresh) onRefresh();
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Terjadi kesalahan sistem");
    } finally {
      setLoadingId(null);
    }
  };

  const handleCloseAssessment = async (stageId: string) => {
    if (!confirm("Apakah Anda yakin ingin menutup proses asesmen untuk sekolah ini sekarang dan langsung masuk ke tahap Intervensi?")) {
      return;
    }
    try {
      setLoadingId(stageId);
      setErrorMessage(null);
      const res = await closeAssessmentManuallyAction(stageId);
      if (!res.success) {
        setErrorMessage(res.error || "Gagal menutup asesmen");
      } else {
        router.refresh();
        if (onRefresh) onRefresh();
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Terjadi kesalahan sistem");
    } finally {
      setLoadingId(null);
    }
  };

  const filteredStages = stages.filter((s) => {
    const matchesSearch =
      (s.schools?.name || s.school_id).toLowerCase().includes(searchFilter.toLowerCase()) ||
      (s.schools?.npsn || "").toLowerCase().includes(searchFilter.toLowerCase()) ||
      s.phase.toLowerCase().includes(searchFilter.toLowerCase());
    
    const matchesStage = stageFilter === "all" || s.current_stage === stageFilter;
    return matchesSearch && matchesStage;
  });

  const getStageIndex = (stageKey: string) => {
    return STAGE_ORDER.findIndex((s) => s.key === stageKey);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {errorMessage && (
        <div style={{
          padding: "0.875rem 1rem",
          backgroundColor: "#fef2f2",
          border: "1px solid #fee2e2",
          borderRadius: "0.5rem",
          color: "#991b1b",
          fontSize: "0.875rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <span>⚠️ {errorMessage}</span>
          <button
            onClick={() => setErrorMessage(null)}
            style={{ border: "none", background: "transparent", cursor: "pointer", color: "#991b1b", fontWeight: "bold" }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: "0.5rem", flex: 1, minWidth: "250px" }}>
          <input
            type="text"
            placeholder="Cari sekolah, NPSN, atau Fase..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            style={{
              flex: 1,
              padding: "0.625rem 0.875rem",
              borderRadius: "0.5rem",
              border: "1px solid #d1d5db",
              fontSize: "0.875rem",
              outline: "none"
            }}
          />
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            style={{
              padding: "0.625rem 0.875rem",
              borderRadius: "0.5rem",
              border: "1px solid #d1d5db",
              fontSize: "0.875rem",
              backgroundColor: "white",
              color: "#374151",
              cursor: "pointer"
            }}
          >
            <option value="all">Semua Tahap ({stages.length})</option>
            {STAGE_ORDER.map((st) => {
              const count = stages.filter((s) => s.current_stage === st.key).length;
              return (
                <option key={st.key} value={st.key}>
                  {st.label} ({count})
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* Stage Timeline Cards */}
      {filteredStages.length === 0 ? (
        <div style={{
          padding: "3rem",
          textAlign: "center",
          backgroundColor: "#f9fafb",
          borderRadius: "0.75rem",
          border: "1px dashed #e5e7eb",
          color: "#6b7280"
        }}>
          <p style={{ margin: 0, fontSize: "0.95rem" }}>Tidak ada data alur asesmen sekolah yang ditemukan.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {filteredStages.map((stageRow) => {
            const currentIdx = getStageIndex(stageRow.current_stage);
            const isPersiapan = stageRow.current_stage === "persiapan_akun";
            const isProses = stageRow.current_stage === "proses_asesmen";
            const isIntervensi = stageRow.current_stage === "intervensi";
            const isSelesai = stageRow.current_stage === "selesai";
            const hasCommunity = Boolean(stageRow.schools?.community_id || stageRow.community_id);

            return (
              <div
                key={stageRow.id}
                style={{
                  backgroundColor: "white",
                  borderRadius: "0.75rem",
                  border: "1px solid #e5e7eb",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                  padding: "1.25rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "1.25rem",
                  transition: "all 0.2s ease"
                }}
              >
                {/* Header: Nama Sekolah + Fase */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.5rem" }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 600, color: "#111827" }}>
                      {stageRow.schools?.name || "Nama Sekolah Tidak Tersedia"}
                    </h4>
                    <span style={{ fontSize: "0.8rem", color: "#6b7280" }}>
                      NPSN: {stageRow.schools?.npsn || "-"} • Diperbarui: {new Date(stageRow.stage_updated_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{
                      padding: "0.25rem 0.75rem",
                      borderRadius: "9999px",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      backgroundColor: "#e0f2fe",
                      color: "#0369a1"
                    }}>
                      Fase {stageRow.phase}
                    </span>
                  </div>
                </div>

                {/* Stepper Visual Bar */}
                <div style={{ position: "relative", paddingTop: "0.5rem", paddingBottom: "0.5rem" }}>
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(5, 1fr)",
                    gap: "0.5rem",
                    position: "relative"
                  }}>
                    {STAGE_ORDER.map((st, idx) => {
                      const isCompleted = idx < currentIdx || (idx === currentIdx && isSelesai);
                      const isCurrent = idx === currentIdx && !isSelesai;

                      let stepBgColor = "#f3f4f6";
                      let stepTextColor = "#6b7280";
                      let stepBorderColor = "transparent";

                      if (isCompleted) {
                        stepBgColor = "#dcfce7";
                        stepTextColor = "#15803d";
                      } else if (isCurrent) {
                        stepBgColor = "#eff6ff";
                        stepTextColor = "#1d4ed8";
                        stepBorderColor = "#3b82f6";
                      }

                      return (
                        <div
                          key={st.key}
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            textAlign: "center",
                            padding: "0.5rem 0.25rem",
                            borderRadius: "0.5rem",
                            backgroundColor: stepBgColor,
                            border: `1.5px solid ${stepBorderColor}`,
                            position: "relative"
                          }}
                        >
                          <div style={{
                            width: "22px",
                            height: "22px",
                            borderRadius: "50%",
                            backgroundColor: isCompleted ? "#16a34a" : isCurrent ? "#2563eb" : "#e5e7eb",
                            color: "white",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "0.7rem",
                            fontWeight: "bold",
                            marginBottom: "0.35rem"
                          }}>
                            {isCompleted ? "✓" : idx + 1}
                          </div>
                          <span style={{ fontSize: "0.75rem", fontWeight: isCurrent ? 700 : 500, color: stepTextColor, lineHeight: 1.2 }}>
                            {st.label}
                          </span>
                          <span style={{ fontSize: "0.65rem", color: "#9ca3af", marginTop: "0.2rem", display: "none" }}>
                            {st.desc}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Actions & Information Bar */}
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "0.75rem",
                  paddingTop: "0.75rem",
                  borderTop: "1px solid #f3f4f6"
                }}>
                  <div style={{ fontSize: "0.85rem", color: "#4b5563" }}>
                    {hasCommunity && userRole === "school" && (
                      <div style={{ color: "#0369a1", fontWeight: 600, marginBottom: "0.25rem" }}>
                        🔗 Tersinkronisasi dengan Komunitas (Kendali alur tahap 1, 2, 3 diatur oleh Komunitas)
                      </div>
                    )}
                    {!hasCommunity && userRole === "school" && (
                      <div style={{ color: "#15803d", fontWeight: 600, marginBottom: "0.25rem" }}>
                        🏛️ Sekolah Independen (Kendali penuh alur asesmen pada Sekolah)
                      </div>
                    )}
                    {isPersiapan && <span>👉 Silakan verifikasi data akun sekolah ini sebelum melanjutkan ke tahap pengajuan.</span>}
                    {stageRow.current_stage === "pengajuan_fase" && <span>⏳ Menunggu pengajuan dari Akses Ujian / persetujuan Super Admin.</span>}
                    {isProses && <span>📖 Ujian sedang berlangsung. Sistem otomatis masuk ke intervensi saat masa berlaku habis.</span>}
                    {isIntervensi && <span>🎯 Sekolah wajib mengisi form intervensi kualitatif di menu Intervensi.</span>}
                    {isSelesai && <span>✅ Seluruh rangkaian asesmen & intervensi pada fase ini telah tuntas.</span>}
                  </div>

                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    {/* Action 1: Persiapan Akun Selesai (Hanya Komunitas atau Sekolah Independen) */}
                    {isPersiapan && (userRole === "community" || (!hasCommunity && userRole === "school")) && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleMarkPersiapan(stageRow.school_id, stageRow.phase, stageRow.id)}
                        disabled={loadingId === stageRow.id}
                      >
                        {loadingId === stageRow.id ? "Memproses..." : "Tandai Persiapan Selesai ✓"}
                      </Button>
                    )}

                    {/* Action 2: Tutup Asesmen Sekarang (dari proses_asesmen - Hanya Komunitas, Sekolah Independen, atau Super Admin) */}
                    {isProses && (userRole === "community" || (!hasCommunity && userRole === "school") || userRole === "super_admin") && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleCloseAssessment(stageRow.id)}
                        disabled={loadingId === stageRow.id}
                        style={{ borderColor: "#d97706", color: "#b45309", backgroundColor: "#fffbeb" }}
                      >
                        {loadingId === stageRow.id ? "Menutup..." : "Tutup Asesmen Sekarang ⏭️"}
                      </Button>
                    )}

                    {/* Action 3: Isi/Lihat Intervensi (Semua role dapat mengisi di rolenya masing-masing saat tahap Intervensi) */}
                    {(isIntervensi || isSelesai) && (
                      <Button
                        variant={isIntervensi ? "primary" : "secondary"}
                        size="sm"
                        onClick={() => {
                          const targetPath = userRole === "community" 
                            ? `/komunitas/intervensi?schoolId=${stageRow.school_id}&phase=${stageRow.phase}&stageId=${stageRow.id}`
                            : userRole === "school" || userRole === "teacher"
                            ? `/sekolah/intervensi?phase=${stageRow.phase}`
                            : `/super-admin/intervensi?schoolId=${stageRow.school_id}`;
                          router.push(targetPath);
                        }}
                      >
                        {isIntervensi ? "💡 Isi Form Intervensi Sekolah/Komunitas" : "📋 Lihat Laporan Intervensi"}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
