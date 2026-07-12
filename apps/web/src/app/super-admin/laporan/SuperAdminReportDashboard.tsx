"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { Button, Badge, useToast } from "@pemantik/ui";
import SearchableSelect from "@/components/shared/SearchableSelect";
import { createBrowserClient } from "@pemantik/supabase/client";

interface ReportData {
  id: string;
  nisn: string;
  full_name: string;
  gender: string;
  school_name: string;
  community_name?: string;
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
  // ── Minggu 4: tambahan dari v_assessment_report ──
  final_level_number?: number | null;
  ses_class?: string;
  ses_score?: number | null;
}

interface Option {
  id: string;
  name: string;
}

interface SuperAdminReportDashboardProps {
  communities: Option[];
  packages: Option[];
}

export default function SuperAdminReportDashboard({
  communities,
  packages,
}: SuperAdminReportDashboardProps) {
  const [selectedPackageId, setSelectedPackageId] = useState<string>("");
  const [selectedCommunityId, setSelectedCommunityId] = useState<string>("all");
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>("all");
  const [selectedGender, setSelectedGender] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [reportData, setReportData] = useState<ReportData[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [schools, setSchools] = useState<Option[]>([]);

  const { success: showSuccess, error: showError, info: showInfo } = useToast();
  const supabase = createBrowserClient();

  // Load schools when community changes
  useEffect(() => {
    setSelectedSchoolId("all");
    setSchools([]);
    if (!selectedCommunityId || selectedCommunityId === "all") return;

    const fetchSchools = async () => {
      const { data } = await supabase
        .from("schools")
        .select("id, name")
        .eq("community_id", selectedCommunityId)
        .eq("is_active", true)
        .order("name");
      if (data) setSchools(data);
    };
    fetchSchools();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCommunityId]);

  // --- Fetch data on-demand when package, community, or school changes ---
  useEffect(() => {
    if (!selectedPackageId) {
      setReportData([]);
      return;
    }

    const fetchData = async () => {
      setIsLoadingData(true);
      
      try {
        const url = new URL(window.location.origin + "/api/report/superadmin-data");
        url.searchParams.append("category_id", selectedPackageId);
        if (selectedCommunityId && selectedCommunityId !== "all") {
          url.searchParams.append("community_id", selectedCommunityId);
        }
        if (selectedSchoolId && selectedSchoolId !== "all") {
          url.searchParams.append("school_id", selectedSchoolId);
        }

        const res = await fetch(url.toString());
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
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPackageId, selectedCommunityId, selectedSchoolId]);

  // --- Filter Data client-side (search & gender) ---
  const filteredData = useMemo(() => {
    return reportData.filter((row) => {
      if (selectedGender !== "all" && row.gender !== selectedGender) return false;
      if (search) {
        const query = search.toLowerCase();
        if (
          !row.full_name.toLowerCase().includes(query) &&
          !(row.nisn || "").toLowerCase().includes(query) &&
          !(row.school_name || "").toLowerCase().includes(query)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [reportData, selectedGender, search]);

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
      
      if (selectedSchoolId !== "all") {
        url.searchParams.append("target_id", selectedSchoolId);
        url.searchParams.append("target_type", "school");
      } else if (selectedCommunityId !== "all") {
        url.searchParams.append("target_id", selectedCommunityId);
        url.searchParams.append("target_type", "community");
      } else {
        url.searchParams.append("target_id", "all");
        url.searchParams.append("target_type", "all");
      }

      if (selectedGender !== "all") url.searchParams.append("gender", selectedGender);
      if (search) url.searchParams.append("search", search);

      const response = await fetch(url.toString());
      if (!response.ok) {
        const json = await response.json().catch(() => ({}));
        throw new Error(json.error || "Server error");
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = window.URL.createObjectURL(blob);
      a.download = `Laporan_SuperAdmin_${selectedPackageId.substring(0, 8)}.xlsx`;
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
              onChange={setSelectedPackageId}
              placeholder="-- Pilih Kategori --"
            />
          </div>
          <div>
            <label className="form-label" style={{ display: "block", marginBottom: "0.5rem" }}>
              Filter Komunitas
            </label>
            <select
              className="form-input"
              value={selectedCommunityId}
              onChange={(e) => setSelectedCommunityId(e.target.value)}
              disabled={!selectedPackageId || isLoadingData}
            >
              <option value="all">Semua Komunitas</option>
              {communities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label" style={{ display: "block", marginBottom: "0.5rem" }}>
              Filter Sekolah
            </label>
            <select
              className="form-input"
              value={selectedSchoolId}
              onChange={(e) => setSelectedSchoolId(e.target.value)}
              disabled={!selectedPackageId || isLoadingData || selectedCommunityId === "all"}
            >
              <option value="all">Semua Sekolah</option>
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
              Cari Nama / NISN / Sekolah
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
            <div key={i} className="card animate-pulse" style={{ height: "100px" }} />
          ))}
        </div>
      )}

      {/* ── STATS CARDS ── */}
      {!isLoadingData && reportData.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "1rem",
          }}
        >
          <div className="card" style={{ padding: "1.25rem", borderLeft: "4px solid #0874aa" }}>
            <p style={{ fontSize: "0.85rem", color: "#6c757d", fontWeight: 600 }}>Total Anak</p>
            <h3 style={{ fontSize: "1.8rem", color: "#102e50", margin: "0.25rem 0" }}>{totalSiswa}</h3>
          </div>
          <div className="card" style={{ padding: "1.25rem", borderLeft: "4px solid #10b981" }}>
            <p style={{ fontSize: "0.85rem", color: "#6c757d", fontWeight: 600 }}>Rata-rata Skor</p>
            <h3 style={{ fontSize: "1.8rem", color: "#102e50", margin: "0.25rem 0" }}>{avgTotal}</h3>
          </div>
          <div className="card" style={{ padding: "1.25rem", borderLeft: "4px solid #8b5cf6" }}>
            <p style={{ fontSize: "0.85rem", color: "#6c757d", fontWeight: 600 }}>Rata-rata Literasi</p>
            <h3 style={{ fontSize: "1.8rem", color: "#102e50", margin: "0.25rem 0" }}>{avgLit}</h3>
          </div>
          <div className="card" style={{ padding: "1.25rem", borderLeft: "4px solid #f59e0b" }}>
            <p style={{ fontSize: "0.85rem", color: "#6c757d", fontWeight: 600 }}>Rata-rata Numerasi</p>
            <h3 style={{ fontSize: "1.8rem", color: "#102e50", margin: "0.25rem 0" }}>{avgNum}</h3>
          </div>
        </div>
      )}

      {/* ── EMPTY STATE ── */}
      {!isLoadingData && selectedPackageId && reportData.length === 0 && (
        <div className="card" style={{ padding: "3rem", textAlign: "center", color: "#6c757d" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>📭</div>
          <p style={{ fontWeight: 600, color: "#102e50", marginBottom: "0.5rem" }}>Data Tidak Ditemukan</p>
          <p style={{ fontSize: "0.9rem" }}>Belum ada anak yang menyelesaikan ujian dengan filter yang dipilih.</p>
        </div>
      )}

      {/* ── DATA TABLE ── */}
      {!isLoadingData && filteredData.length > 0 && (
        <div className="card" style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Nama Anak / NISN</th>
                <th>Sekolah</th>
                <th>Fase</th>
                <th style={{ textAlign: "center" }}>Percobaan</th>
                <th style={{ textAlign: "center" }}>Soal</th>
                <th style={{ textAlign: "center" }}>Benar</th>
                <th style={{ textAlign: "center" }}>Salah</th>
                <th style={{ textAlign: "center" }}>Skor Total</th>
                <th style={{ textAlign: "center" }}>Literasi</th>
                <th style={{ textAlign: "center" }}>Numerasi</th>
                <th style={{ textAlign: "center" }}>Level Dicapai</th>
                <th style={{ textAlign: "center" }}>Waktu (Menit)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((row) => (
                <tr key={row.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: "#102e50" }}>{row.full_name}</div>
                    <div style={{ fontSize: "0.8rem", color: "#6c757d" }}>{row.nisn || "-"}</div>
                  </td>
                  <td>
                    <div>{row.school_name}</div>
                    {row.community_name && (
                      <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>{row.community_name}</div>
                    )}
                  </td>
                  <td>{row.phase || "-"}</td>
                  <td style={{ textAlign: "center" }}>
                    <span style={{ padding: "0.15rem 0.5rem", backgroundColor: (row.attempt_number ?? 1) > 1 ? "#fff7ed" : "#f3f4f6", color: (row.attempt_number ?? 1) > 1 ? "#ea580c" : "#4b5563", borderRadius: "999px", fontSize: "0.8rem", fontWeight: 600 }}>
                      ke-{row.attempt_number ?? 1}
                    </span>
                  </td>
                  <td style={{ textAlign: "center", color: "#6c757d" }}>{row.total_questions}</td>
                  <td style={{ textAlign: "center", fontWeight: 600, color: "#2d9e5f" }}>{row.total_correct}</td>
                  <td style={{ textAlign: "center", fontWeight: 600, color: "#dc2626" }}>{row.total_wrong}</td>
                  <td style={{ textAlign: "center", fontWeight: 600 }}>{row.score_total}</td>
                  <td style={{ textAlign: "center" }}>{row.score_lit}</td>
                  <td style={{ textAlign: "center" }}>{row.score_num}</td>
                  <td style={{ textAlign: "center" }}>
                    {row.final_level_number != null ? (
                      <span style={{
                        padding: "0.15rem 0.6rem",
                        borderRadius: "999px",
                        fontSize: "0.8rem",
                        fontWeight: 700,
                        backgroundColor: "#eff6ff",
                        color: "#1d4ed8",
                        border: "1px solid #bfdbfe",
                      }}>
                        Level {row.final_level_number}
                      </span>
                    ) : (
                      <span style={{ color: "#9ca3af", fontSize: "0.8rem" }}>—</span>
                    )}
                  </td>
                  <td style={{ textAlign: "center" }}>{(row.time_spent / 60).toFixed(1)}</td>
                  <td>
                    <Badge variant={row.status === "completed" ? "success" : "warning"}>
                      {row.status === "completed" ? "Selesai" : "Proses"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
