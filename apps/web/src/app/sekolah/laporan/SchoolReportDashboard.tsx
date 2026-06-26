"use client";

import React, { useState, useMemo, useCallback } from "react";
import { Button, Badge, useToast } from "@pemantik/ui";
import SearchableSelect from "@/components/shared/SearchableSelect";

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

interface Props {
  packages: { id: string; name: string }[];
  classes: { id: string; name: string; grade: number }[];
  schoolId: string;
}

export default function SchoolReportDashboard({ packages, classes, schoolId }: Props) {
  const [selectedPackageId, setSelectedPackageId] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("all");
  const [selectedGender, setSelectedGender] = useState("all");
  const [selectedSes, setSelectedSes] = useState("all");
  const [search, setSearch] = useState("");
  const [reportData, setReportData] = useState<ReportRow[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const { success: showSuccess, error: showError, info: showInfo } = useToast();

  const handlePackageChange = useCallback(async (pkgId: string) => {
    setSelectedPackageId(pkgId);
    setSelectedClassId("all");
    setSelectedGender("all");
    setSelectedSes("all");
    setSearch("");
    setReportData([]);
    if (!pkgId) return;

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
  }, [schoolId, showError]);

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
      avgLit: (sum("score_lit") / n).toFixed(1),
      avgNum: (sum("score_num") / n).toFixed(1),
    };
  }, [filtered]);

  const handleExport = async () => {
    if (!selectedPackageId) {
      showInfo("Pilih Kategori", "Pilih Kategori Ujian terlebih dahulu.");
      return;
    }
    setIsExporting(true);
    try {
      const url = new URL(window.location.origin + "/api/export/detailed-results");
      url.searchParams.append("category_id", selectedPackageId);
      url.searchParams.append("target_id", schoolId);
      url.searchParams.append("target_type", "school");

      const res = await fetch(url.toString());
      if (!res.ok) throw new Error((await res.json()).error || "Server error");

      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = window.URL.createObjectURL(blob);
      a.download = `Laporan_Sekolah_${selectedPackageId.substring(0, 8)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      showSuccess("Berhasil", "File laporan berhasil diunduh.");
    } catch (err: any) {
      showError("Gagal Export", err.message || "Terjadi kesalahan.");
    } finally {
      setIsExporting(false);
    }
  };

  const Skeleton = ({ h = 48 }: { h?: number }) => (
    <div className="skeleton" style={{ height: h, borderRadius: 8, marginBottom: 8 }} />
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* ── Filter Panel ── */}
      <div className="card" style={{ padding: "1.5rem" }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 600, color: "#102e50", marginBottom: "1.25rem" }}>
          Pusat Data Hasil Ujian
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem" }}>
          <div>
            <label className="form-label">Kategori Ujian <span style={{ color: "#dc2626" }}>*</span></label>
            <SearchableSelect
              name="category_id"
              options={packages.map((p) => ({ value: p.id, label: p.name }))}
              value={selectedPackageId}
              onChange={handlePackageChange}
              placeholder="— Pilih Kategori —"
            />
          </div>
          <div>
            <label className="form-label">Kelas</label>
            <select className="form-input" value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)} disabled={!selectedPackageId || isLoadingData}>
              <option value="all">Semua Kelas</option>
              {classes.map((c) => <option key={c.id} value={c.id}>Kelas {c.grade} — {c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Gender</label>
            <select className="form-input" value={selectedGender} onChange={(e) => setSelectedGender(e.target.value)} disabled={!selectedPackageId || isLoadingData}>
              <option value="all">Semua</option>
              <option value="L">Laki-laki (L)</option>
              <option value="P">Perempuan (P)</option>
            </select>
          </div>
          <div>
            <label className="form-label">SES</label>
            <select className="form-input" value={selectedSes} onChange={(e) => setSelectedSes(e.target.value)} disabled={!selectedPackageId || isLoadingData}>
              <option value="all">Semua SES</option>
              {["I","II","III","IV"].map((s) => <option key={s} value={s}>SES {s}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Cari Nama / NISN</label>
            <input type="text" className="form-input" placeholder="Ketik pencarian..." value={search} onChange={(e) => setSearch(e.target.value)} disabled={!selectedPackageId || isLoadingData} />
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1.25rem" }}>
          <Button onClick={handleExport} disabled={!selectedPackageId || isExporting || isLoadingData} style={{ backgroundColor: "#0874aa", color: "white", gap: "0.5rem" }}>
            {isExporting ? <><span className="btn-spinner" /> Memproses...</> : <>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Download Excel
            </>}
          </Button>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      {isLoadingData ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem" }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card" style={{ padding: "1.5rem" }}>
              <Skeleton h={40} /><Skeleton h={14} />
            </div>
          ))}
        </div>
      ) : selectedPackageId && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem" }}>
          {[
            { label: "Total Peserta", value: stats.total, color: "#102e50" },
            { label: "Rata-rata Skor Total", value: stats.avgTotal, color: "#0874aa" },
            { label: "Rata-rata Literasi", value: stats.avgLit, color: "#2d9e5f" },
            { label: "Rata-rata Numerasi", value: stats.avgNum, color: "#df632f" },
          ].map((card) => (
            <div key={card.label} className="stat-card" style={{ textAlign: "center", padding: "1.5rem" }}>
              <div style={{ fontSize: "2rem", fontWeight: 700, color: card.color, lineHeight: 1 }}>{card.value}</div>
              <div style={{ fontSize: "0.8rem", color: "#6c757d", marginTop: "0.5rem" }}>{card.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Tabel ── */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {isLoadingData ? (
          <div style={{ padding: "1.5rem" }}>
            {[...Array(6)].map((_, i) => <Skeleton key={i} />)}
          </div>
        ) : (
          <table className="pemantik-table" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>Siswa</th>
                <th>Kelas</th>
                <th>SES</th>
                <th>Status</th>
                <th style={{ textAlign: "center" }}>Percobaan</th>
                <th style={{ textAlign: "center" }}>Soal</th>
                <th style={{ textAlign: "center" }}>Benar</th>
                <th style={{ textAlign: "center" }}>Salah</th>
                <th style={{ textAlign: "center" }}>Skor Total</th>
                <th style={{ textAlign: "center" }}>Literasi</th>
                <th style={{ textAlign: "center" }}>Numerasi</th>
              </tr>
            </thead>
            <tbody>
              {!selectedPackageId ? (
                <tr>
                  <td colSpan={11} style={{ textAlign: "center", padding: "3rem 1rem", color: "#adb5bd" }}>
                    <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📊</div>
                    Pilih Kategori Ujian di atas untuk menampilkan data.
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={11} style={{ textAlign: "center", padding: "3rem 1rem", color: "#adb5bd" }}>
                    <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🔍</div>
                    Tidak ada data yang cocok dengan filter.
                  </td>
                </tr>
              ) : filtered.map((row) => (
                <tr key={row.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: "#212529" }}>{row.full_name}</div>
                    <div style={{ fontSize: "0.78rem", color: "#6c757d", marginTop: "0.1rem" }}>
                      NISN: {row.nisn || "—"} · {row.gender === "L" ? "L" : row.gender === "P" ? "P" : "—"}
                    </div>
                  </td>
                  <td style={{ fontSize: "0.85rem" }}>{row.class_name}</td>
                  <td>{row.ses_class ? <span style={{ padding: "0.15rem 0.4rem", backgroundColor: "#f3f4f6", borderRadius: "0.25rem", fontSize: "0.78rem", fontWeight: 600 }}>SES {row.ses_class}</span> : "—"}</td>
                  <td><Badge variant={row.status === "completed" ? "success" : "warning"}>{row.status === "completed" ? "Selesai" : "Berlangsung"}</Badge></td>
                  <td style={{ textAlign: "center" }}>
                    <span style={{ padding: "0.15rem 0.5rem", backgroundColor: row.attempt_number > 1 ? "#fff7ed" : "#f3f4f6", color: row.attempt_number > 1 ? "#ea580c" : "#4b5563", borderRadius: "999px", fontSize: "0.8rem", fontWeight: 600 }}>
                      ke-{row.attempt_number}
                    </span>
                  </td>
                  <td style={{ textAlign: "center", color: "#6c757d" }}>{row.total_questions}</td>
                  <td style={{ textAlign: "center", fontWeight: 600, color: "#2d9e5f" }}>{row.total_correct}</td>
                  <td style={{ textAlign: "center", fontWeight: 600, color: "#dc2626" }}>{row.total_wrong}</td>
                  <td style={{ textAlign: "center", fontWeight: 700, fontSize: "1rem", color: "#102e50" }}>{row.score_total}</td>
                  <td style={{ textAlign: "center", fontWeight: 600, color: "#2d9e5f" }}>{row.score_lit}</td>
                  <td style={{ textAlign: "center", fontWeight: 600, color: "#df632f" }}>{row.score_num}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {selectedPackageId && !isLoadingData && filtered.length > 0 && (
          <div style={{ padding: "0.75rem 1rem", borderTop: "1px solid #f1f3f5", fontSize: "0.8rem", color: "#6c757d" }}>
            Menampilkan <strong>{filtered.length}</strong> dari <strong>{reportData.length}</strong> data peserta
          </div>
        )}
      </div>
    </div>
  );
}
