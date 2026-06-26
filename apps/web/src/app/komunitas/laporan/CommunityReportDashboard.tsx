"use client";

import React, { useState, useMemo, useCallback } from "react";
import { Button, Badge, useToast } from "@pemantik/ui";
import SearchableSelect from "@/components/shared/SearchableSelect";

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

interface SchoolOption {
  id: string;
  name: string;
}

interface PackageOption {
  id: string;
  name: string;
}

interface CommunityReportDashboardProps {
  schools: SchoolOption[];
  packages: PackageOption[];
  communityId: string;
}

export default function CommunityReportDashboard({
  schools,
  packages,
  communityId,
}: CommunityReportDashboardProps) {
  const [selectedPackageId, setSelectedPackageId] = useState<string>("");
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>("all");
  const [selectedGender, setSelectedGender] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [reportData, setReportData] = useState<ReportData[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);

  const { success: showSuccess, error: showError, info: showInfo } = useToast();

  // --- Fetch data on-demand when package changes ---
  const handlePackageChange = useCallback(async (pkgId: string) => {
    setSelectedPackageId(pkgId);
    setSelectedSchoolId("all");
    setSelectedGender("all");
    setSearch("");
    setReportData([]);

    if (!pkgId) return;

    setIsLoadingData(true);
    try {
      const res = await fetch(`/api/report/community-data?community_id=${communityId}&category_id=${pkgId}`);
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        showError("Gagal Memuat Data", json.error || "Terjadi kesalahan saat mengambil data laporan.");
        return;
      }
      const json = await res.json();
      setReportData(json.data || []);
    } catch (err) {
      showError("Kesalahan Jaringan", "Tidak dapat menghubungi server. Periksa koneksi Anda.");
    } finally {
      setIsLoadingData(false);
    }
  }, [communityId, showError]);

  // --- Filter Data client-side ---
  const filteredData = useMemo(() => {
    return reportData.filter((row) => {
      if (selectedSchoolId !== "all" && row.school_id !== selectedSchoolId) return false;
      if (selectedGender !== "all" && row.gender !== selectedGender) return false;
      if (search) {
        const query = search.toLowerCase();
        if (
          !row.full_name.toLowerCase().includes(query) &&
          !(row.nisn || "").toLowerCase().includes(query)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [reportData, selectedSchoolId, selectedGender, search]);

  // --- Aggregate Stats ---
  const totalSiswa = filteredData.length;
  const avgTotal = totalSiswa
    ? (filteredData.reduce((acc, r) => acc + r.score_total, 0) / totalSiswa).toFixed(1)
    : "0";
  const avgLit = totalSiswa
    ? (filteredData.reduce((acc, r) => acc + r.score_lit, 0) / totalSiswa).toFixed(1)
    : "0";
  const avgNum = totalSiswa
    ? (filteredData.reduce((acc, r) => acc + r.score_num, 0) / totalSiswa).toFixed(1)
    : "0";

  // --- Export ---
  const handleExport = async () => {
    if (!selectedPackageId) {
      showInfo("Pilih Kategori", "Silakan pilih Kategori Ujian terlebih dahulu sebelum mengunduh data.");
      return;
    }

    setIsExporting(true);
    try {
      const url = new URL(window.location.origin + "/api/export/detailed-results");
      url.searchParams.append("category_id", selectedPackageId);
      url.searchParams.append("target_id", communityId);
      url.searchParams.append("target_type", "community");

      const response = await fetch(url.toString());
      if (!response.ok) {
        const json = await response.json().catch(() => ({}));
        throw new Error(json.error || "Server error");
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = window.URL.createObjectURL(blob);
      a.download = `Laporan_Komunitas_${selectedPackageId.substring(0, 8)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
      showSuccess("Berhasil", "File laporan berhasil diunduh.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan saat mengunduh data.";
      showError("Gagal Export", msg);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* ── FILTER SECTION ── */}
      <div className="card" style={{ padding: "1.5rem" }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 600, color: "#102e50", marginBottom: "1.25rem" }}>
          Pusat Data Hasil Ujian
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
          <div>
            <label className="form-label" style={{ display: "block", marginBottom: "0.5rem" }}>
              Kategori Ujian (Wajib)
            </label>
            <SearchableSelect
              name="category_id"
              options={packages.map((p) => ({ value: p.id, label: p.name }))}
              value={selectedPackageId}
              onChange={handlePackageChange}
              placeholder="-- Pilih Kategori --"
            />
          </div>
          <div>
            <label className="form-label" style={{ display: "block", marginBottom: "0.5rem" }}>
              Filter Sekolah
            </label>
            <select
              className="form-input"
              value={selectedSchoolId}
              onChange={(e) => setSelectedSchoolId(e.target.value)}
              disabled={!selectedPackageId || isLoadingData}
            >
              <option value="all">Semua Sekolah Binaan</option>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label" style={{ display: "block", marginBottom: "0.5rem" }}>
              Filter Gender
            </label>
            <select
              className="form-input"
              value={selectedGender}
              onChange={(e) => setSelectedGender(e.target.value)}
              disabled={!selectedPackageId || isLoadingData}
            >
              <option value="all">Semua Gender</option>
              <option value="L">Laki-laki (L)</option>
              <option value="P">Perempuan (P)</option>
            </select>
          </div>
          <div>
            <label className="form-label" style={{ display: "block", marginBottom: "0.5rem" }}>
              Cari Nama / NISN
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="Ketik pencarian..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              disabled={!selectedPackageId || isLoadingData}
            />
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1.25rem" }}>
          <Button
            onClick={handleExport}
            disabled={!selectedPackageId || isExporting || isLoadingData}
            style={{ backgroundColor: "#0874aa", color: "white", gap: "0.5rem" }}
          >
            {isExporting ? (
              <>
                <span className="btn-spinner" />
                Memproses...
              </>
            ) : (
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                </svg>
                Download Rekap Detail (Excel)
              </>
            )}
          </Button>
        </div>
      </div>

      {/* ── LOADING STATE ── */}
      {isLoadingData && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "1rem",
          }}
        >
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card" style={{ padding: "1.5rem", textAlign: "center" }}>
              <div className="skeleton" style={{ height: 40, width: "60%", margin: "0 auto 0.5rem" }} />
              <div className="skeleton" style={{ height: 14, width: "80%", margin: "0 auto" }} />
            </div>
          ))}
        </div>
      )}

      {/* ── SUMMARY CARDS ── */}
      {selectedPackageId && !isLoadingData && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "1rem",
          }}
        >
          {[
            { label: "Total Peserta", value: totalSiswa, color: "#102e50" },
            { label: "Rata-rata Skor Total", value: avgTotal, color: "#0874aa" },
            { label: "Rata-rata Literasi", value: avgLit, color: "#2d9e5f" },
            { label: "Rata-rata Numerasi", value: avgNum, color: "#df632f" },
          ].map((card) => (
            <div
              key={card.label}
              className="stat-card"
              style={{ textAlign: "center", padding: "1.5rem" }}
            >
              <div
                style={{ fontSize: "2rem", fontWeight: 700, color: card.color, lineHeight: 1 }}
              >
                {card.value}
              </div>
              <div style={{ fontSize: "0.8rem", color: "#6c757d", marginTop: "0.5rem", fontWeight: 500 }}>
                {card.label}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── DATA TABLE ── */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {isLoadingData ? (
          <div style={{ padding: "1.5rem" }}>
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="skeleton"
                style={{ height: 48, borderRadius: 8, marginBottom: "0.5rem" }}
              />
            ))}
          </div>
        ) : (
          <table className="pemantik-table" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>Siswa</th>
                <th>Sekolah</th>
                <th>Fase</th>
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
                  <td
                    colSpan={11}
                    style={{ textAlign: "center", padding: "3rem 1rem", color: "#adb5bd" }}
                  >
                    <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📊</div>
                    Silakan pilih Kategori Ujian di atas untuk menampilkan data hasil.
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td
                    colSpan={11}
                    style={{ textAlign: "center", padding: "3rem 1rem", color: "#adb5bd" }}
                  >
                    <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🔍</div>
                    Tidak ada data yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                filteredData.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: "#212529" }}>{row.full_name}</div>
                      <div style={{ fontSize: "0.78rem", color: "#6c757d", marginTop: "0.15rem" }}>
                        NISN: {row.nisn || "—"} &bull;{" "}
                        {row.gender === "L" ? "Laki-laki" : row.gender === "P" ? "Perempuan" : row.gender}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: "0.88rem" }}>{row.school_name}</div>
                    </td>
                    <td>
                      <Badge>{row.phase || "—"}</Badge>
                    </td>
                    <td>
                      <Badge variant={row.status === "completed" ? "success" : "warning"}>
                        {row.status === "completed" ? "Selesai" : "Berlangsung"}
                      </Badge>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <span style={{ padding: "0.15rem 0.5rem", backgroundColor: (row.attempt_number ?? 1) > 1 ? "#fff7ed" : "#f3f4f6", color: (row.attempt_number ?? 1) > 1 ? "#ea580c" : "#4b5563", borderRadius: "999px", fontSize: "0.8rem", fontWeight: 600 }}>
                        ke-{row.attempt_number ?? 1}
                      </span>
                    </td>
                    <td style={{ textAlign: "center", color: "#6c757d" }}>
                      {row.total_questions}
                    </td>
                    <td style={{ textAlign: "center", fontWeight: 600, color: "#2d9e5f" }}>
                      {row.total_correct}
                    </td>
                    <td style={{ textAlign: "center", fontWeight: 600, color: "#dc2626" }}>
                      {row.total_wrong}
                    </td>
                    <td style={{ textAlign: "center", fontWeight: 700, fontSize: "1rem", color: "#102e50" }}>
                      {row.score_total}
                    </td>
                    <td style={{ textAlign: "center", fontWeight: 600, color: "#2d9e5f" }}>
                      {row.score_lit}
                    </td>
                    <td style={{ textAlign: "center", fontWeight: 600, color: "#df632f" }}>
                      {row.score_num}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {/* Row count footer */}
        {selectedPackageId && !isLoadingData && filteredData.length > 0 && (
          <div
            style={{
              padding: "0.75rem 1rem",
              borderTop: "1px solid #f1f3f5",
              fontSize: "0.8rem",
              color: "#6c757d",
            }}
          >
            Menampilkan <strong>{filteredData.length}</strong> dari{" "}
            <strong>{reportData.length}</strong> data peserta
          </div>
        )}
      </div>
    </div>
  );
}
