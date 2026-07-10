"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button, Badge, useToast, useConfirm } from "@pemantik/ui";
import { parseDapodikAction, importDapodikAction, type ParseDapodikResponse } from "@/app/actions/schools";

interface DapodikSekolahClientProps {
  school: {
    id: string;
    name: string;
    npsn?: string | null;
    dapodik_imported_at?: string | null;
    import_source?: string | null;
  };
}

type ParseSummaryWithToken = NonNullable<ParseDapodikResponse["summary"]> & {
  parse_token: string;
};

export default function DapodikSekolahClient({ school }: DapodikSekolahClientProps) {
  const router = useRouter();
  const { success: showSuccess, error: showError } = useToast();
  const { confirm } = useConfirm();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [parsePreview, setParsePreview] = useState<ParseSummaryWithToken | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{ message: string; progress: number } | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // File selection / drop handlers
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await handleParseFile(file);
  };

  const handleParseFile = async (file: File) => {
    setIsParsing(true);
    setParsePreview(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const result = await parseDapodikAction(formData);
      if (result.success && result.summary && result.parse_token) {
        setParsePreview({
          ...result.summary,
          parse_token: result.parse_token,
        });
        showSuccess(
          "File Berhasil Dipindai",
          `Ditemukan ${result.summary.row_count} baris data dan ${result.summary.detected_classes?.length || 0} kelas.`
        );
      } else {
        showError("Gagal Memindai File", result.error || "Format file tidak dikenali atau rusak.");
      }
    } catch (err: any) {
      showError("Error", err.message || "Terjadi kesalahan saat memproses file Dapodik.");
    } finally {
      setIsParsing(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!parsePreview) return;
    const ok = await confirm({
      title: "Mulai Impor Data Dapodik?",
      description: `Sistem akan menambahkan/memutakhirkan ${parsePreview.row_count} data siswa/guru dan ${parsePreview.detected_classes?.length || 0} kelas ke dalam sekolah ${school.name}. Data yang sudah ada tidak akan terduplikasi.`,
      confirmLabel: "Ya, Impor Sekarang",
      cancelLabel: "Batal",
      variant: "info",
    });
    if (!ok) return;

    setIsImporting(true);
    setImportProgress({ message: "Memulai proses impor...", progress: 10 });

    try {
      const res = await importDapodikAction({
        parse_token: parsePreview.parse_token,
        school_choice: "existing",
        existing_school_id: school.id,
        confirmed_name: school.name,
      });

      if (!res.success || !res.batch_id) {
        showError("Gagal Impor", res.error || "Gagal memulai proses impor Dapodik.");
        setIsImporting(false);
        setImportProgress(null);
        return;
      }

      const batchId = res.batch_id;
      // Polling status
      const pollInterval = setInterval(async () => {
        try {
          const pollRes = await fetch(`/api/dapodik-import/${batchId}`);
          if (!pollRes.ok) return;
          const pollData = await pollRes.json();

          if (pollData.status === "completed") {
            clearInterval(pollInterval);
            setImportProgress({ message: "Impor selesai 100%!", progress: 100 });
            setIsImporting(false);
            setParsePreview(null);
            showSuccess("Impor Dapodik Berhasil!", pollData.message || "Seluruh data Guru, Siswa, dan Kelas berhasil diimpor.");
            router.refresh();
          } else if (pollData.status === "error") {
            clearInterval(pollInterval);
            setIsImporting(false);
            setImportProgress(null);
            showError("Gagal Impor", pollData.error || "Terjadi kesalahan pada proses impor di latar belakang.");
          } else {
            // Processing status
            setImportProgress({
              message: pollData.message || "Sedang memproses data di server...",
              progress: Math.min(90, Math.max(20, pollData.progress || 50)),
            });
          }
        } catch (err) {
          console.error("Error polling import status:", err);
        }
      }, 2000);
    } catch (err: any) {
      showError("Error", err.message || "Terjadi kesalahan saat memulai impor.");
      setIsImporting(false);
      setImportProgress(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handleParseFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem", fontFamily: "var(--font-sans, system-ui, sans-serif)" }}>
      {/* ── Status Unggahan Terakhir ── */}
      <div style={{
        backgroundColor: "#ffffff",
        borderRadius: "1.25rem",
        border: "1px solid #e2e8f0",
        padding: "1.5rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "1rem",
        boxShadow: "0 4px 12px rgba(0,0,0,0.02)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{
            width: "3rem",
            height: "3rem",
            borderRadius: "0.85rem",
            backgroundColor: school.dapodik_imported_at ? "#dcfce7" : "#fef3c7",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.5rem"
          }}>
            {school.dapodik_imported_at ? "✓" : "⏳"}
          </div>
          <div>
            <div style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: 600 }}>Status Data Sekolah & Dapodik</div>
            <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#0f172a" }}>
              {school.dapodik_imported_at
                ? `Diunggah: ${new Date(school.dapodik_imported_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}`
                : "Belum Ada Unggahan File Dapodik"}
            </div>
          </div>
        </div>
        {school.dapodik_imported_at && (
          <Badge variant="success">Data Dapodik Aktif</Badge>
        )}
      </div>

      {/* ── Kotak Unggah / Dropzone ── */}
      <div className="card" style={{ padding: "2rem", borderRadius: "1.25rem", border: "1px solid #e2e8f0" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0f172a", marginBottom: "0.35rem" }}>
          1. Pilih atau Unggah Berkas Dapodik
        </h2>
        <p style={{ fontSize: "0.88rem", color: "#64748b", marginBottom: "1.5rem" }}>
          Unggah file ekspor siswa/guru dari aplikasi Dapodik (format Excel/CSV). Sistem akan otomatis mendeteksi dan memetakan data kelas dan akun siswa di sekolah Anda.
        </p>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".xlsx,.xls,.csv,.txt,.html"
          style={{ display: "none" }}
        />

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${dragActive ? "#0284c7" : "#cbd5e1"}`,
            backgroundColor: dragActive ? "#f0f9ff" : "#f8fafc",
            borderRadius: "1rem",
            padding: "3rem 2rem",
            textAlign: "center",
            cursor: "pointer",
            transition: "all 0.2s ease",
            marginBottom: "1.25rem"
          }}
        >
          <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>📂</div>
          <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "#1e293b", marginBottom: "0.35rem" }}>
            {isParsing ? "Sedang memindai file Dapodik..." : "Klik atau Tarik File Dapodik ke Sini"}
          </div>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b" }}>
            Format didukung: <strong>Excel (.xlsx), CSV, TXT, HTML</strong> (Maksimal 15MB)
          </p>
        </div>

        {/* Info Bantuan Format */}
        <div style={{ backgroundColor: "#f8fafc", padding: "1.2rem", borderRadius: "0.85rem", border: "1px solid #e2e8f0", fontSize: "0.85rem", color: "#475569", lineHeight: 1.6 }}>
          💡 <strong>Tips Unggah Dapodik:</strong> Pastikan file memuat kolom nama guru, NUPTK/NIP, nama siswa, NISN, gender (L/P), dan nama rombel/kelas agar sistem dapat memisahkan akun secara otomatis.
        </div>
      </div>

      {/* ── Preview Hasil Pemindaian (Jika ada) ── */}
      {parsePreview && (
        <div style={{
          backgroundColor: "#f0fdf4",
          border: "1px solid #86efac",
          borderRadius: "1.25rem",
          padding: "2rem",
          boxShadow: "0 4px 15px rgba(0,0,0,0.03)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <div style={{ marginBottom: "0.35rem" }}>
                <Badge variant="success">✓ File Siap Diimpor</Badge>
              </div>
              <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800, color: "#166534" }}>
                2. Verifikasi Data Pratinjau
              </h3>
            </div>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <Button
                onClick={() => setParsePreview(null)}
                variant="outline"
                style={{ backgroundColor: "white", borderColor: "#cbd5e1", color: "#64748b" }}
              >
                Batal / Pilih File Lain
              </Button>
              <Button
                onClick={handleConfirmImport}
                disabled={isImporting}
                style={{ backgroundColor: "#15803d", color: "white", fontWeight: 700, padding: "0.65rem 1.5rem" }}
              >
                {isImporting ? "Sedang Mengimpor..." : "🚀 Konfirmasi & Impor Data Sekarang →"}
              </Button>
            </div>
          </div>

          {/* Grid Statistik Pratinjau */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
            <div style={{ backgroundColor: "white", padding: "1.25rem", borderRadius: "1rem", border: "1px solid #bbf7d0", textAlign: "center" }}>
              <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#22c55e" }}>{parsePreview.row_count}</div>
              <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#334155" }}>Baris Data Valid Terdeteksi</div>
            </div>
            <div style={{ backgroundColor: "white", padding: "1.25rem", borderRadius: "1rem", border: "1px solid #bbf7d0", textAlign: "center" }}>
              <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#0874aa" }}>{parsePreview.detected_classes?.length || 0}</div>
              <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#334155" }}>Rombel / Kelas Terdeteksi</div>
            </div>
            <div style={{ backgroundColor: "white", padding: "1.25rem", borderRadius: "1rem", border: "1px solid #bbf7d0", textAlign: "center" }}>
              <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#df632f" }}>{parsePreview.skipped_count || 0}</div>
              <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#334155" }}>Baris Dilewati / Rusak</div>
            </div>
          </div>

          {/* Progress Impor */}
          {importProgress && (
            <div style={{ backgroundColor: "white", padding: "1.25rem", borderRadius: "0.85rem", border: "1px solid #86efac", textAlign: "center" }}>
              <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#166534", marginBottom: "0.5rem" }}>
                {importProgress.message}
              </div>
              <div style={{ width: "100%", backgroundColor: "#e2e8f0", height: "10px", borderRadius: "5px", overflow: "hidden" }}>
                <div style={{ height: "100%", backgroundColor: "#22c55e", width: `${importProgress.progress}%`, transition: "width 0.3s ease" }} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
