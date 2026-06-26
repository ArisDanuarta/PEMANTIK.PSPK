"use client";

import React, { useState, useMemo } from "react";
import DashboardCharts from "./DashboardCharts";
import { Badge, Button } from "@pemantik/ui";
import ExportDataModal from "./ExportDataModal";

interface IntegratedDashboardManagerProps {
  communities: any[];
  schools: any[];
  teachers: any[];
  students: any[];
  sessions: any[];
}

export default function IntegratedDashboardManager({
  communities,
  schools,
  teachers,
  students,
  sessions
}: IntegratedDashboardManagerProps) {
  const [filterYear, setFilterYear] = useState("all");
  const [filterProvince, setFilterProvince] = useState("all");
  const [filterSes, setFilterSes] = useState("all");
  const [filterGender, setFilterGender] = useState("all");
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Extract unique filter options from sessions and students
  const uniqueYears = Array.from(new Set(sessions.map(s => new Date(s.created_at).getFullYear().toString()))).sort();
  const uniqueProvinces = Array.from(new Set(sessions.map(s => s.school?.province).filter(Boolean))).sort() as string[];

  // --- 1. FILTERING LOGIC ---
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      if (filterYear !== "all" && new Date(s.created_at).getFullYear().toString() !== filterYear) return false;
      if (filterProvince !== "all" && s.school?.province !== filterProvince) return false;
      if (filterSes !== "all" && s.student?.ses_class !== filterSes) return false;
      if (filterGender !== "all" && s.student?.gender !== filterGender) return false;
      return true;
    });
  }, [sessions, filterYear, filterProvince, filterSes, filterGender]);

  // For students, we also filter them to match the charts
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      if (filterSes !== "all" && s.ses_class !== filterSes) return false;
      if (filterGender !== "all" && s.gender !== filterGender) return false;
      // We don't have province directly on student in this basic mock, but if we did we'd filter it.
      // Assuming student dataset aligns with sessions conceptually for the dashboard.
      return true;
    });
  }, [students, filterSes, filterGender]);


  // --- 2. AGGREGATE KPI CARDS ---
  // If no filters applied, show total. If filtered, we could show subset, but usually KPI is global.
  // Let's keep KPI global for Communities/Schools/Teachers, but adapt "Total Sesi" based on filter.
  const totalSesi = filteredSessions.length;
  const passRate = totalSesi > 0 
    ? (filteredSessions.filter(s => (s.score || 0) >= 70).length / totalSesi) * 100 
    : 0;

  // --- 3. CHART DATA PREPARATION ---
  const genderData = useMemo(() => {
    let l = 0, p = 0;
    filteredStudents.forEach(s => {
      if (s.gender === "L") l++;
      else if (s.gender === "P") p++;
    });
    return [
      { name: "Laki-laki", value: l },
      { name: "Perempuan", value: p }
    ];
  }, [filteredStudents]);

  const assessmentData = useMemo(() => {
    let lit = 0, num = 0;
    filteredSessions.forEach(s => {
      if (s.package?.subject_area === "literasi") lit++;
      else if (s.package?.subject_area === "numerasi") num++;
    });
    return [
      { name: "Literasi", value: lit },
      { name: "Numerasi", value: num }
    ];
  }, [filteredSessions]);

  const ageData = useMemo(() => {
    const map: Record<string, number> = {};
    const currentYear = new Date().getFullYear();
    filteredStudents.forEach(s => {
      if (s.birth_date) {
        const age = currentYear - new Date(s.birth_date).getFullYear();
        const key = age + " Thn";
        map[key] = (map[key] || 0) + 1;
      }
    });
    return Object.keys(map).sort().map(k => ({ name: k, value: map[k] }));
  }, [filteredStudents]);

  return (
    <div className="animate-fade-in">
      {/* FILTER BAR */}
      <div style={{
        backgroundColor: "white", padding: "1.5rem", borderRadius: "0.75rem",
        marginBottom: "2rem", display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "flex-end",
        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)", borderLeft: "4px solid #102e50"
      }}>
        <div style={{ flex: "1 1 200px" }}>
          <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#374151", marginBottom: "0.5rem" }}>Tahun</label>
          <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="form-input">
            <option value="all">Semua Tahun</option>
            {uniqueYears.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div style={{ flex: "1 1 200px" }}>
          <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#374151", marginBottom: "0.5rem" }}>Provinsi</label>
          <select value={filterProvince} onChange={e => setFilterProvince(e.target.value)} className="form-input">
            <option value="all">Semua Provinsi</option>
            {uniqueProvinces.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div style={{ flex: "1 1 200px" }}>
          <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#374151", marginBottom: "0.5rem" }}>SES</label>
          <select value={filterSes} onChange={e => setFilterSes(e.target.value)} className="form-input">
            <option value="all">Semua SES</option>
            <option value="atas">Atas</option>
            <option value="menengah">Menengah</option>
            <option value="bawah">Bawah</option>
          </select>
        </div>
        <div style={{ flex: "1 1 200px" }}>
          <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#374151", marginBottom: "0.5rem" }}>Gender</label>
          <select value={filterGender} onChange={e => setFilterGender(e.target.value)} className="form-input">
            <option value="all">Semua Gender</option>
            <option value="L">Laki-laki</option>
            <option value="P">Perempuan</option>
          </select>
        </div>
        <div style={{ flex: "0 0 auto" }}>
          <Button onClick={() => setIsExportModalOpen(true)} style={{ backgroundColor: "#f2af3e", color: "#102e50", fontWeight: 600 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: "0.5rem", display: "inline-block", verticalAlign: "middle" }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            Export Data
          </Button>
        </div>
      </div>

      {/* KPI CARDS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.5rem" }}>
        <div className="card" style={{ padding: "1.5rem", borderLeft: "4px solid #102e50" }}>
          <p style={{ fontSize: "0.85rem", color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Mitra</p>
          <h2 style={{ fontSize: "2rem", fontWeight: 700, color: "#102e50", margin: "0.5rem 0", fontFamily: "var(--font-lora)" }}>
            {communities.length}
          </h2>
        </div>
        <div className="card" style={{ padding: "1.5rem", borderLeft: "4px solid #f2af3e" }}>
          <p style={{ fontSize: "0.85rem", color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Sekolah</p>
          <h2 style={{ fontSize: "2rem", fontWeight: 700, color: "#102e50", margin: "0.5rem 0", fontFamily: "var(--font-lora)" }}>
            {schools.length}
          </h2>
        </div>
        <div className="card" style={{ padding: "1.5rem", borderLeft: "4px solid #0874aa" }}>
          <p style={{ fontSize: "0.85rem", color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Sesi Asesmen (Tersaring)</p>
          <h2 style={{ fontSize: "2rem", fontWeight: 700, color: "#102e50", margin: "0.5rem 0", fontFamily: "var(--font-lora)" }}>
            {totalSesi}
          </h2>
        </div>
        <div className="card" style={{ padding: "1.5rem", borderLeft: "4px solid #a8281c" }}>
          <p style={{ fontSize: "0.85rem", color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Tingkat Kelulusan</p>
          <h2 style={{ fontSize: "2rem", fontWeight: 700, color: "#a8281c", margin: "0.5rem 0", fontFamily: "var(--font-lora)" }}>
            {passRate.toFixed(1)}%
          </h2>
        </div>
      </div>

      {/* CHARTS */}
      <DashboardCharts genderData={genderData} assessmentData={assessmentData} ageData={ageData} />

      {/* TABEL SESI RECENT / TERSARING */}
      <div className="card" style={{ padding: "1.5rem", marginTop: "2rem" }}>
        <h3 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#102e50", marginBottom: "1.5rem", fontFamily: "var(--font-lora)" }}>
          Riwayat Asesmen Siswa
        </h3>
        {filteredSessions.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem", color: "#6b7280" }}>
            Tidak ada data asesmen yang cocok dengan filter.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="table" style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.9rem" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e5e7eb", color: "#374151" }}>
                  <th style={{ padding: "1rem" }}>Tanggal</th>
                  <th style={{ padding: "1rem" }}>Nama Siswa</th>
                  <th style={{ padding: "1rem" }}>Sekolah</th>
                  <th style={{ padding: "1rem" }}>Provinsi</th>
                  <th style={{ padding: "1rem" }}>Kategori Soal</th>
                  <th style={{ padding: "1rem" }}>Nilai</th>
                  <th style={{ padding: "1rem" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredSessions.slice(0, 10).map((s) => (
                  <tr key={s.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                    <td style={{ padding: "1rem" }}>{new Date(s.created_at).toLocaleDateString("id-ID")}</td>
                    <td style={{ padding: "1rem", fontWeight: 500, color: "#102e50" }}>{s.student?.full_name}</td>
                    <td style={{ padding: "1rem" }}>{s.school?.name}</td>
                    <td style={{ padding: "1rem" }}>{s.school?.province || "-"}</td>
                    <td style={{ padding: "1rem" }}>
                      {s.package?.name}
                      <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.25rem" }}>{s.package?.subject_area}</div>
                    </td>
                    <td style={{ padding: "1rem", fontWeight: 600 }}>{s.score !== null ? s.score : "-"}</td>
                    <td style={{ padding: "1rem" }}>
                      <Badge variant={s.status === "completed" ? "success" : "warning"}>
                        {s.status === "completed" ? "Selesai" : "Proses"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredSessions.length > 10 && (
              <div style={{ textAlign: "center", padding: "1rem", color: "#6b7280", fontSize: "0.85rem" }}>
                Menampilkan 10 dari {filteredSessions.length} data. Gunakan fitur Export Data untuk melihat selengkapnya.
              </div>
            )}
          </div>
        )}
      </div>

      {isExportModalOpen && (
        <ExportDataModal 
          sessions={sessions} 
          onClose={() => setIsExportModalOpen(false)} 
        />
      )}
    </div>
  );
}
