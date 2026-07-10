"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Badge, useToast, useConfirm } from "@pemantik/ui";
import {
  markPersiapanSelesaiAction,
  closeAssessmentManuallyAction,
  markIntervensiSelesaiAction,
  advanceStageToNewPhaseAction,
  type SchoolAssessmentStageRow
} from "@/app/actions/stages";

interface SchoolInteractiveTimelineProps {
  stages: SchoolAssessmentStageRow[];
  schoolId: string;
  schoolName: string;
  npsn: string | null;
  communityId: string | null;
  communityName?: string | null;
  totalTeachers: number;
  totalStudents: number;
  totalClasses: number;
}

const TIMELINE_STEPS = [
  {
    stepNumber: 1,
    key: "persiapan_akun",
    shortLabel: "Persiapan Akun",
    title: "Tahap 1: Persiapan Akun & Dapodik",
    color: "#102e50",
  },
  {
    stepNumber: 2,
    key: "pengajuan_fase",
    shortLabel: "Pengajuan Asesmen",
    title: "Tahap 2: Pengajuan Fase Asesmen ke Super Admin",
    color: "#f2af3e",
  },
  {
    stepNumber: 3,
    key: "proses_asesmen",
    shortLabel: "Proses Asesmen",
    title: "Tahap 3: Pelaksanaan & Proses Asesmen",
    color: "#0874aa",
  },
  {
    stepNumber: 4,
    key: "intervensi",
    shortLabel: "Intervensi",
    title: "Tahap 4: Pencatatan Laporan & Form Intervensi",
    color: "#df632f",
  },
  {
    stepNumber: 5,
    key: "selesai",
    shortLabel: "Selesai & Berikutnya",
    title: "Tahap 5: Selesai & Pengajuan Siklus Berikutnya",
    color: "#2d9e5f",
  },
];

export default function SchoolInteractiveTimeline({
  stages,
  schoolId,
  schoolName,
  npsn,
  communityId,
  communityName,
  totalTeachers,
  totalStudents,
  totalClasses,
}: SchoolInteractiveTimelineProps) {
  const router = useRouter();
  const { success: showSuccess, error: showError } = useToast();
  const { confirm } = useConfirm();

  const isIndependent = !communityId;

  // Cari stage saat ini untuk sekolah ini
  const currentStageRow = stages && stages.length > 0 ? stages[0] : null;
  const currentStageKey = currentStageRow?.current_stage || "persiapan_akun";
  const currentPhase = currentStageRow?.phase || "Fase 1";

  const computeInitialStepIndex = (stageKey: string) => {
    const foundIdx = TIMELINE_STEPS.findIndex((t) => t.key === stageKey);
    return foundIdx !== -1 ? foundIdx : 0;
  };

  const [selectedStepIndex, setSelectedStepIndex] = useState<number>(() => computeInitialStepIndex(currentStageKey));
  const [isPending, startTransition] = useTransition();

  React.useEffect(() => {
    setSelectedStepIndex(computeInitialStepIndex(currentStageKey));
  }, [currentStageKey]);

  const currentStep = TIMELINE_STEPS[selectedStepIndex];

  const getStepStatus = (index: number) => {
    const stepKey = TIMELINE_STEPS[index].key;
    const currentIdx = TIMELINE_STEPS.findIndex((t) => t.key === currentStageKey);

    if (currentStageKey === stepKey) {
      return { label: "Proses", bg: "#fef3c7", color: "#b45309", border: "#f59e0b" };
    }
    if (currentIdx > index) {
      return { label: "Selesai", bg: "#dcfce7", color: "#15803d", border: "#22c55e" };
    }
    return { label: "Belum", bg: "#f1f5f9", color: "#64748b", border: "#cbd5e1" };
  };

  // Handlers khusus Sekolah Independen (Jika Binaan Komunitas, tombol-tombol ini tidak dimunculkan)
  const handleMarkPersiapan = async () => {
    if (!isIndependent) return;
    const confirmed = await confirm({
      title: "Konfirmasi Lanjut Tahap 2",
      description: "Apakah Anda yakin data Dapodik untuk sekolah ini sudah lengkap dan diverifikasi?",
      confirmLabel: "Ya, Lanjutkan ke Tahap 2",
      cancelLabel: "Batal",
      variant: "info",
    });
    if (!confirmed) return;

    startTransition(async () => {
      const res = await markPersiapanSelesaiAction(schoolId, currentPhase);
      if (res.success) {
        showSuccess("Persiapan Selesai!", "Sekolah telah dipindahkan ke Tahap Pengajuan Asesmen.");
        router.refresh();
      } else {
        showError("Gagal", res.error || "Gagal menandai persiapan selesai");
      }
    });
  };

  const handleCloseAssessment = async () => {
    if (!isIndependent && !currentStageRow?.id) return;
    if (!currentStageRow?.id) return;
    const confirmed = await confirm({
      title: "Tutup Asesmen Sekarang?",
      description: "Apakah seluruh siswa telah selesai mengerjakan asesmen? Sistem akan memindahkan sekolah ke Tahap 4 (Intervensi).",
      confirmLabel: "Ya, Tutup Asesmen Sekarang",
      cancelLabel: "Batal",
      variant: "warning",
    });
    if (!confirmed) return;

    startTransition(async () => {
      const res = await closeAssessmentManuallyAction(currentStageRow.id);
      if (res.success) {
        showSuccess("Asesmen Ditutup!", "Sekolah telah dipindahkan ke tahap Intervensi.");
        router.refresh();
      } else {
        showError("Gagal", res.error || "Gagal menutup asesmen");
      }
    });
  };

  const handleMarkIntervensiSelesai = async () => {
    if (!currentStageRow?.id) return;
    const confirmed = await confirm({
      title: "Selesaikan Tahap Intervensi",
      description: "Apakah seluruh laporan intervensi untuk sekolah Anda sudah lengkap dan disubmit? Tekan konfirmasi untuk menyelesaikan siklus fase ini.",
      confirmLabel: "Selesai Intervensi",
      cancelLabel: "Batal",
      variant: "info",
    });
    if (!confirmed) return;

    startTransition(async () => {
      const res = await markIntervensiSelesaiAction(currentStageRow.id);
      if (res.success) {
        showSuccess("Tahap Intervensi Selesai!", "Sekolah kini berada di Tahap Selesai.");
        router.refresh();
      } else {
        showError("Gagal", res.error || "Gagal menyelesaikan tahap intervensi");
      }
    });
  };

  const handleStartNewPhase = async () => {
    if (!isIndependent || !currentStageRow?.id) return;
    let nextPhaseName = "Fase 2";
    if (currentPhase.toLowerCase().includes("fase ")) {
      const num = parseInt(currentPhase.replace(/\D/g, ""), 10);
      if (!isNaN(num)) nextPhaseName = `Fase ${num + 1}`;
    }

    const confirmed = await confirm({
      title: `Mulai ${nextPhaseName}`,
      description: `Apakah Anda siap memulai ulang timeline untuk siklus ${nextPhaseName}? Progress tahap akan diulang ke Tahap Persiapan/Pengajuan.`,
      confirmLabel: "Ya, Mulai Siklus Baru",
      cancelLabel: "Batal",
      variant: "info",
    });
    if (!confirmed) return;

    startTransition(async () => {
      const res = await advanceStageToNewPhaseAction(currentStageRow.id, nextPhaseName);
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
      boxShadow: "0 4px 20px rgba(0,0,0,0.04)",
      border: "1px solid #e2e8f0",
      fontFamily: "var(--font-sans, system-ui, sans-serif)",
    }}>
      {/* Header Info Status Sekolah */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.75rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div style={{ marginBottom: "0.5rem", fontSize: "0.75rem" }}>
            <Badge variant={isIndependent ? "info" : "primary"}>
              {isIndependent ? "✨ Sekolah Independen (Kendali Penuh)" : `🏛️ Binaan Komunitas: ${communityName || "Komunitas Induk"}`}
            </Badge>
          </div>
          <h2 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 800, color: "#0f172a", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            Timeline Asesmen: <span style={{ color: "#0874aa" }}>{currentPhase}</span>
          </h2>
        </div>
        <div style={{ fontSize: "0.85rem", color: "#64748b", backgroundColor: "#f8fafc", padding: "0.5rem 1rem", borderRadius: "0.75rem", border: "1px solid #e2e8f0" }}>
          Status Saat Ini: <strong style={{ color: "#0f172a" }}>{TIMELINE_STEPS.find(s => s.key === currentStageKey)?.shortLabel || currentStageKey}</strong>
        </div>
      </div>

      {/* Horizontal Stepper Timeline */}
      <div style={{ position: "relative", padding: "1rem 0", marginBottom: "2rem" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          position: "relative",
          zIndex: 2
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

      {/* ── Dynamic Instruction Card for Selected Step ── */}
      <div style={{
        backgroundColor: "#f8fafc",
        border: `1px solid ${currentStep.color}30`,
        borderLeft: `5px solid ${currentStep.color}`,
        borderRadius: "1rem",
        padding: "1.5rem",
        marginBottom: "2rem",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem", marginBottom: "1rem" }}>
          <div>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: currentStep.color, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.25rem" }}>
              Panduan Tahap {currentStep.stepNumber}
            </div>
            <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800, color: "#0f172a" }}>
              {currentStep.title}
            </h3>
          </div>
        </div>

        {/* Isi deskripsi sesuai step & status independen/binaan */}
        <div style={{ color: "#334155", fontSize: "0.92rem", lineHeight: 1.6, marginBottom: "1.5rem" }}>
          {selectedStepIndex === 0 && (
            <div>
              {isIndependent ? (
                <p style={{ margin: 0 }}>
                  Pada tahap awal ini, <strong>Sekolah Independen</strong> diharapkan membuat akun dan mengupload data Dapodik di menu <strong>Manajemen → Upload Data Dapodik</strong>. Setelah data Guru, Siswa, dan Kelas diverifikasi lengkap, Anda dapat menekan tombol <em>&ldquo;Lanjutkan ke Tahap 2&rdquo;</em> di bawah ini untuk bersiap mengajukan asesmen.
                </p>
              ) : (
                <p style={{ margin: 0 }}>
                  Sekolah Anda berada di bawah naungan <strong>Komunitas Induk ({communityName || "Komunitas"})</strong>. Komunitas bertugas membuat dan memverifikasi data Dapodik sekolah Anda. Namun, Anda tetap dapat memeriksa, memperbarui, atau mengupload data Dapodik di menu <strong>Manajemen → Upload Data Dapodik</strong>. <br /><br />
                  <span style={{ color: "#d97706", fontWeight: 600 }}>⏳ Hak akses konfirmasi perpindahan ke Tahap 2 dipegang penuh oleh Komunitas Induk Anda.</span>
                </p>
              )}
            </div>
          )}

          {selectedStepIndex === 1 && (
            <div>
              {isIndependent ? (
                <p style={{ margin: 0 }}>
                  Di halaman <strong>Akses Ujian</strong>, Anda akan menemukan tombol <strong>&ldquo;✨ Pembuatan dan Pengajuan Asesmen&rdquo;</strong>. Anda dapat mengisi Nama Fase (teks), rentang tanggal pelaksanaan asesmen (format date), dan memilih paket ujian yang ingin dilakukan.<br /><br />
                  <span style={{ color: "#b45309", fontWeight: 600 }}>Note:</span> Walaupun secara default sudah ada akses paket dari sistem, siswa-siswa di sekolah Anda <strong>belum/tidak akan bisa mengakses ujian</strong> sebelum pengajuan fase ini di-ACC (disetujui) oleh Super Admin.
                </p>
              ) : (
                <p style={{ margin: 0 }}>
                  Pada tahap ini, <strong>Komunitas Induk Anda ({communityName || "Komunitas"})</strong> bertugas mengajukan fase asesmen beserta rentang tanggal pelaksanaan ke Super Admin.<br /><br />
                  <span style={{ color: "#b45309", fontWeight: 600 }}>Note:</span> Walaupun paket ujian sudah ada, siswa di sekolah Anda <strong>belum/tidak dapat mengerjakan ujian</strong> sebelum pengajuan fase dari Komunitas di-ACC oleh Super Admin. <br /><br />
                  <span style={{ color: "#0874aa", fontWeight: 600 }}>ℹ️ Anda dapat memantau status persetujuan pengajuan tersebut di menu Manajemen → Akses Ujian.</span>
                </p>
              )}
            </div>
          )}

          {selectedStepIndex === 2 && (
            <div>
              <p style={{ margin: 0 }}>
                <strong>Sistem otomatis membaca tanggal mulai dan akhir asesmen yang diajukan.</strong> Siswa-siswa di kelas kini dapat masuk menggunakan akun kredensial mereka (dapat diunduh di menu Manajemen → Guru/Siswa) dan mengerjakan ujian sesuai paket yang aktif.<br /><br />
                {isIndependent ? (
                  <span>Jika pengerjaan di seluruh kelas telah selesai lebih cepat dari jadwal, Anda memiliki kendali untuk menekan tombol <em>&ldquo;Tutup Asesmen Sekarang&rdquo;</em> di bawah ini untuk melanjutkan ke tahap Intervensi.</span>
                ) : (
                  <span style={{ color: "#0874aa", fontWeight: 600 }}>ℹ️ Timeline pelaksanaan dipantau bersama oleh Komunitas Induk. Asesmen akan selesai sesuai batas waktu atau jika ditutup oleh Komunitas.</span>
                )}
              </p>
            </div>
          )}

          {selectedStepIndex === 3 && (
            <div>
              <p style={{ margin: 0 }}>
                <strong>Pada tahap ini, di sidebar kiri Anda akan terbuka menu baru: &ldquo;Form Intervensi&rdquo;.</strong><br /><br />
                <span style={{ color: "#dc2626", fontWeight: 700 }}>PENTING & WAJIB:</span> Baik Sekolah Independen maupun Sekolah Binaan Komunitas <strong>wajib melengkapi form intervensi kualitatif</strong> yang ada di menu sidebar tersebut. Kontribusi narasi intervensi Anda akan menjadi bahan analisis kebijakan dan pemantauan capaian siswa.
              </p>
            </div>
          )}

          {selectedStepIndex === 4 && (
            <div>
              <p style={{ margin: 0 }}>
                Seluruh rangkaian asesmen dan intervensi pada fase saat ini telah tuntas dengan sempurna. Data capaian dan intervensi sekolah Anda telah diarsipkan.<br /><br />
                {isIndependent ? (
                  <span>Sebagai Sekolah Independen, Anda siap menekan tombol <em>&ldquo;Ajukan Fase Baru Sekarang&rdquo;</em> untuk memulai ulang timeline dari awal bagi siklus asesmen berikutnya (misal: beralih dari Fase 1 ke Fase 2).</span>
                ) : (
                  <span style={{ color: "#2d9e5f", fontWeight: 600 }}>✨ Sekolah Anda akan mengikuti jadwal pembukaan siklus fase berikutnya yang diajukan oleh Komunitas Induk.</span>
                )}
              </p>
            </div>
          )}
        </div>

        {/* Tombol-tombol Aksi sesuai Step & Kendali Independen / Intervensi */}
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", borderTop: "1px solid #e2e8f0", paddingTop: "1.25rem", alignItems: "center" }}>
          {selectedStepIndex === 0 && (
            isIndependent && currentStageKey === "persiapan_akun" ? (
              <Button
                onClick={handleMarkPersiapan}
                disabled={isPending}
                style={{ backgroundColor: "#102e50", color: "white", padding: "0.65rem 1.4rem", fontWeight: 600 }}
              >
                {isPending ? "Memproses..." : "Lanjutkan ke Tahap 2 (Siap Pengajuan) →"}
              </Button>
            ) : (
              <Button
                onClick={() => router.push("/sekolah/dapodik")}
                style={{ backgroundColor: "#102e50", color: "white", padding: "0.65rem 1.4rem", fontWeight: 600 }}
              >
                📤 Buka Menu Upload Data Dapodik
              </Button>
            )
          )}

          {selectedStepIndex === 1 && (
            isIndependent ? (
              <Button
                onClick={() => router.push("/sekolah/akses-ujian")}
                style={{ backgroundColor: "#f2af3e", color: "#0f172a", padding: "0.65rem 1.4rem", fontWeight: 700 }}
              >
                ✨ Buka Pembuatan & Pengajuan Asesmen →
              </Button>
            ) : (
              <Button
                onClick={() => router.push("/sekolah/akses-ujian")}
                style={{ backgroundColor: "#f1f5f9", color: "#475569", border: "1px solid #cbd5e1", padding: "0.65rem 1.4rem", fontWeight: 600 }}
              >
                👁️ Lihat Status & Jadwal Asesmen
              </Button>
            )
          )}

          {selectedStepIndex === 2 && (
            <>
              <Button
                onClick={() => router.push("/sekolah/laporan")}
                style={{ backgroundColor: "#0874aa", color: "white", padding: "0.65rem 1.4rem", fontWeight: 600 }}
              >
                📊 Pantau Hasil Ujian Sementara →
              </Button>
              {isIndependent && currentStageKey === "proses_asesmen" && (
                <Button
                  onClick={handleCloseAssessment}
                  disabled={isPending}
                  style={{ backgroundColor: "#fee2e2", color: "#dc2626", border: "1px solid #fca5a5", padding: "0.65rem 1.4rem", fontWeight: 600 }}
                >
                  {isPending ? "Memproses..." : "🛑 Tutup Asesmen Sekarang"}
                </Button>
              )}
            </>
          )}

          {selectedStepIndex === 3 && (
            <>
              <Button
                onClick={() => router.push("/sekolah/intervensi")}
                style={{ backgroundColor: "#df632f", color: "white", padding: "0.65rem 1.4rem", fontWeight: 700 }}
              >
                📝 Buka Form Intervensi & Laporan →
              </Button>
              {currentStageKey === "intervensi" && (
                <Button
                  onClick={handleMarkIntervensiSelesai}
                  disabled={isPending}
                  style={{ backgroundColor: "#10b981", color: "white", padding: "0.65rem 1.4rem", fontWeight: 600 }}
                >
                  {isPending ? "Memproses..." : "✅ Tandai Form Intervensi Selesai"}
                </Button>
              )}
            </>
          )}

          {selectedStepIndex === 4 && (
            isIndependent ? (
              <Button
                onClick={handleStartNewPhase}
                disabled={isPending}
                style={{ backgroundColor: "#2d9e5f", color: "white", padding: "0.65rem 1.4rem", fontWeight: 700 }}
              >
                {isPending ? "Memproses..." : "✨ Ajukan Fase Baru Sekarang →"}
              </Button>
            ) : (
              <div style={{ fontSize: "0.85rem", color: "#166534", fontWeight: 600 }}>
                ✓ Tahap tuntas! Menunggu jadwal fase baru dari Komunitas Induk.
              </div>
            )
          )}
        </div>
      </div>

      {/* ── Summary Card Sekolah (Total Guru, Siswa, Kelas) ── */}
      <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "1.5rem" }}>
        <h4 style={{ margin: "0 0 1rem 0", fontSize: "1rem", fontWeight: 700, color: "#1e293b" }}>
          Ringkasan Data Sekolah Anda ({schoolName})
        </h4>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
          <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", padding: "1.2rem 1rem", borderRadius: "1rem", textAlign: "center" }}>
            <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#f2af3e" }}>{totalTeachers}</div>
            <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#64748b", marginTop: "0.2rem" }}>Total Guru</div>
          </div>
          <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", padding: "1.2rem 1rem", borderRadius: "1rem", textAlign: "center" }}>
            <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#df632f" }}>{totalStudents}</div>
            <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#64748b", marginTop: "0.2rem" }}>Total Siswa (Anak)</div>
          </div>
          <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", padding: "1.2rem 1rem", borderRadius: "1rem", textAlign: "center" }}>
            <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#0874aa" }}>{totalClasses}</div>
            <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#64748b", marginTop: "0.2rem" }}>Total Kelas Aktif</div>
          </div>
        </div>
      </div>
    </div>
  );
}
