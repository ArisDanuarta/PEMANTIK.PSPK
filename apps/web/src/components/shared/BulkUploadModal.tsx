"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Button } from "@pemantik/ui";
import * as XLSX from "xlsx";

// ─── Types ───────────────────────────────────────────────────────────────────

interface BulkUploadModalProps {
  title: string;
  description?: string;
  templateFileName: string;
  templateHeaders: string[];
  templateData?: any[][];
  onClose: () => void;
  onUpload: (data: any[]) => Promise<{ success: boolean; message?: string; error?: string }>;
  onDownloadTemplate?: () => void;

  mode?: "generic" | "dapodik";
  existingSchools?: { id: string; name: string; npsn: string | null }[];
  onDapodikParse?: (formData: FormData) => Promise<DapodikParseResponse>;
  onDapodikConfirm?: (payload: DapodikImportPayload) => Promise<{ success: boolean; error?: string; batch_id?: string }>;
  onPollStatus?: (batchId: string) => Promise<DapodikBatchStatus>;
  inline?: boolean;
}

interface DapodikParseResponse {
  success: boolean;
  error?: string;
  parse_token?: string;
  summary?: {
    detected_school_name: string | null;
    detected_npsn: string | null;
    detected_province: string | null;
    detected_city: string | null;
    detected_district: string | null;
    detected_village: string | null;
    row_count: number;
    skipped_count: number;
    detected_classes: string[];
    missing_ses_count: number;
    preview_rows: any[];
    warning_count: number;
    skipped_rows: any[];
  };
}

interface DapodikImportPayload {
  parse_token: string;
  school_choice: "new" | "existing";
  existing_school_id?: string;
  confirmed_name?: string;
  confirmed_npsn?: string;
  confirmed_province?: string;
  confirmed_city?: string;
  confirmed_district?: string;
  confirmed_village?: string;
  academic_year?: string; 
}

interface DapodikBatchStatus {
  status: string;
  total_rows: number;
  success_count: number;
  fail_count: number;
  errors: any[];
  warnings: any[];
  new_ses_variables: any[];
  school_id?: string;
  is_done: boolean;
}

// ─── Komponen Utama ──────────────────────────────────────────────────────────

export default function BulkUploadModal({
  title,
  description,
  templateFileName,
  templateHeaders,
  templateData = [],
  onClose,
  onUpload,
  mode = "generic",
  existingSchools = [],
  onDapodikParse,
  onDapodikConfirm,
  onPollStatus,
  inline,
  onDownloadTemplate,
}: BulkUploadModalProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [mounted, setMounted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [dapodikStep, setDapodikStep] = useState<"upload" | "confirm" | "progress" | "result">("upload");
  const [parseToken, setParseToken] = useState<string | null>(null);
  const [parseSummary, setParseSummary] = useState<DapodikParseResponse["summary"] | null>(null);
  const [schoolChoice, setSchoolChoice] = useState<"new" | "existing">("new");
  const [selectedExistingSchoolId, setSelectedExistingSchoolId] = useState("");
  const [confirmedName, setConfirmedName] = useState("");
  const [confirmedNpsn, setConfirmedNpsn] = useState("");
  const [confirmedProvince, setConfirmedProvince] = useState("");
  const [confirmedCity, setConfirmedCity] = useState("");
  const [confirmedDistrict, setConfirmedDistrict] = useState("");
  const [confirmedVillage, setConfirmedVillage] = useState("");
  
  const detectAcademicYear = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; 
    const startYear = month >= 7 ? year : year - 1;
    return `${startYear}/${startYear + 1}`;
  };
  const [academicYear, setAcademicYear] = useState(detectAcademicYear);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [batchStatus, setBatchStatus] = useState<DapodikBatchStatus | null>(null);
  const [pollingInterval, setPollingInterval] = useState<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => {
      if (pollingInterval) clearInterval(pollingInterval);
    };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setErrorMsg("");
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
      setErrorMsg("");
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDownloadTemplate = () => {
    if (onDownloadTemplate) {
      onDownloadTemplate();
      return;
    }
    try {
      const worksheetData = [templateHeaders, ...(templateData || [])];
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      const colWidths = templateHeaders.map((header) => ({ wch: Math.max(header.length, 15) }));
      worksheet["!cols"] = colWidths;
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
      XLSX.writeFile(workbook, templateFileName.endsWith(".xlsx") ? templateFileName : `${templateFileName}.xlsx`);
    } catch (err) {
      setErrorMsg("Gagal mengunduh template. Coba lagi.");
    }
  };

  const handleGenericProcessFile = () => {
    if (!file) {
      setErrorMsg("Pilih file terlebih dahulu.");
      return;
    }
    setIsUploading(true);
    setErrorMsg("");
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        if (!data) throw new Error("Gagal membaca file");
        const workbook = XLSX.read(data, { type: "array", cellDates: true });

        // === SMART SHEET AUTO-DETECT ===
        // Kata kunci kolom yang dikenali sistem (dari semua template)
        const KNOWN_COLUMNS = new Set([
          "nama_siswa", "nama_guru", "nama_sekolah", "nama_komunitas",
          "nisn", "npsn", "nip", "jenis_kelamin", "tanggal_lahir",
          "kelas", "daftar_kelas", "pendidikan_ayah", "pendidikan_ibu",
          "pekerjaan_ayah", "pekerjaan_ibu", "kelurahan_desa", "kecamatan",
          "kabupaten", "provinsi", "status_kepemilikan", "status_sekolah",
          "jenjang_sekolah", "email_guru", "email_sekolah", "email_komunitas",
          "nama_penanggung_jawab", "nomor_telepon", "kepala_sekolah",
        ]);

        // Fungsi untuk menghitung "skor" sebuah sheet
        const scoreSheet = (sheetName: string): number => {
          try {
            const ws = workbook.Sheets[sheetName];
            const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: "", raw: false });
            if (rows.length === 0) return 0;

            // Hitung berapa banyak kolom yang dikenali sistem
            const firstRow = rows[0];
            const keys = Object.keys(firstRow).map(k =>
              k.trim().toLowerCase().replace(/[\s\-]+/g, "_")
            );
            const knownCount = keys.filter(k => KNOWN_COLUMNS.has(k)).length;

            // Skor = (jumlah kolom dikenali * 10) + jumlah baris data
            // Sheet "petunjuk" biasanya tidak punya kolom yang dikenali
            return (knownCount * 10) + rows.length;
          } catch {
            return 0;
          }
        };

        // Scan semua sheet dan pilih yang skornya tertinggi
        let bestSheet = workbook.SheetNames[0];
        let bestScore = -1;
        for (const sheetName of workbook.SheetNames) {
          const score = scoreSheet(sheetName);
          if (score > bestScore) {
            bestScore = score;
            bestSheet = sheetName;
          }
        }

        if (process.env.NODE_ENV !== "production") {
          console.log("[BulkUpload] Semua sheet:", workbook.SheetNames);
          console.log("[BulkUpload] Sheet terpilih (skor tertinggi):", bestSheet, "| Skor:", bestScore);
        }

        const worksheet = workbook.Sheets[bestSheet];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "", raw: false, dateNF: "yyyy-mm-dd" });
        if (jsonData.length === 0) throw new Error("Sheet yang terdeteksi kosong. Pastikan data ada di file Excel Anda.");

        const plainData = (jsonData as any[]).map((row: any) => {
          const normalizedRow: any = {};
          for (const key in row) {
            if (Object.prototype.hasOwnProperty.call(row, key)) {
              // Normalisasi key: trim, lowercase, spasi/tanda hubung → underscore
              const normalizedKey = key.trim().toLowerCase().replace(/[\s\-]+/g, "_");
              const val = row[key];
              normalizedRow[normalizedKey] = typeof val === "string" ? val.trim() : val;
            }
          }
          return normalizedRow;
        });

        if (process.env.NODE_ENV !== "production") {
          console.log("[BulkUpload] Total baris data:", plainData.length);
          if (plainData.length > 0) {
            console.log("[BulkUpload] Keys baris 1:", Object.keys(plainData[0]));
            console.log("[BulkUpload] Data baris 1:", plainData[0]);
          }
        }

        const result = await onUpload(plainData);
        if (!result.success) throw new Error(result.error || result.message || "Gagal mengunggah data.");



      } catch (err: any) {
        setErrorMsg(err.message || "Terjadi kesalahan saat memproses file.");
        setIsUploading(false);
      }
    };
    reader.onerror = () => {
      setErrorMsg("Gagal membaca file. Coba lagi.");
      setIsUploading(false);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDapodikUpload = async () => {
    if (!file || !onDapodikParse) {
      setErrorMsg("Pilih file terlebih dahulu.");
      return;
    }
    setIsUploading(true);
    setErrorMsg("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const result = await onDapodikParse(formData);
      if (!result.success || !result.parse_token || !result.summary) {
        throw new Error(result.error || "Gagal mem-parsing file.");
      }
      setParseToken(result.parse_token);
      setParseSummary(result.summary);
      setConfirmedName(result.summary.detected_school_name || "");
      setConfirmedNpsn(result.summary.detected_npsn || "");
      setConfirmedProvince(result.summary.detected_province || "");
      setConfirmedCity(result.summary.detected_city || "");
      setConfirmedDistrict(result.summary.detected_district || "");
      setConfirmedVillage(result.summary.detected_village || "");
      setDapodikStep("confirm");
    } catch (err: any) {
      setErrorMsg(err.message || "Terjadi kesalahan saat memproses file.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDapodikImport = async () => {
    if (!parseToken || !onDapodikConfirm) return;

    if (schoolChoice === "new" && !confirmedNpsn.trim()) {
      setErrorMsg("NPSN wajib diisi sebelum import.");
      return;
    }
    if (schoolChoice === "existing" && !selectedExistingSchoolId) {
      setErrorMsg("Pilih sekolah yang sudah ada.");
      return;
    }

    setIsUploading(true);
    setErrorMsg("");
    setDapodikStep("progress");

    try {
      const payload: DapodikImportPayload = {
        parse_token: parseToken,
        school_choice: schoolChoice,
        existing_school_id: schoolChoice === "existing" ? selectedExistingSchoolId : undefined,
        confirmed_name: confirmedName,
        confirmed_npsn: confirmedNpsn,
        confirmed_province: confirmedProvince,
        confirmed_city: confirmedCity,
        confirmed_district: confirmedDistrict,
        confirmed_village: confirmedVillage,
        academic_year: academicYear, 
      };

      const result = await onDapodikConfirm(payload);
      if (!result.success || !result.batch_id) {
        throw new Error(result.error || "Gagal memulai import.");
      }

      setBatchId(result.batch_id);

      if (onPollStatus) {
        const interval = setInterval(async () => {
          try {
            const status = await onPollStatus(result.batch_id!);
            setBatchStatus(status);
            if (status.is_done) {
              clearInterval(interval);
              setPollingInterval(null);
              setDapodikStep("result");
              setIsUploading(false);
            }
          } catch {
          }
        }, 2000);
        setPollingInterval(interval);
      } else {
        setDapodikStep("result");
        setIsUploading(false);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Terjadi kesalahan saat import.");
      setDapodikStep("confirm");
      setIsUploading(false);
    }
  };

  if (!mounted) return null;

  const modalContent =
    mode === "dapodik"
      ? renderDapodikModal()
      : renderGenericModal();

  if (inline) {
    return (
      <div style={{ width: "100%", maxWidth: mode === "dapodik" && dapodikStep === "confirm" ? "750px" : "600px", margin: "0 auto", padding: "1rem" }}>
        {modalContent}
      </div>
    );
  }

  return createPortal(
    <div
      style={{
        position: "fixed", inset: 0,
        backgroundColor: "rgba(16, 46, 80, 0.55)",
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        zIndex: 9999, padding: "2rem 1rem", overflowY: "auto",
        backdropFilter: "blur(2px)",
      }}
    >
      {modalContent}
    </div>,
    document.body
  );

  function renderGenericModal() {
    return (
      <div style={modalBoxStyle("500px", inline)}>
        <ModalHeader title={title} onClose={onClose} disabled={isUploading} />
        {description && <p style={{ fontSize: "0.9rem", color: "#4b5563", marginBottom: "1.25rem", lineHeight: 1.5 }}>{description}</p>}

        <div style={{ marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc", padding: "0.75rem", borderRadius: "0.5rem", border: "1px solid #e2e8f0" }}>
          <span style={{ fontSize: "0.85rem", color: "#334155" }}>Format file harus mengikuti template standar.</span>
          <Button type="button" onClick={handleDownloadTemplate} variant="outline" size="sm" style={{ backgroundColor: "white", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download Template
          </Button>
        </div>

        <div style={{ marginBottom: "1.5rem" }}>
          {!file ? (
            <DropZone onFileSelect={(f) => { setFile(f); setErrorMsg(""); }} onDrop={handleDrop} onDragOver={handleDragOver} fileInputRef={fileInputRef} disabled={isUploading} />
          ) : (
            <FilePreview file={file} onRemove={() => setFile(null)} disabled={isUploading} />
          )}
        </div>

        {errorMsg && <ErrorBanner message={errorMsg} />}

        <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end", borderTop: "1px solid #e5e7eb", paddingTop: "1.5rem" }}>
          <Button variant="outline" onClick={onClose} disabled={isUploading}>Batal</Button>
          <Button onClick={handleGenericProcessFile} disabled={isUploading || !file} style={{ backgroundColor: "#102e50", color: "white" }}>
            {isUploading ? "Memproses..." : "Mulai Upload"}
          </Button>
        </div>
      </div>
    );
  }

  function renderDapodikModal() {
    const totalRows = parseSummary?.row_count ?? 0;
    const doneCount = batchStatus?.success_count ?? 0;
    const progressPct = totalRows > 0 ? Math.round((doneCount / totalRows) * 100) : 0;

    return (
      <div style={modalBoxStyle(dapodikStep === "confirm" ? "680px" : "560px", inline)}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "2rem", padding: "0 1rem" }}>
          {(["upload", "confirm", "progress", "result"] as const).map((step, idx) => {
            const steps = ["upload", "confirm", "progress", "result"];
            const currentIdx = steps.indexOf(dapodikStep);
            const isDone = idx < currentIdx;
            const isCurrent = step === dapodikStep;
            return (
              <React.Fragment key={step}>
                <div style={{
                  width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                  background: isDone || isCurrent ? "#102e50" : "#e5e7eb",
                  color: isDone || isCurrent ? "white" : "#9ca3af",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "0.875rem", fontWeight: 700,
                }}>
                  {idx + 1}
                </div>
                {idx < 3 && <div style={{ flex: 1, height: 2, background: isDone ? "#102e50" : "#e5e7eb" }} />}
              </React.Fragment>
            );
          })}
        </div>

        <ModalHeader
          title={
            dapodikStep === "upload" ? "Import Dapodik - Upload File" :
            dapodikStep === "confirm" ? "Import Dapodik - Konfirmasi Data" :
            dapodikStep === "progress" ? "Import Dapodik - Sedang Memproses..." :
            "Import Dapodik - Selesai"
          }
          onClose={onClose}
          disabled={isUploading}
        />

        {dapodikStep === "upload" && (
          <div>
            <p style={{ fontSize: "0.9rem", color: "#4b5563", marginBottom: "1.25rem", lineHeight: 1.6 }}>
              Upload file Excel Dapodik <strong>"Daftar Peserta Didik"</strong>. Sistem akan otomatis membuat Sekolah, Kelas (dari Rombel), dan Anak.
            </p>
            {!file ? (
              <DropZone onFileSelect={(f) => { setFile(f); setErrorMsg(""); }} onDrop={handleDrop} onDragOver={handleDragOver} fileInputRef={fileInputRef} disabled={isUploading} />
            ) : (
              <FilePreview file={file} onRemove={() => setFile(null)} disabled={isUploading} />
            )}
            {errorMsg && <div style={{ marginTop: "1rem" }}><ErrorBanner message={errorMsg} /></div>}
            <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end", marginTop: "1.5rem", borderTop: "1px solid #e5e7eb", paddingTop: "1.5rem" }}>
              <Button variant="outline" onClick={onClose} style={{ borderColor: "#102e50", color: "#102e50" }}>Batal</Button>
              <Button onClick={handleDapodikUpload} disabled={isUploading || !file} style={{ backgroundColor: "#102e50", color: "white" }}>
                {isUploading ? "Memproses File..." : "Analisis File →"}
              </Button>
            </div>
          </div>
        )}

        {dapodikStep === "confirm" && parseSummary && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem", marginBottom: "1.5rem" }}>
              <StatCard label="Anak Terdeteksi" value={parseSummary.row_count} color="#102e50" />
              <StatCard label="Kelas Terdeteksi" value={parseSummary.detected_classes.length} color="#f2af3e" />
              <StatCard label="SES Baru" value={parseSummary.missing_ses_count} color={parseSummary.missing_ses_count > 0 ? "#dc2626" : "#22c55e"} />
            </div>

            {parseSummary.skipped_count > 0 && (
              <div style={{ padding: "0.75rem", backgroundColor: "#fef3c7", border: "1px solid #fcd34d", borderRadius: "0.5rem", marginBottom: "1rem", fontSize: "0.85rem", color: "#92400e" }}>
                ⚠ <strong>{parseSummary.skipped_count} baris dilewati</strong> karena field wajib kosong (nama/jenis kelamin).
                <details style={{ marginTop: "0.5rem" }}>
                  <summary style={{ cursor: "pointer", fontWeight: 600 }}>Lihat detail baris yang dilewati</summary>
                  <div style={{ marginTop: "0.5rem", maxHeight: "120px", overflowY: "auto" }}>
                    {parseSummary.skipped_rows.slice(0, 20).map((r: any, i: number) => (
                      <div key={i} style={{ fontSize: "0.8rem" }}>
                        Baris {r.row_number}: {r.message}
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            )}

            {parseSummary.warning_count > 0 && (
              <div style={{ padding: "0.75rem", backgroundColor: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "0.5rem", marginBottom: "1rem", fontSize: "0.85rem", color: "#1e40af" }}>
                ℹ <strong>{parseSummary.warning_count} baris</strong> memiliki field opsional yang kosong (rombel, NISN, dll) - tetap akan diimport.
              </div>
            )}

            {parseSummary.missing_ses_count > 0 && (
              <div style={{ padding: "0.75rem", backgroundColor: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "0.5rem", marginBottom: "1rem", fontSize: "0.85rem", color: "#991b1b" }}>
                🔴 <strong>{parseSummary.missing_ses_count} indikator SES baru</strong> akan dibuat otomatis dengan skor 0. Anda perlu mengisi bobotnya di <strong>Pengaturan SES</strong> setelah import.
              </div>
            )}

            <div style={{ marginBottom: "1.25rem" }}>
              <label style={labelStyle}>Opsi Sekolah</label>
              <div style={{ display: "flex", gap: "1rem" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                  <input type="radio" checked={schoolChoice === "new"} onChange={() => setSchoolChoice("new")} />
                  <span style={{ fontSize: "0.9rem" }}>Buat sekolah baru</span>
                </label>
                {existingSchools.length > 0 && (
                  <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                    <input type="radio" checked={schoolChoice === "existing"} onChange={() => setSchoolChoice("existing")} />
                    <span style={{ fontSize: "0.9rem" }}>Perbarui sekolah yang sudah ada</span>
                  </label>
                )}
              </div>
            </div>

            {schoolChoice === "existing" && existingSchools.length > 0 ? (
              <div style={{ marginBottom: "1.25rem" }}>
                <label style={labelStyle}>Pilih Sekolah</label>
                <select
                  value={selectedExistingSchoolId}
                  onChange={(e) => setSelectedExistingSchoolId(e.target.value)}
                  style={inputStyle}
                >
                  <option value="">-- Pilih sekolah --</option>
                  {existingSchools.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.npsn ? `(NPSN: ${s.npsn})` : "(NPSN belum diisi)"}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.25rem" }}>
                <div>
                  <label style={labelStyle}>Nama Sekolah</label>
                  <input type="text" value={confirmedName} onChange={(e) => setConfirmedName(e.target.value)} style={inputStyle} placeholder="Nama sekolah..." />
                </div>
                <div>
                  <label style={{ ...labelStyle, color: "#dc2626" }}>NPSN <span style={{ color: "#dc2626" }}>*</span></label>
                  <input type="text" value={confirmedNpsn} onChange={(e) => setConfirmedNpsn(e.target.value)} style={{ ...inputStyle, borderColor: !confirmedNpsn ? "#fca5a5" : "#d1d5db" }} placeholder="Wajib diisi..." />
                </div>
                <div>
                  <label style={labelStyle}>Provinsi</label>
                  <input type="text" value={confirmedProvince} onChange={(e) => setConfirmedProvince(e.target.value)} style={inputStyle} placeholder="Provinsi..." />
                </div>
                <div>
                  <label style={labelStyle}>Kota/Kabupaten</label>
                  <input type="text" value={confirmedCity} onChange={(e) => setConfirmedCity(e.target.value)} style={inputStyle} placeholder="Kota..." />
                </div>
                <div>
                  <label style={labelStyle}>Kecamatan</label>
                  <input type="text" value={confirmedDistrict} onChange={(e) => setConfirmedDistrict(e.target.value)} style={inputStyle} placeholder="Kecamatan..." />
                </div>
                <div>
                  <label style={labelStyle}>Kelurahan/Desa</label>
                  <input type="text" value={confirmedVillage} onChange={(e) => setConfirmedVillage(e.target.value)} style={inputStyle} placeholder="Kelurahan..." />
                </div>
              </div>
            )}

            <div style={{ marginBottom: "1.25rem" }}>
              <label style={labelStyle}>Tahun Ajaran</label>
              <input
                type="text"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                style={{ ...inputStyle, maxWidth: "180px" }}
                placeholder="Contoh: 2025/2026"
              />
              <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.3rem" }}>
                Terdeteksi otomatis. Ubah jika berbeda (format: YYYY/YYYY).
              </div>
            </div>

            {parseSummary.preview_rows.length > 0 && (
              <div style={{ marginBottom: "1.25rem" }}>
                <label style={labelStyle}>Preview Data (10 baris pertama)</label>
                <div style={{ overflowX: "auto", border: "1px solid #e5e7eb", borderRadius: "0.5rem" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                    <thead>
                      <tr style={{ background: "#f9fafb" }}>
                        {["Nama", "L/P", "NISN", "Rombel", "Tgl Lahir"].map((h) => (
                          <th key={h} style={{ padding: "0.5rem 0.75rem", textAlign: "left", borderBottom: "1px solid #e5e7eb", color: "#374151", fontWeight: 600 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {parseSummary.preview_rows.map((row: any, i: number) => (
                        <tr key={i} style={{ borderBottom: "1px solid #f3f4f6" }}>
                          <td style={{ padding: "0.5rem 0.75rem" }}>{row.full_name}</td>
                          <td style={{ padding: "0.5rem 0.75rem" }}>{row.gender === "laki-laki" ? "L" : "P"}</td>
                          <td style={{ padding: "0.5rem 0.75rem", fontFamily: "monospace" }}>{row.nisn || "-"}</td>
                          <td style={{ padding: "0.5rem 0.75rem" }}>{row.rombel || <span style={{ color: "#9ca3af" }}>kosong</span>}</td>
                          <td style={{ padding: "0.5rem 0.75rem" }}>
                            {row.birth_date_parse_error
                              ? <span style={{ color: "#f59e0b" }}>⚠ {row.birth_date_raw}</span>
                              : row.birth_date || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {errorMsg && <ErrorBanner message={errorMsg} />}

            <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end", borderTop: "1px solid #e5e7eb", paddingTop: "1.5rem" }}>
              <Button variant="outline" onClick={() => { setDapodikStep("upload"); setErrorMsg(""); }}>← Kembali</Button>
              <Button onClick={handleDapodikImport} disabled={isUploading} style={{ backgroundColor: "#102e50", color: "white", minWidth: 140 }}>
                {isUploading ? "Memulai..." : "✓ Mulai Import"}
              </Button>
            </div>
          </div>
        )}

        {dapodikStep === "progress" && (
          <div style={{ textAlign: "center", padding: "2rem 0" }}>
            <div style={{ width: 56, height: 56, border: "4px solid #e5e7eb", borderTopColor: "#102e50", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 1.5rem" }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <h3 style={{ color: "#102e50", marginBottom: "0.5rem" }}>Sedang mengimpor data...</h3>
            <p style={{ color: "#6b7280", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
              Jangan tutup halaman ini.
            </p>
            {batchStatus && (
              <div style={{ maxWidth: 320, margin: "0 auto" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem", fontSize: "0.85rem", color: "#374151" }}>
                  <span>{batchStatus.success_count} dari {batchStatus.total_rows} siswa</span>
                  <span>{progressPct}%</span>
                </div>
                <div style={{ height: 10, background: "#e5e7eb", borderRadius: 999, overflow: "hidden" }}>
                  <div style={{ height: "100%", background: "#102e50", width: `${progressPct}%`, transition: "width 0.3s ease", borderRadius: 999 }} />
                </div>
                {batchStatus.fail_count > 0 && (
                  <p style={{ marginTop: "0.75rem", fontSize: "0.8rem", color: "#dc2626" }}>
                    {batchStatus.fail_count} baris gagal
                  </p>
                )}
              </div>
            )}
            {!batchStatus && (
              <p style={{ color: "#9ca3af", fontSize: "0.85rem" }}>Menunggu konfirmasi dari server...</p>
            )}
          </div>
        )}

        {dapodikStep === "result" && batchStatus && (
          <div>
            <div style={{
              padding: "1.25rem",
              background: batchStatus.fail_count === 0 ? "#f0fdf4" : "#fef2f2",
              border: `1px solid ${batchStatus.fail_count === 0 ? "#bbf7d0" : "#fca5a5"}`,
              borderRadius: "0.75rem",
              marginBottom: "1.25rem",
              textAlign: "center",
            }}>
              <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>
                {batchStatus.fail_count === 0 ? "✅" : "⚠️"}
              </div>
              <h3 style={{ color: batchStatus.fail_count === 0 ? "#166534" : "#991b1b", marginBottom: "0.25rem" }}>
                {batchStatus.fail_count === 0 ? "Import Berhasil!" : "Import Selesai dengan Sebagian Error"}
              </h3>
              <p style={{ fontSize: "0.9rem", color: "#4b5563" }}>
                <strong>{batchStatus.success_count}</strong> siswa berhasil •{" "}
                <strong>{batchStatus.fail_count}</strong> gagal •{" "}
                <strong>{batchStatus.total_rows}</strong> total
              </p>
            </div>

            {batchStatus.new_ses_variables.length > 0 && (
              <div style={{ padding: "0.75rem", background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: "0.5rem", marginBottom: "1rem", fontSize: "0.85rem" }}>
                <strong>⚠ {batchStatus.new_ses_variables.length} Indikator SES Baru</strong> ditambahkan dengan skor 0.
                Silakan atur bobotnya di <strong>Pengaturan SES</strong>.
              </div>
            )}

            {batchStatus.errors.length > 0 && (
              <details style={{ marginBottom: "1rem" }}>
                <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: "0.9rem", color: "#dc2626" }}>
                  Lihat {batchStatus.errors.length} baris yang gagal
                </summary>
                <div style={{ marginTop: "0.75rem", maxHeight: 180, overflowY: "auto", border: "1px solid #fca5a5", borderRadius: "0.5rem" }}>
                  {batchStatus.errors.map((e: any, i: number) => (
                    <div key={i} style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #fee2e2", fontSize: "0.8rem" }}>
                      <strong>Baris {e.row_number} - {e.full_name || "?"}</strong>: {e.message}
                    </div>
                  ))}
                </div>
              </details>
            )}

            <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end", borderTop: "1px solid #e5e7eb", paddingTop: "1.5rem" }}>
              <Button variant="outline" onClick={onClose}>Tutup</Button>
              {batchStatus.school_id && (
                <a href={`/super-admin/sekolah/${batchStatus.school_id}`} style={{ textDecoration: "none" }}>
                  <Button style={{ backgroundColor: "#102e50", color: "white" }}>Buka Detail Sekolah →</Button>
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }
}

function ModalHeader({ title, onClose, disabled }: { title: string; onClose: () => void; disabled?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
      <h2 style={{ fontSize: "1.15rem", fontWeight: 700, color: "#102e50", margin: 0 }}>{title}</h2>
      <button
        onClick={onClose}
        disabled={disabled}
        style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280", padding: "0.25rem" }}
        aria-label="Tutup modal"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

function DropZone({
  onFileSelect, onDrop, onDragOver, fileInputRef, disabled
}: {
  onFileSelect: (f: File) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  disabled?: boolean;
}) {
  return (
    <div
      style={{ padding: "2.5rem 1rem", backgroundColor: "#f8fafc", borderRadius: "0.5rem", border: "2px dashed #cbd5e1", textAlign: "center", cursor: "pointer", transition: "all 0.2s" }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#94a3b8")}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#cbd5e1")}
      onClick={() => fileInputRef.current?.click()}
      onDrop={onDrop}
      onDragOver={onDragOver}
    >
      <svg style={{ margin: "0 auto 1rem", color: "#64748b" }} width="36" height="36" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
      <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "#334155", marginBottom: "0.25rem" }}>Pilih file Excel atau CSV</h3>
      <p style={{ fontSize: "0.85rem", color: "#64748b" }}>Seret dan lepas file ke sini, atau klik untuk memilih</p>
      <input type="file" accept=".xlsx,.xls,.csv" ref={fileInputRef} onChange={(e) => { if (e.target.files?.[0]) onFileSelect(e.target.files[0]); }} disabled={disabled} style={{ display: "none" }} />
    </div>
  );
}

function FilePreview({ file, onRemove, disabled }: { file: File; onRemove: () => void; disabled?: boolean }) {
  return (
    <div style={{ padding: "1.25rem", backgroundColor: "#f0fdf4", borderRadius: "0.5rem", border: "1px solid #bbf7d0", display: "flex", alignItems: "center", justifyContent: "space-between", overflow: "hidden", gap: "1rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", minWidth: 0, flex: 1 }}>
        <div style={{ padding: "0.75rem", backgroundColor: "#dcfce7", borderRadius: "0.5rem", color: "#166534", flexShrink: 0 }}>
          <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div style={{ minWidth: 0, overflow: "hidden" }}>
          <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 600, color: "#166534", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={file.name}>
            {file.name}
          </h4>
          <p style={{ margin: 0, fontSize: "0.8rem", color: "#15803d", marginTop: "0.25rem" }}>{(file.size / 1024).toFixed(1)} KB</p>
        </div>
      </div>
      <button type="button" onClick={onRemove} disabled={disabled} style={{ padding: "0.5rem 1rem", fontSize: "0.85rem", fontWeight: 600, color: "#991b1b", backgroundColor: "#fee2e2", border: "none", borderRadius: "0.375rem", cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap" }}>
        Ganti File
      </button>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div style={{ padding: "0.75rem", backgroundColor: "#fef2f2", color: "#b91c1c", borderRadius: "0.5rem", fontSize: "0.85rem", marginBottom: "1rem", border: "1px solid #fca5a5" }}>
      {message}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ padding: "1rem", background: "#f9fafb", borderRadius: "0.5rem", border: "1px solid #e5e7eb", textAlign: "center" }}>
      <div style={{ fontSize: "1.75rem", fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.25rem" }}>{label}</div>
    </div>
  );
}

function modalBoxStyle(maxWidth = "520px", inline = false) {
  return {
    backgroundColor: "white",
    borderRadius: "0.5rem",
    width: "100%",
    maxWidth: inline ? "700px" : maxWidth,
    margin: inline ? "0 auto" : undefined,
    padding: "2rem",
    boxShadow: inline ? "none" : "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
    position: "relative" as const,
    border: "1px solid #e5e7eb"
  };
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.8rem",
  fontWeight: 600,
  color: "#374151",
  marginBottom: "0.35rem",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.5rem 0.75rem",
  border: "1px solid #d1d5db",
  borderRadius: "0.375rem",
  fontSize: "0.875rem",
  outline: "none",
  boxSizing: "border-box",
};