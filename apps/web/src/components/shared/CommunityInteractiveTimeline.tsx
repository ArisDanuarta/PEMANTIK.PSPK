"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Badge, useToast, useConfirm } from "@pemantik/ui";
import { getInterventionProgress } from "@/app/actions/interventions";
import {
  markPersiapanSelesaiAction,
  bulkMarkPersiapanSelesaiAction,
  closeAssessmentManuallyAction,
  markIntervensiSelesaiAction,
  advanceStageToNewPhaseAction,
  bulkCloseAssessmentAction,
  type SchoolAssessmentStageRow
} from "@/app/actions/stages";

export interface SchoolSummaryForTimeline {
  school_id: string;
  name: string;
  npsn: string | null;
  studentsCount: number;
  teachersCount: number;
  adminsCount?: number;
  classesCount: number;
  phase: string;
  current_stage: string;
  stageId?: string;
  hasFilledIntervention?: boolean;
}

interface CommunityInteractiveTimelineProps {
  stages: SchoolAssessmentStageRow[];
  totalSchools: number;
  schoolsSummary: SchoolSummaryForTimeline[];
}

const TIMELINE_STEPS = [
  {
    stepNumber: 1,
    key: "persiapan_akun",
    shortLabel: "Persiapan Akun",
    title: "Tahap 1: Persiapan Akun & Dapodik",
    description: "Pada tahap awal ini, Komunitas bertugas menginput/mengupload data sekolah, anak (siswa), guru, dan kelas dengan menggunakan data Dapodik di menu Manajemen → Sekolah. Komunitas yang memiliki kendali penuh untuk menekan tombol 'Lanjutkan ke Tahap 2' setelah data terverifikasi (sekolah binaan hanya memantau/subscribe).",
    actionLabel: "Kelola Data Sekolah & Dapodik",
    actionHref: "/komunitas/sekolah",
    color: "#102e50",
  },
  {
    stepNumber: 2,
    key: "pengajuan_fase",
    shortLabel: "Pengajuan Asesmen",
    title: "Tahap 2: Pengajuan Fase Asesmen ke Super Admin",
    description: "Di halaman Akses Ujian, Komunitas menekan tombol 'Pembuatan dan Pengajuan Asesmen' untuk mengisi Nama Fase, tanggal pelaksanaan, serta memilih paket ujian. Hanya Komunitas yang berhak mengajukan (sekolah binaan tidak). Setelah disetujui (ACC) oleh Super Admin, sistem otomatis memindahkan semua sekolah binaan ke Tahap 3 (Proses Asesmen) dan memberikan notifikasi.",
    actionLabel: "Buka Halaman Akses Ujian & Pengajuan",
    actionHref: "/komunitas/akses-ujian",
    color: "#f2af3e",
  },
  {
    stepNumber: 3,
    key: "proses_asesmen",
    shortLabel: "Proses Asesmen",
    title: "Tahap 3: Pelaksanaan & Proses Asesmen",
    description: "Anak-anak mengerjakan asesmen di kelas. Sistem otomatis beralih ke Tahap 4 (Intervensi) apabila rentang waktu validasi yang diajukan telah berakhir. Selain itu, Komunitas juga memiliki kendali untuk menekan tombol 'Tutup Asesmen Sekarang' jika pengerjaan telah selesai lebih awal (disertai dialog konfirmasi pengaman).",
    actionLabel: "Pantau Hasil Ujian Sementara",
    actionHref: "/komunitas/laporan",
    color: "#0874aa",
  },
  {
    stepNumber: 4,
    key: "intervensi",
    shortLabel: "Intervensi",
    title: "Tahap 4: Pencatatan Laporan & Form Intervensi",
    description: "Pada tahap ini, Komunitas mengisi form intervensi kualitatif 4 pertanyaan naratif, dan setiap Sekolah Binaan juga mengisi form intervensi di role mereka masing-masing. Di bawah ini Komunitas dapat memantau status pengisian tiap sekolah binaan. Setelah selesai, hanya Komunitas yang berhak menekan tombol 'Selesai & Lanjut ke Tahap 5'.",
    actionLabel: "Isi Form & Laporan Intervensi",
    actionHref: "/komunitas/intervensi",
    color: "#df632f",
  },
  {
    stepNumber: 5,
    key: "selesai",
    shortLabel: "Selesai & Berikutnya",
    title: "Tahap 5: Selesai & Pengajuan Siklus Berikutnya",
    description: "Seluruh rangkaian asesmen dan intervensi pada fase saat ini telah tuntas dengan sempurna. Komunitas kini siap menekan tombol 'Pengajuan Fase Berikutnya' (misalnya beralih dari Fase 1 ke Fase 2) untuk memulai ulang timeline dari awal bagi siklus baru.",
    actionLabel: "Ajukan Fase Baru Sekarang",
    actionHref: "/komunitas/akses-ujian",
    color: "#2d9e5f",
  },
];

export default function CommunityInteractiveTimeline({
  stages,
  totalSchools,
  schoolsSummary,
}: CommunityInteractiveTimelineProps) {
  const router = useRouter();
  const { success: showSuccess, error: showError } = useToast();
  const { confirm } = useConfirm();

  const computeInitialStepIndex = (stagesList: SchoolAssessmentStageRow[]) => {
    if (!stagesList || stagesList.length === 0) return 0;
    // Prioritaskan stage aktif tertinggi yang masih proses di antara sekolah binaan
    const activeStage = stagesList[0].current_stage;
    const foundIdx = TIMELINE_STEPS.findIndex((t) => t.key === activeStage);
    return foundIdx !== -1 ? foundIdx : 0;
  };

  const uniqueStages = React.useMemo(() => {
    if (!stages) return [];
    const seen = new Set<string>();
    return stages.filter((s) => {
      if (seen.has(s.school_id)) return false;
      seen.add(s.school_id);
      return true;
    });
  }, [stages]);

  const [selectedStepIndex, setSelectedStepIndex] = useState<number>(() => computeInitialStepIndex(uniqueStages));
  const [isPending, startTransition] = useTransition();

  const [progressMap, setProgressMap] = useState<Record<string, { submitted: number; required: number }>>({});

  React.useEffect(() => {
    if (selectedStepIndex === 3) {
      const fetchProgress = async () => {
        const promises = schoolsSummary
          .filter(sc => sc.current_stage === "intervensi" && sc.stageId)
          .map(async sc => {
            const res = await getInterventionProgress(sc.stageId!, sc.school_id, false);
            if (res.success && res.submittedCount !== undefined && res.requiredCount !== undefined) {
               return { id: sc.school_id, progress: { submitted: res.submittedCount, required: res.requiredCount }};
            }
            return null;
          });
          
        const results = await Promise.all(promises);
        const newMap: Record<string, { submitted: number; required: number }> = {};
        results.forEach(r => {
          if (r) newMap[r.id] = r.progress;
        });
        setProgressMap(newMap);
      };
      fetchProgress();
    }
  }, [selectedStepIndex, schoolsSummary]);

  React.useEffect(() => {
    if (uniqueStages.length > 0) {
      setSelectedStepIndex(computeInitialStepIndex(uniqueStages));
    }
  }, [uniqueStages]);

  const currentStep = TIMELINE_STEPS[selectedStepIndex];

  // Hitung jumlah sekolah yang saat ini berada di masing-masing step (hanya stage terbaru per sekolah)
  const getSchoolsInStep = (stepKey: string) => {
    return uniqueStages.filter((s) => s.current_stage === stepKey);
  };

  const schoolsInCurrentStep = getSchoolsInStep(currentStep.key);

  // Status progress untuk indikator timeline: Belum / Proses / Selesai
  const getStepStatus = (index: number) => {
    const stepKey = TIMELINE_STEPS[index].key;
    const countInStep = getSchoolsInStep(stepKey).length;
    if (countInStep > 0) {
      return { label: "Proses", bg: "#fef3c7", color: "#b45309", border: "#f59e0b" };
    }
    const hasSchoolsInLaterSteps = uniqueStages.some((s) => {
      const stepIdx = TIMELINE_STEPS.findIndex((t) => t.key === s.current_stage);
      return stepIdx > index;
    });
    if (hasSchoolsInLaterSteps) {
      return { label: "Selesai", bg: "#dcfce7", color: "#15803d", border: "#22c55e" };
    }
    return { label: "Belum", bg: "#f1f5f9", color: "#64748b", border: "#cbd5e1" };
  };

  const handleMarkPersiapan = async (schoolId: string, phase: string, stageId?: string) => {
    const confirmed = await confirm({
      title: "Konfirmasi Lanjut Tahap 2",
      description: "Apakah Anda yakin data Dapodik untuk sekolah ini sudah lengkap dan diverifikasi?",
      confirmLabel: "Ya, Lanjutkan ke Tahap 2",
      cancelLabel: "Batal",
      variant: "info",
    });
    if (!confirmed) return;

    startTransition(async () => {
      const res = await markPersiapanSelesaiAction(schoolId, phase);
      if (res.success) {
        showSuccess("Persiapan Selesai!", "Sekolah telah dipindahkan ke Tahap Pengajuan Asesmen.");
        router.refresh();
      } else {
        showError("Gagal", res.error || "Gagal menandai persiapan selesai");
      }
    });
  };

  const handleBulkPersiapan = async () => {
    const readySchools = schoolsSummary.filter((s) => s.current_stage === "persiapan_akun");
    if (readySchools.length === 0) return;

    const confirmed = await confirm({
      title: "Lanjutkan Semua ke Tahap 2",
      description: `Apakah Anda yakin data Dapodik untuk seluruh (${readySchools.length}) sekolah binaan yang di tahap persiapan sudah lengkap dan benar?`,
      confirmLabel: "Ya, Lanjutkan Semua",
      cancelLabel: "Batal",
      variant: "info",
    });
    if (!confirmed) return;

    const schoolIds = readySchools.map((s) => s.school_id);
    const phase = readySchools[0]?.phase || "Fase 1";
    startTransition(async () => {
      const res = await bulkMarkPersiapanSelesaiAction(schoolIds, phase);
      if (res.success) {
        showSuccess("Berhasil!", `${readySchools.length} sekolah berhasil dipindahkan ke Tahap Pengajuan Asesmen.`);
        router.refresh();
      } else {
        showError("Gagal", res.error || "Gagal memproses bulk transisi");
      }
    });
  };

  const handleCloseAssessment = async (stageId: string) => {
    const confirmed = await confirm({
      title: "Tutup Asesmen Sekarang",
      description: "Apakah Anda yakin ingin menutup proses asesmen untuk sekolah ini sekarang dan langsung masuk ke tahap Intervensi? Anak tidak dapat mengerjakan ujian lagi pada fase ini setelah ditutup.",
      confirmLabel: "Tutup Asesmen",
      cancelLabel: "Batal",
      variant: "warning",
    });
    if (!confirmed) return;

    startTransition(async () => {
      const res = await closeAssessmentManuallyAction(stageId);
      if (res.success) {
        showSuccess("Asesmen Ditutup!", "Sekolah telah dipindahkan ke tahap Intervensi.");
        router.refresh();
      } else {
        showError("Gagal", res.error || "Gagal menutup asesmen");
      }
    });
  };

  const handleBulkCloseAssessment = async () => {
    const activeSchools = schoolsSummary.filter((s) => s.current_stage === "proses_asesmen");
    if (activeSchools.length === 0) return;

    const confirmed = await confirm({
      title: "Tutup Semua Asesmen",
      description: `Apakah Anda yakin ingin menutup proses asesmen secara serentak untuk seluruh (${activeSchools.length}) sekolah yang sedang aktif? Jika ya, semua sekolah tersebut akan langsung masuk ke tahap Intervensi.`,
      confirmLabel: "Ya, Tutup Semua",
      cancelLabel: "Batal",
      variant: "warning",
    });
    if (!confirmed) return;

    const stageIds = activeSchools.map((s) => s.stageId!).filter(Boolean);
    startTransition(async () => {
      const res = await bulkCloseAssessmentAction(stageIds);
      if (res.success) {
        showSuccess("Asesmen Ditutup!", `${activeSchools.length} sekolah berhasil dipindahkan ke tahap Intervensi.`);
        router.refresh();
      } else {
        showError("Gagal", res.error || "Gagal menutup asesmen secara massal");
      }
    });
  };

  const handleMarkIntervensiSelesai = async (stageId: string) => {
    const confirmed = await confirm({
      title: "Selesaikan Tahap Intervensi",
      description: "Apakah seluruh laporan intervensi untuk sekolah ini sudah lengkap? Tekan konfirmasi untuk menyelesaikan siklus fase ini dan masuk ke Tahap 5.",
      confirmLabel: "Selesai Intervensi",
      cancelLabel: "Batal",
      variant: "info",
    });
    if (!confirmed) return;

    startTransition(async () => {
      const res = await markIntervensiSelesaiAction(stageId);
      if (res.success) {
        showSuccess("Tahap Intervensi Selesai!", "Sekolah kini berada di Tahap Selesai (Siap untuk fase berikutnya).");
        router.refresh();
      } else {
        showError("Gagal", res.error || "Gagal menyelesaikan tahap intervensi");
      }
    });
  };

  const handleStartNewPhase = async (stageId: string, currentPhase: string) => {
    let nextPhaseName = "Fase 2";
    if (currentPhase.toLowerCase().includes("fase ")) {
      const num = parseInt(currentPhase.replace(/\D/g, ""), 10);
      if (!isNaN(num)) nextPhaseName = `Fase ${num + 1}`;
    }

    const confirmed = await confirm({
      title: `Mulai ${nextPhaseName}`,
      description: `Apakah Anda siap memulai ulang timeline untuk siklus ${nextPhaseName}? Progress tahap akan diulang ke Tahap Persiapan/Pengajuan untuk fase berikutnya.`,
      confirmLabel: "Ya, Mulai Siklus Baru",
      cancelLabel: "Batal",
      variant: "info",
    });
    if (!confirmed) return;

    startTransition(async () => {
      const res = await advanceStageToNewPhaseAction(stageId, nextPhaseName);
      if (res.success) {
        showSuccess("Siklus Baru Dimulai!", `Timeline berhasil diulang ke Tahap Persiapan/Pengajuan untuk ${nextPhaseName}.`);
        router.refresh();
      } else {
        showError("Gagal", res.error || "Gagal memulai siklus baru");
      }
    });
  };

  return (
    <div style={{
      backgroundColor: "white",
      borderRadius: "1.25rem",
      padding: "2rem",
      boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
      border: "1px solid #e2e8f0",
      display: "flex",
      flexDirection: "column",
      gap: "2rem"
    }}>
      {/* Header Alur */}
      <div>
        <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#0874aa", letterSpacing: "0.05em", textTransform: "uppercase" }}>
          ALUR SIKLUS PEMANTIK (#BerpihakKepadaAnak)
        </span>
        <h2 style={{ fontFamily: "Lora, serif", fontSize: "1.45rem", color: "#102e50", margin: "0.25rem 0 0.5rem 0", fontWeight: 700 }}>
          Timeline &amp; Track Progress Asesmen Komunitas (5 Tahap)
        </h2>
        <p style={{ margin: 0, fontSize: "0.88rem", color: "#64748b" }}>
          Klik pada setiap nomor tahapan di bawah ini untuk memantau status dan mengendalikan alur sekolah binaan Anda.
        </p>
      </div>

      {/* Horizontal Stepper Timeline */}
      <div style={{ position: "relative", padding: "1rem 0", overflowX: "auto", overflowY: "hidden" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          minWidth: "600px",
          position: "relative",
          zIndex: 2,
          paddingBottom: "10px"
        }}>
          {TIMELINE_STEPS.map((step, idx) => {
            const isSelected = selectedStepIndex === idx;
            const status = getStepStatus(idx);

            return (
              <div
                key={step.key}
                onClick={() => setSelectedStepIndex(idx)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  cursor: "pointer",
                  position: "relative",
                  transition: "all 0.2s ease",
                  padding: "0.5rem"
                }}
              >
                {/* Horizontal Connecting Line between circles */}
                {idx < TIMELINE_STEPS.length - 1 && (
                  <div style={{
                    position: "absolute",
                    top: "1.5rem",
                    left: "50%",
                    width: "100%",
                    height: "4px",
                    backgroundColor: isSelected || idx < selectedStepIndex ? "#0874aa" : "#e2e8f0",
                    zIndex: -1,
                    transition: "background-color 0.3s"
                  }} />
                )}

                {/* Circle Number Icon */}
                <div style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "50%",
                  backgroundColor: isSelected ? step.color : status.label === "Selesai" ? "#dcfce7" : status.label === "Proses" ? "#fef3c7" : "white",
                  color: isSelected ? "white" : status.label === "Selesai" ? "#15803d" : status.label === "Proses" ? "#b45309" : "#64748b",
                  border: isSelected ? `4px solid ${step.color}` : `2px solid ${status.border}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.1rem",
                  fontWeight: 800,
                  boxShadow: isSelected ? "0 4px 12px rgba(16, 46, 80, 0.2)" : "none",
                  transition: "all 0.2s ease",
                  marginBottom: "0.75rem"
                }}>
                  {status.label === "Selesai" && !isSelected ? "✓" : step.stepNumber}
                </div>

                {/* Step Label */}
                <span style={{
                  fontSize: "0.85rem",
                  fontWeight: isSelected ? 700 : 600,
                  color: isSelected ? "#102e50" : "#4b5563",
                  textAlign: "center",
                  fontFamily: "PT Sans, Inter, sans-serif"
                }}>
                  {step.shortLabel}
                </span>

                {/* Status Progress Badge below label */}
                <span style={{
                  marginTop: "0.35rem",
                  fontSize: "0.72rem",
                  padding: "0.15rem 0.65rem",
                  borderRadius: "999px",
                  backgroundColor: status.bg,
                  color: status.color,
                  fontWeight: 700,
                  border: `1px solid ${status.border}`
                }}>
                  {status.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Big White / Clean Instruction Box Below */}
      <div style={{
        backgroundColor: "#f8fafc",
        borderRadius: "1rem",
        padding: "1.75rem",
        border: `2px solid ${currentStep.color}`,
        boxShadow: "0 4px 15px rgba(0, 0, 0, 0.03)",
        transition: "all 0.3s ease"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem", marginBottom: "1rem" }}>
          <div>
            <span style={{
              display: "inline-block",
              padding: "0.25rem 0.75rem",
              borderRadius: "0.5rem",
              backgroundColor: currentStep.color,
              color: "white",
              fontSize: "0.75rem",
              fontWeight: 700,
              marginBottom: "0.5rem"
            }}>
              TAHAP {currentStep.stepNumber} DARI 5
            </span>
            <h3 style={{ fontFamily: "Lora, serif", fontSize: "1.35rem", color: "#102e50", margin: 0, fontWeight: 700 }}>
              {currentStep.title}
            </h3>
          </div>

          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
            <Button
              onClick={() => router.push(currentStep.actionHref)}
              style={{ backgroundColor: currentStep.color, color: "white", fontWeight: 600 }}
            >
              {currentStep.actionLabel} →
            </Button>

            {selectedStepIndex === 0 && schoolsSummary.some((sc) => sc.current_stage === "persiapan_akun") && (
              <Button
                style={{ backgroundColor: "#2d9e5f", color: "white", fontWeight: 700, boxShadow: "0 2px 8px rgba(45, 158, 95, 0.3)" }}
                onClick={() => handleBulkPersiapan()}
                disabled={isPending}
              >
                Lanjutkan Semua ke Tahap 2 (Pengajuan)
              </Button>
            )}
          </div>
        </div>

        {/* Deskripsi Instruksi */}
        <div style={{
          backgroundColor: "white",
          padding: "1.25rem",
          borderRadius: "0.75rem",
          border: "1px solid #e2e8f0",
          color: "#334155",
          fontSize: "0.92rem",
          lineHeight: 1.65,
          marginBottom: "1.5rem"
        }}>
          <strong style={{ color: "#102e50", display: "block", marginBottom: "0.35rem" }}>
            📌 Panduan Kendali &amp; Instruksi Komunitas:
          </strong>
          {currentStep.description}
        </div>

        {/* TAB KONTEN DINAMIS BERDASARKAN TAHAP YANG DIPILIH */}
        {selectedStepIndex === 0 && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
              <h4 style={{ fontSize: "0.98rem", color: "#102e50", margin: 0, fontWeight: 700 }}>
                🏫 Daftar Sekolah Binaan &amp; Status Dapodik ({schoolsSummary.length} Sekolah):
              </h4>
              <span style={{ fontSize: "0.8rem", color: "#0874aa", fontWeight: 600, backgroundColor: "#e0f2fe", padding: "0.25rem 0.6rem", borderRadius: "0.35rem" }}>
                🎯 Komunitas memiliki hak penuh untuk menekan tombol Lanjut ke Tahap 2
              </span>
            </div>

            {schoolsSummary.length === 0 ? (
              <div style={{ padding: "2rem", textAlign: "center", backgroundColor: "white", borderRadius: "0.5rem", border: "1px dashed #cbd5e1", color: "#64748b" }}>
                Belum ada sekolah binaan terdaftar. Silakan tambah data sekolah di menu Manajemen → Sekolah.
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1rem" }}>
                {schoolsSummary.map((sc) => {
                  const isReady = sc.current_stage === "persiapan_akun";
                  return (
                    <div
                      key={sc.school_id}
                      style={{
                        backgroundColor: "white",
                        padding: "1.1rem",
                        borderRadius: "0.75rem",
                        border: "1px solid #cbd5e1",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.85rem"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.5rem" }}>
                        <div>
                          <div style={{ fontWeight: 700, color: "#102e50", fontSize: "1rem" }}>
                            {sc.name}
                          </div>
                          <div style={{ fontSize: "0.78rem", color: "#64748b" }}>
                            NPSN: {sc.npsn || "-"} • Fase: {sc.phase}
                          </div>
                        </div>
                        <Badge variant={isReady ? "info" : "success"}>
                          {isReady ? "Tahap 1: Persiapan" : `Di Tahap: ${sc.current_stage.replace("_", " ")}`}
                        </Badge>
                      </div>

                      {/* Info Dapodik Sekolah: Jumlah Anak, Guru, Admin, Kelas */}
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(70px, 1fr))", gap: "0.4rem", backgroundColor: "#f8fafc", padding: "0.6rem", borderRadius: "0.5rem", textAlign: "center", fontSize: "0.8rem" }}>
                        <div>
                          <div style={{ fontWeight: 700, color: "#df632f" }}>{sc.studentsCount}</div>
                          <div style={{ color: "#64748b", fontSize: "0.72rem" }}>Anak (Anak)</div>
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: "#f2af3e" }}>{sc.teachersCount}</div>
                          <div style={{ color: "#64748b", fontSize: "0.72rem" }}>Guru</div>
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: "#8b5cf6" }}>{sc.adminsCount ?? 0}</div>
                          <div style={{ color: "#64748b", fontSize: "0.72rem" }}>Admin</div>
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: "#0874aa" }}>{sc.classesCount}</div>
                          <div style={{ color: "#64748b", fontSize: "0.72rem" }}>Kelas</div>
                        </div>
                      </div>

                      {/* Status Kendali */}
                      <div style={{ display: "flex", justifyContent: "flex-end", borderTop: "1px solid #f1f5f9", paddingTop: "0.65rem" }}>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {selectedStepIndex === 1 && (
          <div>
            <h4 style={{ fontSize: "0.95rem", color: "#102e50", margin: "0 0 0.75rem 0", fontWeight: 700 }}>
              📋 Sekolah Binaan yang Sedang di Tahap Pengajuan Asesmen ({schoolsInCurrentStep.length} Sekolah):
            </h4>
            {schoolsInCurrentStep.length === 0 ? (
              <div style={{ padding: "1.5rem", textAlign: "center", backgroundColor: "white", borderRadius: "0.5rem", border: "1px dashed #cbd5e1", color: "#64748b", fontSize: "0.85rem" }}>
                Saat ini tidak ada sekolah yang menunggu persetujuan pengajuan asesmen.
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "0.85rem" }}>
                {schoolsInCurrentStep.map((stRow) => (
                  <div key={stRow.id} style={{ backgroundColor: "white", padding: "1rem", borderRadius: "0.75rem", border: "1px solid #cbd5e1", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
                      <div>
                        <div style={{ fontWeight: 700, color: "#102e50", fontSize: "0.95rem" }}>{stRow.schools?.name}</div>
                        <div style={{ fontSize: "0.78rem", color: "#64748b" }}>NPSN: {stRow.schools?.npsn || "-"} • Fase: {stRow.phase}</div>
                      </div>
                      <Badge variant="warning">Menunggu ACC</Badge>
                    </div>
                    <div style={{ display: "flex", justifyContent: "flex-end", borderTop: "1px solid #f1f5f9", paddingTop: "0.65rem" }}>
                      <Button size="sm" variant="outline" style={{ borderColor: "#f2af3e", color: "#b45309", fontSize: "0.78rem" }} onClick={() => router.push("/komunitas/akses-ujian")}>
                        Buka Status Pengajuan 📋
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {selectedStepIndex === 2 && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem", flexWrap: "wrap", gap: "0.5rem" }}>
              <h4 style={{ fontSize: "0.95rem", color: "#102e50", margin: 0, fontWeight: 700 }}>
                📖 Sekolah Binaan Sedang Menjalani Asesmen ({schoolsInCurrentStep.length} Sekolah):
              </h4>
              {schoolsInCurrentStep.length > 0 && (
                <Button size="sm" style={{ backgroundColor: "#0874aa", color: "white", fontSize: "0.85rem", fontWeight: 600 }} onClick={handleBulkCloseAssessment} disabled={isPending}>
                  Tutup Semua Asesmen ⏭️
                </Button>
              )}
            </div>
            {schoolsInCurrentStep.length === 0 ? (
              <div style={{ padding: "1.5rem", textAlign: "center", backgroundColor: "white", borderRadius: "0.5rem", border: "1px dashed #cbd5e1", color: "#64748b", fontSize: "0.85rem" }}>
                Saat ini tidak ada sekolah yang sedang dalam rentang pelaksanaan asesmen aktif.
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "0.85rem" }}>
                {schoolsInCurrentStep.map((stRow) => (
                  <div key={stRow.id} style={{ backgroundColor: "white", padding: "1rem", borderRadius: "0.75rem", border: "1px solid #cbd5e1", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
                      <div>
                        <div style={{ fontWeight: 700, color: "#102e50", fontSize: "0.95rem" }}>{stRow.schools?.name}</div>
                        <div style={{ fontSize: "0.78rem", color: "#64748b" }}>NPSN: {stRow.schools?.npsn || "-"} • Fase: {stRow.phase}</div>
                      </div>
                      <Badge variant="info">Asesmen Aktif</Badge>
                    </div>
                    <div style={{ display: "flex", justifyContent: "flex-end", borderTop: "1px solid #f1f5f9", paddingTop: "0.65rem" }}>
                      <Button size="sm" style={{ backgroundColor: "#0874aa", color: "white", fontSize: "0.78rem" }} onClick={() => handleCloseAssessment(stRow.id)} disabled={isPending}>
                        Tutup Asesmen Sekarang ⏭️
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {selectedStepIndex === 3 && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
              <h4 style={{ fontSize: "0.98rem", color: "#102e50", margin: 0, fontWeight: 700 }}>
                💡 Daftar Sekolah Binaan &amp; Status Pengisian Form Intervensi ({schoolsSummary.length} Sekolah):
              </h4>
              <span style={{ fontSize: "0.8rem", color: "#df632f", fontWeight: 600, backgroundColor: "#ffedd5", padding: "0.25rem 0.6rem", borderRadius: "0.35rem" }}>
                📝 Komunitas &amp; Sekolah masing-masing mengisi form kualitatif
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1rem" }}>
              {schoolsSummary.map((sc) => {
                const isInIntervensiStage = sc.current_stage === "intervensi";
                return (
                  <div key={sc.school_id} style={{ backgroundColor: "white", padding: "1.1rem", borderRadius: "0.75rem", border: "1px solid #cbd5e1", display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.5rem" }}>
                      <div>
                        <div style={{ fontWeight: 700, color: "#102e50", fontSize: "1rem" }}>{sc.name}</div>
                        <div style={{ fontSize: "0.78rem", color: "#64748b" }}>NPSN: {sc.npsn || "-"} • Fase: {sc.phase}</div>
                      </div>
                      <Badge variant={isInIntervensiStage ? "warning" : "default"}>
                        {sc.current_stage.replace("_", " ")}
                      </Badge>
                    </div>

                    {/* Status Pengisian Form Intervensi */}
                    <div style={{ backgroundColor: "#f8fafc", padding: "0.75rem", borderRadius: "0.5rem", border: "1px solid #e2e8f0" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem" }}>
                        <span style={{ fontSize: "1.1rem" }}>{sc.hasFilledIntervention ? "✅" : "⏳"}</span>
                        <div>
                          <strong style={{ color: "#102e50", display: "block" }}>Status Form Intervensi Komunitas:</strong>
                          <span style={{ color: sc.hasFilledIntervention ? "#16a34a" : "#d97706", fontWeight: 600 }}>
                            {sc.hasFilledIntervention ? "Sudah Dilengkapi ✓" : "Belum Dilengkapi"}
                          </span>
                        </div>
                      </div>
                      
                      {isInIntervensiStage && progressMap[sc.school_id] && (
                        <div style={{ marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px dashed #cbd5e1" }}>
                          <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600, marginBottom: "0.25rem" }}>
                            Total Progres Keseluruhan (Sekolah, Komunitas & Guru):
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <div style={{ flex: 1, height: "6px", backgroundColor: "#e2e8f0", borderRadius: "3px", overflow: "hidden" }}>
                              <div 
                                style={{ 
                                  height: "100%", 
                                  backgroundColor: "#d97706", 
                                  width: `${Math.min(100, (progressMap[sc.school_id].submitted / progressMap[sc.school_id].required) * 100)}%`,
                                  transition: "width 0.5s ease"
                                }} 
                              />
                            </div>
                            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#d97706" }}>
                              {progressMap[sc.school_id].submitted} / {progressMap[sc.school_id].required}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Tombol Kendali: Isi Form (Lanjut ke Tahap Selesai terjadi otomatis) */}
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", borderTop: "1px solid #f1f5f9", paddingTop: "0.65rem", flexWrap: "wrap" }}>
                      <Button size="sm" variant="outline" style={{ borderColor: "#df632f", color: "#df632f", fontSize: "0.78rem" }} onClick={() => router.push(`/komunitas/intervensi?schoolId=${sc.school_id}`)}>
                        💡 Isi / Lihat Form
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {selectedStepIndex === 4 && (
          <div>
            <h4 style={{ fontSize: "0.95rem", color: "#102e50", margin: "0 0 0.75rem 0", fontWeight: 700 }}>
              🎉 Sekolah Binaan yang Telah Tuntas &amp; Siap Siklus Baru ({schoolsInCurrentStep.length} Sekolah):
            </h4>
            {schoolsInCurrentStep.length === 0 ? (
              <div style={{ padding: "1.5rem", textAlign: "center", backgroundColor: "white", borderRadius: "0.5rem", border: "1px dashed #cbd5e1", color: "#64748b", fontSize: "0.85rem" }}>
                Saat ini belum ada sekolah yang menyelesaikan seluruh tahapan siklus fase ini.
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "0.85rem" }}>
                {schoolsInCurrentStep.map((stRow) => (
                  <div key={stRow.id} style={{ backgroundColor: "white", padding: "1rem", borderRadius: "0.75rem", border: "1px solid #cbd5e1", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
                      <div>
                        <div style={{ fontWeight: 700, color: "#102e50", fontSize: "0.95rem" }}>{stRow.schools?.name}</div>
                        <div style={{ fontSize: "0.78rem", color: "#64748b" }}>NPSN: {stRow.schools?.npsn || "-"} • Tuntas di: {stRow.phase}</div>
                      </div>
                      <Badge variant="success">Siklus Selesai</Badge>
                    </div>
                    <div style={{ display: "flex", justifyContent: "flex-end", borderTop: "1px solid #f1f5f9", paddingTop: "0.65rem" }}>
                      <Button size="sm" style={{ backgroundColor: "#2d9e5f", color: "white", fontSize: "0.78rem" }} onClick={() => handleStartNewPhase(stRow.id, stRow.phase)} disabled={isPending}>
                        🔄 Ajukan Fase Berikutnya
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
