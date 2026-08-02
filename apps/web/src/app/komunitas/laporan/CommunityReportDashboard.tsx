"use client";

import React, { useState, useMemo, useCallback } from "react";
import { Button, Badge, useToast } from "@pemantik/ui";
import SearchableSelect from "@/components/shared/SearchableSelect";


// ─── Types ───────────────────────────────────────────────────────────────────

interface ReportData {
  id: string;
  nisn: string;
  full_name: string;
  gender: string;
  school_name: string;
  school_id: string;
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
  category_id: string;
}

interface LevelCard  { level_number: number; student_count: number }
interface PhaseCard  { phase: string; valid_from: string | null; valid_until: string | null; student_count: number }
interface SchoolCard { school_id: string; school_name: string; npsn: string; city: string; student_count: number }

type SectionType = "per_level" | "per_phase" | "per_school";

interface SchoolOption { id: string; name: string }
interface PackageOption { id: string; name: string }

interface Props {
  schools: SchoolOption[];
  packages: PackageOption[];
  communityId: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(iso: string | null | undefined) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function downloadFromUrl(url: string, fileName: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

// ─── Section Switcher Tab Bar ─────────────────────────────────────────────────

function SectionTab({
  active, label, onClick,
}: { active: boolean; label: string; onClick: () => void }) {
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

// ─── Card Components ──────────────────────────────────────────────────────────

function DataCard({
  title, subtitle, count, countLabel, onDownload, isDownloading,
}: {
  title: string;
  subtitle?: string;
  count: number;
  countLabel: string;
  onDownload: () => void;
  isDownloading: boolean;
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
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.4rem",
          padding: "0.4rem 0.75rem",
          borderRadius: "0.4rem",
          border: "1px solid #d1d5db",
          backgroundColor: isDownloading ? "#f3f4f6" : "#f8fafc",
          color: isDownloading ? "#9ca3af" : "#374151",
          fontSize: "0.78rem",
          fontWeight: 600,
          cursor: isDownloading ? "not-allowed" : "pointer",
          transition: "all 0.12s",
        }}
        onMouseEnter={(e) => {
          if (!isDownloading) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#e0f2fe";
        }}
        onMouseLeave={(e) => {
          if (!isDownloading) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#f8fafc";
        }}
      >
        {isDownloading ? (
          "⏳ Memproses..."
        ) : (
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

export default function CommunityReportDashboard({ schools, packages, communityId }: Props) {
  // ── Kategori & Section ──────────────────────────────────────────────────
  const [selectedPackageId, setSelectedPackageId] = useState("");
  const [activeSection, setActiveSection] = useState<SectionType>("per_level");

  // ── Section data ────────────────────────────────────────────────────────
  const [levelCards, setLevelCards]   = useState<LevelCard[]>([]);
  const [phaseCards, setPhaseCards]   = useState<PhaseCard[]>([]);
  const [schoolCards, setSchoolCards] = useState<SchoolCard[]>([]);
  const [isLoadingSection, setIsLoadingSection] = useState(false);

  // ── Toolbar filter (Pusat Data Hasil Ujian) ─────────────────────────────
  const [isExporting, setIsExporting]           = useState(false);
  const [reportData, setReportData]             = useState<ReportData[]>([]);
  const [isLoadingData, setIsLoadingData]       = useState(false);

  // ── Card download loading states ────────────────────────────────────────
  const [downloadingCard, setDownloadingCard] = useState<string | null>(null);

  const { success: showSuccess, error: showError, info: showInfo } = useToast();

  // ── Fetch Section Data ──────────────────────────────────────────────────
  const fetchSectionData = useCallback(async (categoryId: string, section: SectionType) => {
    if (!categoryId) return;
    setIsLoadingSection(true);
    try {
      const res = await fetch(
        `/api/report/community-sections?community_id=${communityId}&category_id=${categoryId}&section=${section}`
      );
      if (!res.ok) {
        let errStr = `Gagal memuat dari server (${res.status})`;
        try { const errJson = await res.json(); if (errJson.error) errStr = errJson.error; } catch (_) {}
        throw new Error(errStr);
      }
      const json = await res.json();

      if (section === "per_level")  setLevelCards(json.data ?? []);
      if (section === "per_phase")  setPhaseCards(json.data ?? []);
      if (section === "per_school") setSchoolCards(json.data ?? []);
    } catch (err: any) {
      showError("Gagal Memuat Section", err.message || "Terjadi kesalahan jaringan.");
    } finally {
      setIsLoadingSection(false);
    }
  }, [communityId, showError]);

  // ── Handle Paket Change ─────────────────────────────────────────────────
  const handlePackageChange = useCallback(async (pkgId: string) => {
    setSelectedPackageId(pkgId);
    setReportData([]);
    setLevelCards([]);
    setPhaseCards([]);
    setSchoolCards([]);

    if (!pkgId) return;

    // Fetch section yang aktif sekaligus toolbar data
    await fetchSectionData(pkgId, activeSection);

    setIsLoadingData(true);
    try {
      const res = await fetch(`/api/report/community-data?community_id=${communityId}&category_id=${pkgId}`);
      if (!res.ok) {
        let errStr = `Gagal memuat data dari server (${res.status})`;
        try { const errJson = await res.json(); if (errJson.error) errStr = errJson.error; } catch (_) {}
        throw new Error(errStr);
      }
      const json = await res.json();
      setReportData(json.data ?? []);
    } catch (err: any) {
      showError("Gagal Memuat Data", err.message || "Terjadi kesalahan jaringan.");
    } finally {
      setIsLoadingData(false);
    }
  }, [activeSection, communityId, fetchSectionData, showError]);

  // ── Handle Section Switch ───────────────────────────────────────────────
  const handleSectionChange = useCallback(async (section: SectionType) => {
    setActiveSection(section);
    if (!selectedPackageId) return;

    // Cek cache
    if (
      (section === "per_level"  && levelCards.length > 0) ||
      (section === "per_phase"  && phaseCards.length > 0) ||
      (section === "per_school" && schoolCards.length > 0)
    ) return;

    await fetchSectionData(selectedPackageId, section);
  }, [selectedPackageId, levelCards, phaseCards, schoolCards, fetchSectionData]);

  // ── Card Download ───────────────────────────────────────────────────────
  const handleCardDownload = useCallback(async (type: string, filterValue: string) => {
    const cardKey = `${type}-${filterValue}`;
    if (!selectedPackageId) return;
    setDownloadingCard(cardKey);
    try {
      const url = new URL(window.location.origin + "/api/export/card-download");
      url.searchParams.set("type", type);
      url.searchParams.set("category_id", selectedPackageId);
      url.searchParams.set("filter_value", filterValue);
      url.searchParams.set("scope_type", "community");
      url.searchParams.set("scope_id", communityId);

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
  }, [selectedPackageId, communityId, showError, showSuccess]);

  // ── Data dan Statistik ──────────────────────────────────────────────────
  const filteredData = reportData;

  const stats = useMemo(() => {
    const n = filteredData.length;
    if (n === 0) return { total: 0, avgTotal: "0", avgLit: "0", avgNum: "0" };
    const sum = (key: keyof ReportData) => filteredData.reduce((acc, r) => acc + (r[key] as number), 0);
    return {
      total: n,
      avgTotal: (sum("score_total") / n).toFixed(1),
      avgLit:   (sum("score_lit")   / n).toFixed(1),
      avgNum:   (sum("score_num")   / n).toFixed(1),
    };
  }, [filteredData]);

  // ── Export RAW Data (1 Sheet) ───────────────────────────────────────────
  const handleExport = async (targetSchoolId: string = "all") => {
    if (!selectedPackageId) {
      showInfo("Pilih Kategori", "Pilih Kategori Ujian terlebih dahulu.");
      return;
    }
    setIsExporting(true);
    try {
      const url = new URL(window.location.origin + "/api/export/detailed-results");
      url.searchParams.set("category_id", selectedPackageId);
      url.searchParams.set("raw", "true");
      if (targetSchoolId !== "all") {
        url.searchParams.set("target_type", "school");
        url.searchParams.set("target_id", targetSchoolId);
      } else {
        url.searchParams.set("target_type", "community");
        url.searchParams.set("target_id", communityId);
      }

      const res = await fetch(url.toString());
      if (!res.ok) {
        let errStr = `Gagal export dari server (${res.status})`;
        try { const errJson = await res.json(); if (errJson.error) errStr = errJson.error; } catch (_) {}
        throw new Error(errStr);
      }

      const blob = await res.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const dateStr = new Date().toISOString().split("T")[0];
      const prefix = targetSchoolId !== "all" ? `raw-data-sekolah_${targetSchoolId}` : `raw-data-komunitas_${communityId}`;
      downloadFromUrl(objectUrl, `${prefix}_${dateStr}.xlsx`);
      showSuccess("Berhasil", "File data berhasil diunduh.");
    } catch (err: any) {
      showError("Gagal Export", err.message || "Terjadi kesalahan.");
    } finally {
      setIsExporting(false);
    }
  };

  // ── Empty State ─────────────────────────────────────────────────────────
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
      <div style={{ fontSize: "0.85rem" }}>Belum ada anak yang mengerjakan ujian untuk kategori ini.</div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

      {/* ── 1. Pilih Kategori (wajib dipilih dulu) ── */}
      <div className="card" style={{ padding: "1.25rem 1.5rem" }}>
        {packages.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2rem 1rem", color: "#6b7280" }}>
            <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📋</div>
            <div style={{ fontWeight: 600, color: "#374151", marginBottom: "0.25rem" }}>Belum Ada Data Ujian</div>
            <div style={{ fontSize: "0.85rem" }}>Belum ada anak yang pernah mengerjakan ujian dalam komunitas ini.</div>
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
                placeholder="- Pilih Kategori Ujian -"
              />
            </div>
            <div style={{ fontSize: "0.8rem", color: "#6b7280", paddingTop: "1.5rem" }}>
              {selectedPackageId ? `${packages.find(p => p.id === selectedPackageId)?.name} dipilih` : "Pilih kategori untuk menampilkan data."}
            </div>
          </div>
        )}
      </div>

      {/* ── 2. Section Switcher ── */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {/* Tab Bar */}
        <div style={{
          display: "flex",
          gap: "0.25rem",
          padding: "0.75rem 1rem",
          borderBottom: "1px solid #f1f3f5",
          backgroundColor: "#f8fafc",
        }}>
          <SectionTab active={activeSection === "per_level"}  label="Per Level"      onClick={() => handleSectionChange("per_level")} />
          <SectionTab active={activeSection === "per_phase"}  label="Per Sesi / Fase" onClick={() => handleSectionChange("per_phase")} />
          <SectionTab active={activeSection === "per_school"} label="Per Sekolah"    onClick={() => handleSectionChange("per_school")} />
        </div>

        {/* Section Content */}
        <div style={{ padding: "1.5rem" }}>
          {!selectedPackageId ? (
            <NoPkgState />
          ) : isLoadingSection ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem" }}>
              {[...Array(4)].map((_, i) => (
                <div key={i} className="skeleton" style={{ height: 140, borderRadius: 12 }} />
              ))}
            </div>
          ) : (
            <>
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

              {/* PER SEKOLAH */}
              {activeSection === "per_school" && (
                schoolCards.length === 0 ? <NoDataState /> : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "1rem" }}>
                    {schoolCards.map((card) => (
                      <DataCard
                        key={card.school_id}
                        title={card.school_name}
                        subtitle={[card.npsn !== "-" ? `NPSN: ${card.npsn}` : null, card.city !== "-" ? card.city : null].filter(Boolean).join(" · ") || undefined}
                        count={card.student_count}
                        countLabel="siswa"
                        onDownload={() => handleCardDownload("school", card.school_id)}
                        isDownloading={downloadingCard === `school-${card.school_id}`}
                      />
                    ))}
                  </div>
                )
              )}
            </>
          )}
        </div>
      </div>

      {/* ── 3. Summary Stat Cards ── */}
      {selectedPackageId && !isLoadingData && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem" }}>
          {[
            { label: "Total Peserta",        value: stats.total,    color: "#102e50" },
            { label: "Rata-rata Skor Total", value: stats.avgTotal, color: "#0874aa" },
            { label: "Rata-rata Literasi",   value: stats.avgLit,   color: "#2d9e5f" },
            { label: "Rata-rata Numerasi",   value: stats.avgNum,   color: "#df632f" },
          ].map((card) => (
            <div key={card.label} className="stat-card" style={{ textAlign: "center", padding: "1.5rem" }}>
              <div style={{ fontSize: "2rem", fontWeight: 700, color: card.color, lineHeight: 1 }}>{card.value}</div>
              <div style={{ fontSize: "0.8rem", color: "black", marginTop: "0.5rem", fontWeight: 500 }}>{card.label}</div>
            </div>
          ))}
        </div>
      )}



      {/* ── 4. Tabel Daftar Sekolah Binaan & Rekapitulasi Peserta (dengan tombol Export RAW Data) ── */}
      <div className="card" style={{ padding: "1.5rem" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1.25rem",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <div>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#102e50", margin: 0 }}>
              Daftar Sekolah Binaan & Rekapitulasi Peserta
            </h2>
            <p style={{ margin: "0.25rem 0 0", fontSize: "0.85rem", color: "#6b7280" }}>
              Daftar seluruh sekolah binaan di bawah komunitas beserta jumlah anak terdaftar dan berpartisipasi dalam asesmen.
            </p>
          </div>
          <Button
            onClick={() => handleExport("all")}
            disabled={!selectedPackageId || isExporting || isLoadingData}
            style={{ backgroundColor: "#0874aa", color: "white", gap: "0.5rem", fontWeight: 600 }}
          >
            {isExporting ? (
              <>
                <span className="btn-spinner" /> Memproses Export...
              </>
            ) : (
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                </svg>
                Export Semua Data (Excel)
              </>
            )}
          </Button>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table className="pemantik-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr
                style={{
                  borderBottom: "2px solid #e5e7eb",
                  textAlign: "left",
                  color: "#4b5563",
                  backgroundColor: "#f8fafc",
                }}
              >
                <th style={{ padding: "0.85rem 1rem" }}>No</th>
                <th style={{ padding: "0.85rem 1rem" }}>Nama Sekolah</th>
                <th style={{ padding: "0.85rem 1rem" }}>NPSN</th>
                <th style={{ padding: "0.85rem 1rem" }}>Kota / Kabupaten</th>
                <th style={{ padding: "0.85rem 1rem", textAlign: "center" }}>Anak Terdaftar</th>
                <th style={{ padding: "0.85rem 1rem", textAlign: "center" }}>Anak Mengerjakan</th>
                <th style={{ padding: "0.85rem 1rem", textAlign: "center" }}>Rata-rata Skor</th>
                <th style={{ padding: "0.85rem 1rem", textAlign: "center" }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {schools.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "3rem 1rem", color: "black" }}>
                    Belum ada sekolah binaan yang terdaftar di komunitas ini.
                  </td>
                </tr>
              ) : (
                schools.map((school, idx) => {
                  const schoolRows = reportData.filter((r) => r.school_id === school.id);
                  const uniqueAssessedStudents = new Set(schoolRows.map((r) => r.nisn || r.id)).size;
                  const avgScore =
                    schoolRows.length > 0
                      ? (schoolRows.reduce((acc, r) => acc + r.score_total, 0) / schoolRows.length).toFixed(1)
                      : "-";

                  return (
                    <tr key={school.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "0.85rem 1rem", color: "#6b7280" }}>{idx + 1}</td>
                      <td style={{ padding: "0.85rem 1rem", fontWeight: 600, color: "#102e50" }}>{school.name}</td>
                      <td style={{ padding: "0.85rem 1rem", color: "#4b5563" }}>{(school as any).npsn || "-"}</td>
                      <td style={{ padding: "0.85rem 1rem", color: "#4b5563" }}>{(school as any).city || "-"}</td>
                      <td style={{ padding: "0.85rem 1rem", textAlign: "center", fontWeight: 600, color: "#1e40af" }}>
                        {(school as any).registeredStudentsCount ?? 0}
                      </td>
                      <td
                        style={{
                          padding: "0.85rem 1rem",
                          textAlign: "center",
                          fontWeight: 600,
                          color: uniqueAssessedStudents > 0 ? "#16a34a" : "#9ca3af",
                        }}
                      >
                        {selectedPackageId ? uniqueAssessedStudents : "-"}
                      </td>
                      <td style={{ padding: "0.85rem 1rem", textAlign: "center", fontWeight: 700, color: "#102e50" }}>
                        {selectedPackageId ? avgScore : "-"}
                      </td>
                      <td style={{ padding: "0.85rem 1rem", textAlign: "center" }}>
                        <button
                          onClick={() => handleExport(school.id)}
                          disabled={!selectedPackageId || isExporting || isLoadingData}
                          style={{
                            padding: "0.35rem 0.75rem",
                            borderRadius: "0.375rem",
                            border: "1px solid #0874aa",
                            backgroundColor: "transparent",
                            color: "#0874aa",
                            fontSize: "0.78rem",
                            fontWeight: 600,
                            cursor: !selectedPackageId || isExporting || isLoadingData ? "not-allowed" : "pointer",
                            opacity: !selectedPackageId || isExporting || isLoadingData ? 0.6 : 1,
                          }}
                          title={
                            !selectedPackageId
                              ? "Pilih Kategori Ujian di atas terlebih dahulu"
                              : `Export Data untuk ${school.name}`
                          }
                        >
                          Export Data
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
