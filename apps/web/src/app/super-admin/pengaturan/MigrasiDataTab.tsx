"use client";

import React, { useState, useRef, useCallback } from "react";
import { useToast } from "@pemantik/ui";
import PemantikLogoProgress from "@/components/shared/Unitprogressbar";
import {
  detectColumnMap,
  detectAnswerColumns,
  detectLongFormat,
  type ExcelRow,
  type ValidationResult,
  type MigrationMaps,
} from "@/app/actions/dataMigrationUtils";
import {
  validateMigrationData,
  prepareMigration,
  insertStudentBatch,
  finalizeMigration,
} from "@/app/actions/dataMigration";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Community {
  id: string;
  name: string;
}

interface MigrasiDataTabProps {
  communities: Community[];
}

type WizardStep = "upload" | "configure" | "validate" | "execute" | "done";

interface MigrationLog {
  time: string;
  type: "info" | "success" | "error" | "warning";
  message: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const BATCH_SIZE = 200; // Siswa per batch (wide format)

function now() {
  return new Date().toLocaleTimeString("id-ID");
}

const COLOR = {
  navy: "#102e50",
  gold: "#f2af3e",
  orange: "#df632f",
  green: "#15803d",
  red: "#a8281c",
  gray: "#6b7280",
  lightGray: "#f9fafb",
  border: "#e5e7eb",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function MigrasiDataTab({ communities }: MigrasiDataTabProps) {
  const { success: toastSuccess, error: toastError } = useToast();

  // Wizard state
  const [step, setStep] = useState<WizardStep>("upload");

  // Step 1 — Upload
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ExcelRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isLongFormat, setIsLongFormat] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 2 — Configure
  const [columnMap, setColumnMap] = useState<Record<string, string | null>>({});
  const [answerColumns, setAnswerColumns] = useState<string[]>([]);
  const [targetCommunityId, setTargetCommunityId] = useState<string>("auto");
  const [mode, setMode] = useState<"sandbox" | "production">("production");
  const [phaseName, setPhaseName] = useState("fase_1");

  // Step 3 — Validate
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  // Step 4 — Execute
  const [isExecuting, setIsExecuting] = useState(false);
  const [completedStudents, setCompletedStudents] = useState(0);
  const [totalStudents, setTotalStudents] = useState(0);
  const [allSessionIds, setAllSessionIds] = useState<string[]>([]);
  const [logs, setLogs] = useState<MigrationLog[]>([]);
  const [finalReport, setFinalReport] = useState<{
    inserted: number;
    skipped: number;
    errors: number;
    credentials: any[];
  } | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // ── Log helper ──────────────────────────────────────────────────────────────
  const addLog = useCallback((type: MigrationLog["type"], message: string) => {
    setLogs((prev) => {
      const next = [...prev, { time: now(), type, message }];
      setTimeout(() => logsEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
      return next;
    });
  }, []);

  // ── Step 1: Handle file upload ──────────────────────────────────────────────
  const handleFile = async (file: File) => {
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["xlsx", "xls", "csv"].includes(ext || "")) {
      toastError("Format tidak didukung", "Gunakan file .xlsx atau .xls");
      return;
    }

    setIsParsing(true);
    setUploadedFile(file);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/parse-excel", { method: "POST", body: formData });
      const data = await res.json();

      if (!data.success) throw new Error(data.error);

      setParsedRows(data.rows);
      setHeaders(data.headers);

      // Auto-detect columns & answer columns
      const detectedColMap = detectColumnMap(data.headers);
      const detectedAnswerCols = detectAnswerColumns(data.headers);
      const longFormat = detectLongFormat(data.headers);
      setColumnMap(detectedColMap);
      setAnswerColumns(detectedAnswerCols);
      setIsLongFormat(longFormat);

      toastSuccess(
        "File berhasil dibaca!",
        `${data.totalRows} baris data${longFormat ? " (format LONG — 1 baris = 1 jawaban)" : ""}`
      );
      setStep("configure");
    } catch (err: any) {
      toastError("Gagal membaca file", err.message);
      setUploadedFile(null);
    } finally {
      setIsParsing(false);
    }
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    []
  );

  // ── Step 3: Validate ────────────────────────────────────────────────────────
  const handleValidate = async () => {
    setIsValidating(true);
    try {
      const result = await validateMigrationData(parsedRows, columnMap, answerColumns);
      setValidationResult(result);
      setStep("validate");
    } catch (err: any) {
      toastError("Gagal validasi", err.message);
    } finally {
      setIsValidating(false);
    }
  };

  // ── Step 4: Execute ─────────────────────────────────────────────────────────
  const handleExecute = async () => {
    setIsExecuting(true);
    setStep("execute");
    setCompletedStudents(0);
    setTotalStudents(isLongFormat ? 0 : parsedRows.length);
    setLogs([]);
    setAllSessionIds([]);
    const collectedSessionIds: string[] = [];
    let totalInserted = 0;
    let totalSkipped = 0;

    addLog("info", `Memulai migrasi data (format: ${isLongFormat ? "LONG" : "WIDE"})...`);
    addLog("info", `Mode: ${mode === "sandbox" ? "Sandbox / Uji Coba" : "Production / Data Utama"}`);
    addLog("info", `Fase: ${phaseName}`);

    // ── PATH A: Long Format → SSE streaming via /api/migrate-longformat ──────
    if (isLongFormat && uploadedFile) {
      try {
        const formData = new FormData();
        formData.append("file", uploadedFile);
        formData.append("targetCommunityId", targetCommunityId === "auto" ? "" : targetCommunityId);
        formData.append("mode", mode);
        formData.append("phaseName", phaseName);

        const response = await fetch("/api/migrate-longformat", { method: "POST", body: formData });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || ""; // sisa yang belum lengkap

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === "log") {
                addLog(data.level, data.message);
              } else if (data.type === "meta") {
                setTotalStudents(data.totalStudents);
              } else if (data.type === "progress") {
                setCompletedStudents(data.completedStudents);
                totalInserted = data.insertedStudents;
                totalSkipped = data.skippedStudents;
              } else if (data.type === "done") {
                setCompletedStudents(data.result.totalStudents);
                setFinalReport({
                  inserted: data.result.insertedStudents,
                  skipped: data.result.skippedStudents,
                  errors: data.result.skippedStudents,
                  credentials: data.result.credentials || [],
                });
              } else if (data.type === "error") {
                addLog("error", data.message);
                toastError("Migrasi error", data.message);
              }
            } catch { /* skip malformed JSON lines */ }
          }
        }
      } catch (err: any) {
        addLog("error", `Fatal error: ${err.message}`);
        toastError("Migrasi gagal", err.message);
      } finally {
        setIsExecuting(false);
        setStep("done");
      }
      return;
    }

    // ── PATH B: Wide Format → Server Actions (chunked) ─────────────────────
    let maps: MigrationMaps;
    let credentials: any[] = [];
    let totalErrors = 0;

    try {
      const prepRes = await prepareMigration(
        parsedRows,
        columnMap,
        targetCommunityId === "auto" ? null : targetCommunityId,
        mode
      );

      if (!prepRes.success || !prepRes.maps) {
        addLog("error", `Gagal persiapan: ${prepRes.error}`);
        toastError("Migrasi gagal", prepRes.error || "Gagal tahap persiapan");
        setIsExecuting(false);
        return;
      }

      maps = prepRes.maps;
      credentials = prepRes.credentials || [];

      const commCount = Object.keys(maps.communityMap).filter(k => k !== "__default__").length;
      const schoolCount = Object.keys(maps.schoolMap).length;
      addLog("success", `${commCount} komunitas & ${schoolCount} sekolah siap ✓`);
      if (credentials.length > 0) {
        addLog("info", `${credentials.length} akun baru dibuat (lihat laporan akhir)`);
      }
    } catch (err: any) {
      addLog("error", `Error tahap persiapan: ${err.message}`);
      setIsExecuting(false);
      return;
    }

    // Step B: Insert students in batches
    addLog("info", "Tahap 2/3: Memasukkan data siswa, sesi ujian, dan jawaban...");

    for (let i = 0; i < parsedRows.length; i += BATCH_SIZE) {
      const batch = parsedRows.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(parsedRows.length / BATCH_SIZE);

      addLog("info", `Batch ${batchNum}/${totalBatches}: memproses ${batch.length} siswa...`);

      try {
        const batchRes = await insertStudentBatch(
          batch,
          columnMap,
          answerColumns,
          maps,
          phaseName,
          i
        );

        totalInserted += batchRes.inserted;
        totalSkipped += batchRes.skipped;
        totalErrors += batchRes.errors.length;
        collectedSessionIds.push(...batchRes.sessionIds);
        setCompletedStudents((prev) => prev + batch.length);

        if (batchRes.errors.length > 0) {
          for (const e of batchRes.errors.slice(0, 3)) {
            addLog("warning", `Baris ${e.row}: ${e.message}`);
          }
          if (batchRes.errors.length > 3) {
            addLog("warning", `... dan ${batchRes.errors.length - 3} error lainnya`);
          }
        }

        addLog(
          "success",
          `Batch ${batchNum}/${totalBatches} selesai: ${batchRes.inserted} berhasil, ${batchRes.skipped} dilewati`
        );
      } catch (err: any) {
        addLog("error", `Batch ${batchNum} gagal: ${err.message}`);
        totalSkipped += batch.length;
        setCompletedStudents((prev) => prev + batch.length);
      }
    }

    setAllSessionIds(collectedSessionIds);

    // Step C: Finalize current_level_id
    addLog("info", `Tahap 3/3: Memperbarui level tertinggi untuk ${collectedSessionIds.length} sesi ujian...`);

    try {
      const finalRes = await finalizeMigration(collectedSessionIds);
      if (finalRes.success) {
        addLog("success", `${finalRes.updated} sesi ujian diperbarui (current_level_id) ✓`);
      } else {
        addLog("warning", `Finalisasi level gagal: ${finalRes.error}`);
      }
    } catch (err: any) {
      addLog("warning", `Finalisasi level error: ${err.message}`);
    }

    // Done!
    addLog("success", `═══════════════════════════════`);
    addLog("success", `MIGRASI SELESAI ✓`);
    addLog("success", `${totalInserted} siswa berhasil | ${totalSkipped} dilewati | ${totalErrors} error`);

    setFinalReport({
      inserted: totalInserted,
      skipped: totalSkipped,
      errors: totalErrors,
      credentials,
    });

    toastSuccess(
      "Migrasi Selesai!",
      `${totalInserted} siswa berhasil dimigrasi ke platform.`
    );

    setIsExecuting(false);
    setStep("done");
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* ── Step Indicator ─────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0",
          background: "#f9fafb",
          borderRadius: "0.75rem",
          padding: "1rem 1.5rem",
          border: "1px solid #e5e7eb",
        }}
      >
        {[
          { id: "upload", label: "1. Upload" },
          { id: "configure", label: "2. Konfigurasi" },
          { id: "validate", label: "3. Preview & Cek" },
          { id: "execute", label: "4. Eksekusi" },
        ].map((s, idx) => {
          const steps: WizardStep[] = ["upload", "configure", "validate", "execute"];
          const currentIdx = steps.indexOf(step === "done" ? "execute" : step);
          const isActive = s.id === (step === "done" ? "execute" : step);
          const isDone = steps.indexOf(s.id as WizardStep) < currentIdx || step === "done";
          return (
            <React.Fragment key={s.id}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: isDone ? COLOR.green : isActive ? COLOR.navy : COLOR.border,
                    color: isDone || isActive ? "#fff" : COLOR.gray,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    flexShrink: 0,
                    transition: "background 0.3s",
                  }}
                >
                  {isDone ? "✓" : idx + 1}
                </div>
                <span
                  style={{
                    fontSize: "0.8rem",
                    fontWeight: isActive ? 700 : 400,
                    color: isActive ? COLOR.navy : isDone ? COLOR.green : COLOR.gray,
                    whiteSpace: "nowrap",
                  }}
                >
                  {s.label}
                </span>
              </div>
              {idx < 3 && (
                <div
                  style={{
                    flex: 1,
                    height: 2,
                    background: isDone ? COLOR.green : COLOR.border,
                    margin: "0 0.75rem",
                    transition: "background 0.3s",
                  }}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* ── Step 1: Upload ──────────────────────────────────────────────────── */}
      {step === "upload" && (
        <div className="card" style={{ padding: "1.5rem" }}>
          <h3
            style={{
              fontFamily: "Lora, serif",
              color: COLOR.navy,
              fontSize: "1.1rem",
              fontWeight: 700,
              marginBottom: "0.5rem",
            }}
          >
            Upload File Excel Data Lama
          </h3>
          <p style={{ fontSize: "0.85rem", color: COLOR.gray, marginBottom: "1.5rem" }}>
            Upload file Excel (.xlsx) yang berisi data siswa, nilai ujian, dan data orang tua dari platform lama.
            Formatnya mirip dengan file data KKN UGM.
          </p>

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${isDragging ? COLOR.navy : COLOR.border}`,
              borderRadius: "1rem",
              padding: "3rem 2rem",
              textAlign: "center",
              cursor: isParsing ? "wait" : "pointer",
              background: isDragging ? "#eff6ff" : "#fafafa",
              transition: "all 0.2s",
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
            {isParsing ? (
              <div>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    border: `4px solid ${COLOR.border}`,
                    borderTop: `4px solid ${COLOR.navy}`,
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite",
                    margin: "0 auto 1rem",
                  }}
                />
                <p style={{ color: COLOR.navy, fontWeight: 600 }}>Membaca file Excel...</p>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: "3rem", marginBottom: "0.75rem" }}>📊</div>
                <p style={{ fontWeight: 700, color: COLOR.navy, fontSize: "1rem" }}>
                  Klik atau seret file di sini
                </p>
                <p style={{ color: COLOR.gray, fontSize: "0.85rem", marginTop: "0.25rem" }}>
                  Format yang didukung: .xlsx, .xls, .csv
                </p>
              </div>
            )}
          </div>

          {/* Template download */}
          <div
            style={{
              marginTop: "1rem",
              padding: "0.75rem 1rem",
              background: "#fffbeb",
              border: "1px solid #fcd34d",
              borderRadius: "0.5rem",
              fontSize: "0.82rem",
              color: "#92400e",
            }}
          >
            💡 <strong>Belum punya template?</strong> Pastikan file Excel Anda memiliki kolom seperti:{" "}
            <code>nama_siswa, nisn, nama_sekolah, kelas, pendidikan_ayah, pekerjaan_ayah, LIT-0-1, NUM-0-1, dst.</code>
          </div>

          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* ── Step 2: Configure ────────────────────────────────────────────────── */}
      {step === "configure" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* File info card */}
          <div
            style={{
              padding: "0.75rem 1rem",
              background: isLongFormat ? "#eff6ff" : "#f0fdf4",
              border: `1px solid ${isLongFormat ? "#bfdbfe" : "#86efac"}`,
              borderRadius: "0.5rem",
              fontSize: "0.85rem",
              color: isLongFormat ? "#1e40af" : "#166534",
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              flexWrap: "wrap",
            }}
          >
            <span>✅ <strong>{uploadedFile?.name}</strong> — {parsedRows.length.toLocaleString("id-ID")} baris data</span>
            <span style={{
              background: isLongFormat ? "#1e40af" : "#166534",
              color: "#fff",
              padding: "0.1rem 0.6rem",
              borderRadius: "9999px",
              fontSize: "0.72rem",
              fontWeight: 700,
              letterSpacing: "0.05em",
            }}>
              {isLongFormat ? "FORMAT LONG ✓" : "FORMAT WIDE ✓"}
            </span>
            {isLongFormat && (
              <span style={{ color: "#6b7280", fontSize: "0.78rem" }}>
                1 baris = 1 jawaban soal — sistem akan mengelompokkan per siswa otomatis
              </span>
            )}
          </div>


          <div className="card" style={{ padding: "1.5rem" }}>
            <h3
              style={{
                fontFamily: "Lora, serif",
                color: COLOR.navy,
                fontSize: "1.1rem",
                fontWeight: 700,
                marginBottom: "1.25rem",
              }}
            >
              Konfigurasi Migrasi
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
              {/* Community target */}
              <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                <label className="form-label">Komunitas Tujuan</label>
                <select
                  className="form-input"
                  value={targetCommunityId}
                  onChange={(e) => setTargetCommunityId(e.target.value)}
                >
                  <option value="auto">🔄 Otomatis (baca dari kolom komunitas di Excel)</option>
                  {communities.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <p style={{ fontSize: "0.75rem", color: COLOR.gray, marginTop: "0.25rem" }}>
                  Jika "Otomatis", sistem akan membaca nama komunitas dari kolom Excel dan auto-create jika belum ada.
                </p>
              </div>

              {/* Mode */}
              <div className="form-group">
                <label className="form-label">Mode Migrasi</label>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.25rem" }}>
                  {[
                    {
                      val: "production",
                      label: "🚀 Produksi (Data Utama)",
                      desc: "Data masuk ke database utama, langsung terlihat di dashboard",
                      color: "#166534",
                      bg: "#f0fdf4",
                      border: "#86efac",
                    },
                    {
                      val: "sandbox",
                      label: "🧪 Sandbox (Uji Coba)",
                      desc: "Data di-flag sebagai sandbox, tidak mempengaruhi laporan utama",
                      color: "#92400e",
                      bg: "#fffbeb",
                      border: "#fcd34d",
                    },
                  ].map((opt) => (
                    <label
                      key={opt.val}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "0.75rem",
                        padding: "0.75rem",
                        border: `1px solid ${mode === opt.val ? opt.border : COLOR.border}`,
                        borderRadius: "0.5rem",
                        background: mode === opt.val ? opt.bg : "#fff",
                        cursor: "pointer",
                        transition: "all 0.2s",
                      }}
                    >
                      <input
                        type="radio"
                        value={opt.val}
                        checked={mode === opt.val}
                        onChange={() => setMode(opt.val as any)}
                        style={{ marginTop: "2px" }}
                      />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "0.85rem", color: mode === opt.val ? opt.color : COLOR.navy }}>
                          {opt.label}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: COLOR.gray }}>{opt.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Phase */}
              <div className="form-group">
                <label className="form-label">Nama Fase Asesmen</label>
                <input
                  type="text"
                  className="form-input"
                  value={phaseName}
                  onChange={(e) => setPhaseName(e.target.value)}
                  placeholder="fase_1"
                />
                <p style={{ fontSize: "0.75rem", color: COLOR.gray, marginTop: "0.25rem" }}>
                  Fase yang akan digunakan untuk sesi ujian yang dimigrasi (contoh: fase_1, kkn_ugm_2024)
                </p>
              </div>
            </div>

            {/* Detected columns summary */}
            <div style={{ marginTop: "1.5rem" }}>
              <p style={{ fontSize: "0.85rem", fontWeight: 600, color: COLOR.navy, marginBottom: "0.75rem" }}>
                Kolom yang Terdeteksi Otomatis
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "0.5rem" }}>
                {Object.entries(columnMap).map(([field, detected]) => (
                  <div
                    key={field}
                    style={{
                      padding: "0.4rem 0.75rem",
                      borderRadius: "0.375rem",
                      background: detected ? "#f0fdf4" : "#fef9f0",
                      border: `1px solid ${detected ? "#86efac" : COLOR.border}`,
                      fontSize: "0.75rem",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <span style={{ color: COLOR.gray, fontWeight: 500 }}>{field}</span>
                    <span style={{ color: detected ? "#166534" : "#b45309", fontWeight: 600 }}>
                      {detected ? `✓ "${detected}"` : "— tidak ditemukan"}
                    </span>
                  </div>
                ))}
              </div>

              {answerColumns.length > 0 && (
                <div
                  style={{
                    marginTop: "0.75rem",
                    padding: "0.5rem 0.75rem",
                    background: "#eff6ff",
                    borderRadius: "0.375rem",
                    fontSize: "0.78rem",
                    color: "#1e40af",
                    border: "1px solid #bfdbfe",
                  }}
                >
                  📝 <strong>{answerColumns.length} kolom jawaban terdeteksi:</strong>{" "}
                  {answerColumns.slice(0, 8).join(", ")}{answerColumns.length > 8 ? ` ... +${answerColumns.length - 8} lainnya` : ""}
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem", justifyContent: "flex-end" }}>
              <button
                onClick={() => { setStep("upload"); setUploadedFile(null); setParsedRows([]); }}
                style={{
                  padding: "0.625rem 1.25rem",
                  border: `1px solid ${COLOR.border}`,
                  borderRadius: "0.5rem",
                  background: "#fff",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                  color: COLOR.gray,
                }}
              >
                ← Ganti File
              </button>
              <button
                onClick={handleValidate}
                disabled={isValidating}
                style={{
                  padding: "0.625rem 1.5rem",
                  border: "none",
                  borderRadius: "0.5rem",
                  background: isValidating ? COLOR.border : COLOR.navy,
                  color: "#fff",
                  cursor: isValidating ? "not-allowed" : "pointer",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  transition: "all 0.2s",
                }}
              >
                {isValidating ? "Memeriksa data..." : "🔍 Cek & Preview Data →"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Step 3: Validate ─────────────────────────────────────────────────── */}
      {step === "validate" && validationResult && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Summary cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.75rem" }}>
            {[
              { label: "Total Baris", value: validationResult.totalRows, color: COLOR.navy, bg: "#eff6ff" },
              { label: "Baris Valid", value: validationResult.validRows, color: "#166534", bg: "#f0fdf4" },
              { label: "Error", value: validationResult.errors.length, color: validationResult.errors.length > 0 ? COLOR.red : "#166534", bg: validationResult.errors.length > 0 ? "#fef2f2" : "#f0fdf4" },
              { label: "Peringatan", value: validationResult.warnings.length, color: "#92400e", bg: "#fffbeb" },
            ].map((card) => (
              <div
                key={card.label}
                style={{
                  padding: "1rem",
                  background: card.bg,
                  borderRadius: "0.75rem",
                  border: `1px solid ${card.color}22`,
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "1.75rem", fontWeight: 800, color: card.color, fontFamily: "Lora, serif" }}>
                  {card.value}
                </div>
                <div style={{ fontSize: "0.75rem", color: COLOR.gray, marginTop: "0.25rem" }}>{card.label}</div>
              </div>
            ))}
          </div>

          {/* Summary info */}
          <div className="card" style={{ padding: "1.25rem" }}>
            <p style={{ fontWeight: 600, color: COLOR.navy, fontSize: "0.9rem", marginBottom: "0.75rem" }}>
              Ringkasan Data yang Akan Dimigrasi
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", fontSize: "0.82rem" }}>
              <div>🏘️ <strong>{validationResult.summary.uniqueCommunities.length}</strong> komunitas unik</div>
              <div>🏫 <strong>{validationResult.summary.uniqueSchools.length}</strong> sekolah unik</div>
              {isLongFormat && validationResult.summary.longFormatStats ? (
                <>
                  <div style={{ gridColumn: "1 / -1", marginTop: "0.25rem", paddingTop: "0.25rem", borderTop: "1px dashed #e5e7eb" }}>
                    📝 <strong>Format LONG Terdeteksi</strong> (1 baris = 1 jawaban)
                  </div>
                  <div>🙋 <strong>{validationResult.summary.longFormatStats.totalStudents}</strong> siswa unik</div>
                  <div>✅ <strong>{validationResult.summary.longFormatStats.validAnswers.toLocaleString("id-ID")}</strong> baris jawaban valid</div>
                  <div>📋 <strong>{validationResult.summary.longFormatStats.uniqueQuestionCodes.length}</strong> kode soal dikenali</div>
                </>
              ) : isLongFormat ? (
                <div>📝 <strong>Format LONG</strong> (jawaban ada di tiap baris)</div>
              ) : (
                <div>📝 <strong>{validationResult.summary.totalAnswerCols}</strong> kolom jawaban ujian</div>
              )}
              <div style={{ color: validationResult.summary.unknownSES.length > 0 ? "#b45309" : "#166534" }}>
                {validationResult.summary.unknownSES.length > 0
                  ? `⚠️ ${validationResult.summary.unknownSES.length} variabel SES tidak dikenal`
                  : "✅ Semua variabel SES valid"}
              </div>
            </div>
          </div>

          {/* Errors */}
          {validationResult.errors.length > 0 && (
            <div className="card" style={{ padding: "1.25rem", border: "1px solid #fca5a5" }}>
              <p style={{ fontWeight: 700, color: COLOR.red, marginBottom: "0.75rem", fontSize: "0.9rem" }}>
                ❌ Error yang Ditemukan ({validationResult.errors.length})
              </p>
              <div style={{ maxHeight: "200px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                {validationResult.errors.slice(0, 50).map((e, i) => (
                  <div
                    key={i}
                    style={{
                      fontSize: "0.78rem",
                      padding: "0.35rem 0.6rem",
                      background: "#fef2f2",
                      borderRadius: "0.375rem",
                      color: "#991b1b",
                    }}
                  >
                    {e.message}
                  </div>
                ))}
                {validationResult.errors.length > 50 && (
                  <div style={{ fontSize: "0.78rem", color: COLOR.gray, textAlign: "center", paddingTop: "0.25rem" }}>
                    ... dan {validationResult.errors.length - 50} error lainnya
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Warnings */}
          {validationResult.warnings.length > 0 && (
            <div className="card" style={{ padding: "1.25rem", border: "1px solid #fcd34d" }}>
              <p style={{ fontWeight: 700, color: "#92400e", marginBottom: "0.75rem", fontSize: "0.9rem" }}>
                ⚠️ Peringatan ({validationResult.warnings.length}) — Baris ini akan diproses dengan data parsial
              </p>
              <div style={{ maxHeight: "180px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                {validationResult.warnings.slice(0, 30).map((w, i) => (
                  <div
                    key={i}
                    style={{
                      fontSize: "0.78rem",
                      padding: "0.35rem 0.6rem",
                      background: "#fffbeb",
                      borderRadius: "0.375rem",
                      color: "#78350f",
                    }}
                  >
                    {w.message}
                  </div>
                ))}
                {validationResult.warnings.length > 30 && (
                  <div style={{ fontSize: "0.78rem", color: COLOR.gray, textAlign: "center" }}>
                    ... dan {validationResult.warnings.length - 30} peringatan lainnya
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
            <button
              onClick={() => setStep("configure")}
              style={{
                padding: "0.625rem 1.25rem",
                border: `1px solid ${COLOR.border}`,
                borderRadius: "0.5rem",
                background: "#fff",
                cursor: "pointer",
                fontSize: "0.875rem",
                color: COLOR.gray,
              }}
            >
              ← Kembali
            </button>
            <button
              onClick={handleExecute}
              disabled={validationResult.validRows === 0}
              style={{
                padding: "0.75rem 2rem",
                border: "none",
                borderRadius: "0.5rem",
                background: validationResult.validRows === 0 ? COLOR.border : COLOR.orange,
                color: "#fff",
                cursor: validationResult.validRows === 0 ? "not-allowed" : "pointer",
                fontSize: "0.9rem",
                fontWeight: 700,
                boxShadow: validationResult.validRows > 0 ? "0 4px 14px rgba(223,99,47,0.35)" : "none",
                transition: "all 0.2s",
              }}
            >
              🚀 Mulai Migrasi {validationResult.validRows} Siswa
            </button>
          </div>
        </div>
      )}

      {/* ── Step 4: Execute ────────────────────────────────────────────────────── */}
      {(step === "execute" || step === "done") && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Progress card */}
          <div className="card" style={{ padding: "2rem", textAlign: "center" }}>
            <PemantikLogoProgress
              value={completedStudents}
              max={totalStudents || 1}
              size={140}
              durationMs={600}
            />
            <h3
              style={{
                fontFamily: "Lora, serif",
                color: COLOR.navy,
                fontSize: "1.1rem",
                fontWeight: 700,
                marginTop: "1rem",
                marginBottom: "0.25rem",
              }}
            >
              {step === "done" ? "Migrasi Selesai! 🎉" : "Migrasi Sedang Berjalan..."}
            </h3>
            <p style={{ color: COLOR.gray, fontSize: "0.85rem" }}>
              {step === "done"
                ? `${completedStudents} dari ${totalStudents} baris telah diproses`
                : `Memproses ${completedStudents} / ${totalStudents} siswa...`}
            </p>
          </div>

          {/* Real-time logs */}
          <div className="card" style={{ padding: "1.25rem" }}>
            <p style={{ fontWeight: 600, color: COLOR.navy, fontSize: "0.9rem", marginBottom: "0.75rem" }}>
              📋 Log Proses
            </p>
            <div
              style={{
                maxHeight: "300px",
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: "0.3rem",
                fontFamily: "monospace",
                fontSize: "0.78rem",
              }}
            >
              {logs.map((log, i) => {
                const colorMap = {
                  info: COLOR.gray,
                  success: "#166534",
                  error: COLOR.red,
                  warning: "#92400e",
                };
                const bgMap = {
                  info: "transparent",
                  success: "#f0fdf4",
                  error: "#fef2f2",
                  warning: "#fffbeb",
                };
                return (
                  <div
                    key={i}
                    style={{
                      color: colorMap[log.type],
                      background: bgMap[log.type],
                      padding: bgMap[log.type] !== "transparent" ? "0.2rem 0.5rem" : "0",
                      borderRadius: "0.25rem",
                    }}
                  >
                    <span style={{ color: "#9ca3af" }}>[{log.time}]</span> {log.message}
                  </div>
                );
              })}
              <div ref={logsEndRef} />
            </div>
          </div>

          {/* Final report */}
          {step === "done" && finalReport && (
            <div className="card" style={{ padding: "1.5rem" }}>
              <p style={{ fontWeight: 700, color: COLOR.navy, fontSize: "1rem", marginBottom: "1rem", fontFamily: "Lora, serif" }}>
                📊 Laporan Hasil Migrasi
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem", marginBottom: "1rem" }}>
                {[
                  { label: "Berhasil dimigrasi", value: finalReport.inserted, color: "#166534", bg: "#f0fdf4" },
                  { label: "Dilewati / Error", value: finalReport.skipped + finalReport.errors, color: "#92400e", bg: "#fffbeb" },
                  { label: "Akun baru dibuat", value: finalReport.credentials.length, color: COLOR.navy, bg: "#eff6ff" },
                ].map((c) => (
                  <div key={c.label} style={{ padding: "0.75rem", background: c.bg, borderRadius: "0.5rem", textAlign: "center" }}>
                    <div style={{ fontSize: "1.5rem", fontWeight: 800, color: c.color }}>{c.value}</div>
                    <div style={{ fontSize: "0.75rem", color: COLOR.gray }}>{c.label}</div>
                  </div>
                ))}
              </div>

              {/* Credentials */}
              {finalReport.credentials.length > 0 && (
                <div>
                  <p style={{ fontWeight: 600, fontSize: "0.85rem", color: COLOR.navy, marginBottom: "0.5rem" }}>
                    🔑 Akun Baru yang Dibuat (simpan informasi ini!)
                  </p>
                  <div
                    style={{
                      background: "#f9fafb",
                      border: "1px solid #e5e7eb",
                      borderRadius: "0.5rem",
                      overflow: "hidden",
                      fontSize: "0.78rem",
                    }}
                  >
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ background: "#f3f4f6" }}>
                          <th style={{ padding: "0.5rem 0.75rem", textAlign: "left", color: COLOR.navy }}>Tipe</th>
                          <th style={{ padding: "0.5rem 0.75rem", textAlign: "left", color: COLOR.navy }}>Nama</th>
                          <th style={{ padding: "0.5rem 0.75rem", textAlign: "left", color: COLOR.navy }}>Username</th>
                          <th style={{ padding: "0.5rem 0.75rem", textAlign: "left", color: COLOR.navy }}>Password</th>
                        </tr>
                      </thead>
                      <tbody>
                        {finalReport.credentials.map((cred, i) => (
                          <tr key={i} style={{ borderTop: "1px solid #e5e7eb" }}>
                            <td style={{ padding: "0.5rem 0.75rem" }}>
                              <span style={{ background: "#eff6ff", color: "#1d4ed8", padding: "0.1rem 0.4rem", borderRadius: "0.25rem", fontSize: "0.72rem", fontWeight: 600 }}>
                                {cred.type}
                              </span>
                            </td>
                            <td style={{ padding: "0.5rem 0.75rem", fontWeight: 500 }}>{cred.name}</td>
                            <td style={{ padding: "0.5rem 0.75rem", fontFamily: "monospace" }}>{cred.username}</td>
                            <td style={{ padding: "0.5rem 0.75rem", fontFamily: "monospace", color: "#166534" }}>{cred.password}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p style={{ fontSize: "0.72rem", color: "#92400e", marginTop: "0.5rem" }}>
                    ⚠️ Default PIN siswa: <strong>123456</strong> — minta siswa untuk menggantinya.
                  </p>
                </div>
              )}

              <div style={{ marginTop: "1rem", display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
                <button
                  onClick={() => {
                    setStep("upload");
                    setUploadedFile(null);
                    setParsedRows([]);
                    setHeaders([]);
                    setValidationResult(null);
                    setFinalReport(null);
                    setLogs([]);
                    setCompletedStudents(0);
                  }}
                  style={{
                    padding: "0.625rem 1.5rem",
                    border: `1px solid ${COLOR.navy}`,
                    borderRadius: "0.5rem",
                    background: "#fff",
                    color: COLOR.navy,
                    cursor: "pointer",
                    fontSize: "0.875rem",
                    fontWeight: 600,
                  }}
                >
                  + Migrasi File Baru
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
