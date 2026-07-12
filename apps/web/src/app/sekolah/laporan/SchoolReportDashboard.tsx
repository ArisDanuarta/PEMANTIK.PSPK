"use client";

import React, { useState, useMemo, useCallback } from "react";
import { Button, Badge, useToast } from "@pemantik/ui";
import SearchableSelect from "@/components/shared/SearchableSelect";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ReportRow {
  id: string;
  student_id: string;
  status: string;
  score_total: number;
  score_lit: number;
  score_num: number;
  total_questions: number;
  total_correct: number;
  total_wrong: number;
  time_spent: number;
  completed_at: string;
  phase: string;
  attempt_number: number;
  nisn: string;
  full_name: string;
  gender: string;
  ses_class: string;
  class_id: string;
  class_name: string;
}

interface ClassCard  { class_id: string; class_name: string; grade: number; academic_year: string | null; student_count: number }
interface PhaseCard  { phase: string; valid_from: string | null; valid_until: string | null; student_count: number }
interface LevelCard  { level_number: number; student_count: number }

type SectionType = "per_class" | "per_phase" | "per_level";

interface Props {
  packages: { id: string; name: string }[];
  classes: { id: string; name: string; grade: number }[];
  schoolId: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function downloadFromUrl(objectUrl: string, fileName: string) {
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(objectUrl);
}

// ─── Section Tab ──────────────────────────────────────────────────────────────

function SectionTab({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "0.5rem 1.25rem",
        borderRadius: "0.5rem",
        border: "none",
        cursor: "pointer",
        fontWeight: 600,
        fontSize: "0.875rem",
        transition: "all 0.15s",
        backgroundColor: active ? "#102e50" : "transparent",
        color: active ? "#ffffff" : "#6b7280",
      }}
    >
      {label}
    </button>
  );
}

// ─── Data Card ────────────────────────────────────────────────────────────────

function DataCard({
  title, subtitle, count, countLabel, onDownload, isDownloading,
}: {
  title: string; subtitle?: string; count: number; countLabel: string;
  onDownload: () => void; isDownloading: boolean;
}) {
  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: "0.75rem",
        padding: "1.25rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        transition: "box-shadow 0.15s",
      }}
      onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)")}
      onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.boxShadow = "0 1px 3px rgba(0,0,0,0.06)")}
    >
      <div>
        <div style={{ fontWeight: 700, fontSize: "1rem", color: "#102e50" }}>{title}</div>
        {subtitle && <div style={{ fontSize: "0.78rem", color: "#6b7280", marginTop: "0.2rem" }}>{subtitle}</div>}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: "0.35rem" }}>
        <span style={{ fontSize: "1.75rem", fontWeight: 800, color: "#0874aa", lineHeight: 1 }}>{count}</span>
        <span style={{ fontSize: "0.78rem", color: "#6b7280" }}>{countLabel}</span>
      </div>
      <button
        onClick={onDownload}
        disabled={isDownloading}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem",
          padding: "0.4rem 0.75rem", borderRadius: "0.4rem",
          border: "1px solid #d1d5db",
          backgroundColor: isDownloading ? "#f3f4f6" : "#f8fafc",
          color: isDownloading ? "#9ca3af" : "#374151",
          fontSize: "0.78rem", fontWeight: 600,
          cursor: isDownloading ? "not-allowed" : "pointer",
          transition: "all 0.12s",
        }}
        onMouseEnter={(e) => { if (!isDownloading) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#e0f2fe"; }}
        onMouseLeave={(e) => { if (!isDownloading) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#f8fafc"; }}
      >
        {isDownloading ? "⏳ Memproses..." : (
          <>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download Excel
          </>
        )}
      </button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SchoolReportDashboard({ packages, classes, schoolId }: Props) {
  // ── Kategori & Section ──────────────────────────────────────────────────
  const [selectedPackageId, setSelectedPackageId] = useState("");
  const [activeSection, setActiveSection] = useState<SectionType>("per_class");

  // ── Section data ────────────────────────────────────────────────────────
  const [classCards, setClassCards] = useState<ClassCard[]>([]);
  const [phaseCards, setPhaseCards] = useState<PhaseCard[]>([]);
  const [levelCards, setLevelCards] = useState<LevelCard[]>([]);
  const [isLoadingSection, setIsLoadingSection] = useState(false);

  // ── Toolbar filter ──────────────────────────────────────────────────────
  const [selectedClassId, setSelectedClassId]   = useState("all");
  const [selectedGender, setSelectedGender]     = useState("all");
  const [selectedSes, setSelectedSes]           = useState("all");
  const [search, setSearch]                     = useState("");
  const [reportData, setReportData]             = useState<ReportRow[]>([]);
  const [isLoadingData, setIsLoadingData]       = useState(false);
  const [isExporting, setIsExporting]           = useState(false);

  // ── Card download ───────────────────────────────────────────────────────
  const [downloadingCard, setDownloadingCard] = useState<string | null>(null);

  const { success: showSuccess, error: showError, info: showInfo } = useToast();

  // ── Fetch Section ───────────────────────────────────────────────────────
  const fetchSectionData = useCallback(async (categoryId: string, section: SectionType) => {
    setIsLoadingSection(true);
    try {
      const res = await fetch(
        `/api/report/school-sections?school_id=${schoolId}&category_id=${categoryId}&section=${section}`
      );
      if (!res.ok) throw new Error((await res.json()).error || "Server error");
      const json = await res.json();
      if (section === "per_class") setClassCards(json.data ?? []);
      if (section === "per_phase") setPhaseCards(json.data ?? []);
      if (section === "per_level") setLevelCards(json.data ?? []);
    } catch (err: any) {
      showError("Gagal Memuat Section", err.message || "Terjadi kesalahan.");
    } finally {
      setIsLoadingSection(false);
    }
  }, [schoolId, showError]);

  // ── Handle Paket Change ─────────────────────────────────────────────────
  const handlePackageChange = useCallback(async (pkgId: string) => {
    setSelectedPackageId(pkgId);
    setSelectedClassId("all");
    setSelectedGender("all");
    setSelectedSes("all");
    setSearch("");
    setReportData([]);
    setClassCards([]);
    setPhaseCards([]);
    setLevelCards([]);

    if (!pkgId) return;

    await fetchSectionData(pkgId, activeSection);

    setIsLoadingData(true);
    try {
      const res = await fetch(`/api/report/school-data?school_id=${schoolId}&category_id=${pkgId}`);
      if (!res.ok) throw new Error((await res.json()).error || "Server error");
      const json = await res.json();
      setReportData(json.data ?? []);
    } catch (err: any) {
      showError("Gagal Memuat Data", err.message || "Terjadi kesalahan jaringan.");
    } finally {
      setIsLoadingData(false);
    }
  }, [activeSection, schoolId, fetchSectionData, showError]);

  // ── Handle Section Switch ───────────────────────────────────────────────
  const handleSectionChange = useCallback(async (section: SectionType) => {
    setActiveSection(section);
    if (!selectedPackageId) return;
    if (
      (section === "per_class" && classCards.length > 0) ||
      (section === "per_phase" && phaseCards.length > 0) ||
      (section === "per_level" && levelCards.length > 0)
    ) return;
    await fetchSectionData(selectedPackageId, section);
  }, [selectedPackageId, classCards, phaseCards, levelCards, fetchSectionData]);

  // ── Card Download ───────────────────────────────────────────────────────
  const handleCardDownload = useCallback(async (type: string, filterValue: string) => {
    if (!selectedPackageId) return;
    const cardKey = `${type}-${filterValue}`;
    setDownloadingCard(cardKey);
    try {
      const url = new URL(window.location.origin + "/api/export/card-download");
      url.searchParams.set("type", type);
      url.searchParams.set("category_id", selectedPackageId);
      url.searchParams.set("filter_value", filterValue);
      url.searchParams.set("scope_type", "school");
      url.searchParams.set("scope_id", schoolId);

      const res = await fetch(url.toString());
      if (!res.ok) throw new Error((await res.json()).error || "Server error");

      const blob = await res.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const dateStr = new Date().toISOString().split("T")[0];
      downloadFromUrl(objectUrl, `hasil-ujian_${type}-${filterValue}_${dateStr}.xlsx`);
      showSuccess("Berhasil", "File berhasil diunduh.");
    } catch (err: any) {
      showError("Gagal Download", err.message || "Terjadi kesalahan.");
    } finally {
      setDownloadingCard(null);
    }
  }, [selectedPackageId, schoolId, showError, showSuccess]);

  // ── Toolbar Filter ──────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return reportData.filter((row) => {
      if (selectedClassId !== "all" && row.class_id !== selectedClassId) return false;
      if (selectedGender !== "all" && row.gender !== selectedGender) return false;
      if (selectedSes !== "all" && row.ses_class !== selectedSes) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!row.full_name.toLowerCase().includes(q) && !(row.nisn ?? "").toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [reportData, selectedClassId, selectedGender, selectedSes, search]);

  const stats = useMemo(() => {
    const n = filtered.length;
    if (n === 0) return { total: 0, avgTotal: "0", avgLit: "0", avgNum: "0" };
    const sum = (key: keyof ReportRow) => filtered.reduce((acc, r) => acc + (r[key] as number), 0);
    return {
      total: n,
      avgTotal: (sum("score_total") / n).toFixed(1),
      avgLit:   (sum("score_lit")   / n).toFixed(1),
      avgNum:   (sum("score_num")   / n).toFixed(1),
    };
  }, [filtered]);

  // ── Export Rekap Detail ─────────────────────────────────────────────────
  const handleExport = async () => {
    if (!selectedPackageId) { showInfo("Pilih Kategori", "Pilih Kategori Ujian terlebih dahulu."); return; }
    setIsExporting(true);
    try {
      const url = new URL(window.location.origin + "/api/export/detailed-results");
      url.searchParams.set("category_id", selectedPackageId);
      url.searchParams.set("target_id", schoolId);
      url.searchParams.set("target_type", "school");
      if (selectedClassId !== "all") url.searchParams.set("class_id", selectedClassId);
      if (selectedGender !== "all") url.searchParams.set("gender", selectedGender);
      if (selectedSes !== "all") url.searchParams.set("ses_class", selectedSes);
      if (search) url.searchParams.set("search", search);
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error((await res.json()).error || "Server error");
      const blob = await res.blob();
      const dateStr = new Date().toISOString().split("T")[0];
      downloadFromUrl(window.URL.createObjectURL(blob), `rekap-detail-sekolah_${dateStr}.xlsx`);
      showSuccess("Berhasil", "File rekap detail berhasil diunduh.");
    } catch (err: any) {
      showError("Gagal Export", err.message || "Terjadi kesalahan.");
    } finally {
      setIsExporting(false);
    }
  };

  const NoPkgState = () => (
    <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#9ca3af" }}>
      <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>📊</div>
      <div style={{ fontWeight: 600, color: "#374151", marginBottom: "0.25rem" }}>Pilih Kategori Ujian</div>
      <div style={{ fontSize: "0.85rem" }}>Pilih kategori untuk menampilkan data hasil ujian.</div>
    </div>
  );
  const NoDataState = () => (
    <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#9ca3af" }}>
      <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>🔍</div>
      <div style={{ fontWeight: 600, color: "#374151" }}>Belum ada data</div>
    </div>
  );
  const Skeleton = ({ h = 48 }: { h?: number }) => (
    <div className="skeleton" style={{ height: h, borderRadius: 8, marginBottom: 8 }} />
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

      {/* ── 1. Pilih Kategori ── */}
      <div className="card" style={{ padding: "1.25rem 1.5rem" }}>
        {packages.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2rem 1rem", color: "#6b7280" }}>
            <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📋</div>
            <div style={{ fontWeight: 600, color: "#374151", marginBottom: "0.25rem" }}>Belum Ada Data Ujian</div>
            <div style={{ fontSize: "0.85rem" }}>Belum ada anak yang pernah mengerjakan ujian di sekolah ini.</div>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 280px", minWidth: 0 }}>
              <label className="form-label" style={{ display: "block", marginBottom: "0.4rem", fontWeight: 600, color: "#102e50" }}>
                Kategori Ujian <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <SearchableSelect
                name="category_id"
                options={packages.map((p) => ({ value: p.id, label: p.name }))}
                value={selectedPackageId}
                onChange={handlePackageChange}
                placeholder="— Pilih Kategori Ujian —"
              />
            </div>
            <div style={{ fontSize: "0.8rem", color: "#6b7280", paddingTop: "1.5rem" }}>
              {selectedPackageId
                ? `${packages.find(p => p.id === selectedPackageId)?.name} dipilih`
                : "Pilih kategori untuk menampilkan data."}
            </div>
          </div>
        )}
      </div>

      {/* ── 2. Section Switcher ── */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{
          display: "flex", gap: "0.25rem", padding: "0.75rem 1rem",
          borderBottom: "1px solid #f1f3f5", backgroundColor: "#f8fafc",
        }}>
          <SectionTab active={activeSection === "per_class"} label="Per Kelas"       onClick={() => handleSectionChange("per_class")} />
          <SectionTab active={activeSection === "per_phase"} label="Per Sesi / Fase" onClick={() => handleSectionChange("per_phase")} />
          <SectionTab active={activeSection === "per_level"} label="Per Level"       onClick={() => handleSectionChange("per_level")} />
        </div>

        <div style={{ padding: "1.5rem" }}>
          {!selectedPackageId ? (
            <NoPkgState />
          ) : isLoadingSection ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem" }}>
              {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 140, borderRadius: 12 }} />)}
            </div>
          ) : (
            <>
              {/* PER KELAS */}
              {activeSection === "per_class" && (
                classCards.length === 0 ? <NoDataState /> : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem" }}>
                    {classCards.map((card) => (
                      <DataCard
                        key={card.class_id}
                        title={`Kelas ${card.grade} — ${card.class_name}`}
                        subtitle={card.academic_year ?? undefined}
                        count={card.student_count}
                        countLabel="siswa"
                        onDownload={() => handleCardDownload("class", card.class_id)}
                        isDownloading={downloadingCard === `class-${card.class_id}`}
                      />
                    ))}
                  </div>
                )
              )}

              {/* PER FASE */}
              {activeSection === "per_phase" && (
                phaseCards.length === 0 ? <NoDataState /> : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "1rem" }}>
                    {phaseCards.map((card) => (
                      <DataCard
                        key={card.phase}
                        title={card.phase}
                        subtitle={card.valid_from ? `${fmt(card.valid_from)} – ${fmt(card.valid_until)}` : undefined}
                        count={card.student_count}
                        countLabel="siswa"
                        onDownload={() => handleCardDownload("phase", card.phase)}
                        isDownloading={downloadingCard === `phase-${card.phase}`}
                      />
                    ))}
                  </div>
                )
              )}

              {/* PER LEVEL */}
              {activeSection === "per_level" && (
                levelCards.length === 0 ? <NoDataState /> : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "1rem" }}>
                    {levelCards.map((card) => (
                      <DataCard
                        key={card.level_number}
                        title={`Level ${card.level_number}`}
                        subtitle="Anak yang mengerjakan soal di level ini"
                        count={card.student_count}
                        countLabel="siswa"
                        onDownload={() => handleCardDownload("level", String(card.level_number))}
                        isDownloading={downloadingCard === `level-${card.level_number}`}
                      />
                    ))}
                  </div>
                )
              )}
            </>
          )}
        </div>
      </div>

      {/* ── 3. Banner Export Semua RAW Data (1 Sheet Excel) ── */}
      <div className="card" style={{
        padding: "1.75rem",
        borderRadius: "1.25rem",
        border: "1px solid #bae6fd",
        backgroundColor: "#f0f9ff",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "1.25rem",
      }}>
        <div>
          <div style={{ marginBottom: "0.5rem" }}>
            <Badge variant="info">
              📥 Pusat Unduhan RAW Data
            </Badge>
          </div>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0369a1", margin: 0 }}>
            Ekspor Data Mentah Hasil Ujian (RAW Data)
          </h2>
          <p style={{ fontSize: "0.88rem", color: "#334155", margin: "0.35rem 0 0 0" }}>
            Unduh seluruh data mentah ujian pada kategori ini dalam 1 sheet Excel (termasuk demografi lengkap, SES, durasi, dan jawaban tiap nomor).
          </p>
        </div>

        <Button
          onClick={async () => {
            if (!selectedPackageId) { showInfo("Pilih Kategori", "Pilih Kategori Ujian di atas terlebih dahulu."); return; }
            setIsExporting(true);
            try {
              const url = new URL(window.location.origin + "/api/export/detailed-results");
              url.searchParams.set("category_id", selectedPackageId);
              url.searchParams.set("target_id", schoolId);
              url.searchParams.set("target_type", "school");
              url.searchParams.set("raw", "true");
              const res = await fetch(url.toString());
              if (!res.ok) throw new Error((await res.json()).error || "Server error");
              const blob = await res.blob();
              const dateStr = new Date().toISOString().split("T")[0];
              downloadFromUrl(window.URL.createObjectURL(blob), `RAW_Data_Sekolah_${dateStr}.xlsx`);
              showSuccess("Berhasil Export", "File 1 sheet RAW Data berhasil diunduh.");
            } catch (err: any) {
              showError("Gagal Export", err.message || "Terjadi kesalahan sistem.");
            } finally {
              setIsExporting(false);
            }
          }}
          disabled={!selectedPackageId || isExporting || isLoadingData}
          style={{
            backgroundColor: "#0284c7",
            color: "white",
            fontWeight: 700,
            padding: "0.75rem 1.5rem",
            borderRadius: "0.75rem",
            boxShadow: "0 4px 12px rgba(2, 132, 199, 0.25)",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.6rem",
          }}
        >
          {isExporting ? <><span className="btn-spinner" /> Sedang Mengunduh...</> : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Unduh 1 Sheet RAW Data Sekolah (Excel)
            </>
          )}
        </Button>
      </div>

      {/* ── 4. Daftar Kelas Sekolah & Ekspor per Kelas ── */}
      <div className="card" style={{ padding: 0, overflow: "hidden", borderRadius: "1.25rem", border: "1px solid #e2e8f0" }}>
        <div style={{ padding: "1.5rem", borderBottom: "1px solid #f1f5f9", backgroundColor: "#f8fafc", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
              Daftar Kelas & Jumlah Anak Terdaftar
            </h2>
            <p style={{ fontSize: "0.85rem", color: "#64748b", margin: "0.25rem 0 0 0" }}>
              Daftar seluruh rombongan belajar di sekolah Anda beserta rekapitulasi anak yang telah mengerjakan ujian pada kategori ini.
            </p>
          </div>
        </div>

        {isLoadingData ? (
          <div style={{ padding: "1.5rem" }}>{[...Array(5)].map((_, i) => <div key={i} className="skeleton" style={{ height: 45, marginBottom: 12, borderRadius: 8 }} />)}</div>
        ) : !selectedPackageId ? (
          <div style={{ textAlign: "center", padding: "3.5rem 1rem", color: "#94a3b8" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>📊</div>
            <strong style={{ display: "block", color: "#334155", fontSize: "1.05rem", marginBottom: "0.25rem" }}>
              Pilih Kategori Ujian Terlebih Dahulu
            </strong>
            <p style={{ margin: 0, fontSize: "0.88rem", color: "#64748b" }}>
              Gunakan dropdown di bagian atas halaman untuk memilih paket / kategori asesmen.
            </p>
          </div>
        ) : classCards.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3.5rem 1rem", color: "#94a3b8" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>📭</div>
            <strong style={{ display: "block", color: "#334155", fontSize: "1.05rem", marginBottom: "0.25rem" }}>
              Belum Ada Anak yang Mengerjakan
            </strong>
            <p style={{ margin: 0, fontSize: "0.88rem", color: "#64748b" }}>
              Belum ada data hasil ujian yang tercatat untuk kategori terpilih pada kelas-kelas di sekolah ini.
            </p>
          </div>
        ) : (
          <table className="pemantik-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e2e8f0", backgroundColor: "white", textAlign: "left", color: "#475569", fontSize: "0.85rem" }}>
                <th style={{ padding: "1rem 1.5rem" }}>Rombel / Kelas</th>
                <th style={{ padding: "1rem 1.5rem" }}>Tahun Ajaran</th>
                <th style={{ padding: "1rem 1.5rem", textAlign: "center" }}>Anak Mengerjakan</th>
                <th style={{ padding: "1rem 1.5rem", textAlign: "right" }}>Ekspor Data Mentah</th>
              </tr>
            </thead>
            <tbody>
              {classCards.map((card) => (
                <tr key={card.class_id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "1rem 1.5rem" }}>
                    <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.95rem" }}>
                      Kelas {card.grade} — {card.class_name}
                    </div>
                  </td>
                  <td style={{ padding: "1rem 1.5rem", fontSize: "0.88rem", color: "#64748b" }}>
                    {card.academic_year || "—"}
                  </td>
                  <td style={{ padding: "1rem 1.5rem", textAlign: "center" }}>
                    <div style={{ fontSize: "0.85rem", display: "inline-block" }}>
                      <Badge variant={card.student_count > 0 ? "success" : "warning"}>
                        👥 {card.student_count} Anak
                      </Badge>
                    </div>
                  </td>
                  <td style={{ padding: "1rem 1.5rem", textAlign: "right" }}>
                    <Button
                      onClick={async () => {
                        if (!selectedPackageId) return;
                        const key = `class-${card.class_id}`;
                        setIsExporting(true);
                        try {
                          const url = new URL(window.location.origin + "/api/export/detailed-results");
                          url.searchParams.set("category_id", selectedPackageId);
                          url.searchParams.set("target_id", card.class_id);
                          url.searchParams.set("target_type", "class");
                          url.searchParams.set("class_id", card.class_id);
                          url.searchParams.set("raw", "true");
                          const res = await fetch(url.toString());
                          if (!res.ok) throw new Error((await res.json()).error || "Server error");
                          const blob = await res.blob();
                          const dateStr = new Date().toISOString().split("T")[0];
                          downloadFromUrl(window.URL.createObjectURL(blob), `RAW_Data_Kelas_${card.grade}_${card.class_name}_${dateStr}.xlsx`);
                          showSuccess("Berhasil Export", `Data mentah Kelas ${card.class_name} berhasil diunduh.`);
                        } catch (err: any) {
                          showError("Gagal Export", err.message || "Terjadi kesalahan.");
                        } finally {
                          setIsExporting(false);
                        }
                      }}
                      disabled={isExporting || card.student_count === 0}
                      variant="outline"
                      style={{
                        padding: "0.45rem 1rem",
                        fontSize: "0.82rem",
                        fontWeight: 700,
                        borderColor: "#cbd5e1",
                        color: "#0f172a",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.4rem"
                      }}
                    >
                      📥 Unduh RAW Excel
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
