"use client";

import React, { useState, useMemo } from "react";
import DashboardCharts from "./DashboardCharts";
import { Badge, Button } from "@pemantik/ui";
import ExportDataModal from "./ExportDataModal";
import { StatGrid } from "@/components/ui/responsive/StatGrid";
import { ResponsiveTable, Column } from "@/components/ui/responsive/ResponsiveTable";

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

  // --- 4. COMMUNITY STATS PREPARATION (TOP 10) ---
  const communityStats = useMemo(() => {
    return communities.slice(0, 10).map((comm) => {
      const commSchools = schools.filter((s) => s.community_id === comm.id);
      const schoolIds = new Set(commSchools.map((s) => s.id));
      const teachersCount = teachers.filter((t) => t.school_id && schoolIds.has(t.school_id)).length;
      const studentsCount = students.filter((st) => st.school_id && schoolIds.has(st.school_id)).length;

      return {
        id: comm.id,
        name: comm.name || "Komunitas Tanpa Nama",
        code: comm.code || "-",
        is_active: comm.is_active ?? true,
        created_at: comm.created_at,
        schoolsCount: commSchools.length,
        teachersCount,
        studentsCount,
      };
    });
  }, [communities, schools, teachers, students]);

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
      <StatGrid columns={{ base: 1, md: 2, lg: 4 }} className="gap-6">
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
          <p style={{ fontSize: "0.85rem", color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Guru</p>
          <h2 style={{ fontSize: "2rem", fontWeight: 700, color: "#102e50", margin: "0.5rem 0", fontFamily: "var(--font-lora)" }}>
            {teachers.length}
          </h2>
        </div>
        <div className="card" style={{ padding: "1.5rem", borderLeft: "4px solid #a8281c" }}>
          <p style={{ fontSize: "0.85rem", color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Anak</p>
          <h2 style={{ fontSize: "2rem", fontWeight: 700, color: "#a8281c", margin: "0.5rem 0", fontFamily: "var(--font-lora)" }}>
            {students.length}
          </h2>
        </div>
      </StatGrid>

      {/* CHARTS */}
      <DashboardCharts genderData={genderData} assessmentData={assessmentData} ageData={ageData} />

      {/* TABEL 10 DAFTAR KOMUNITAS */}
      <div className="card" style={{ padding: "1.5rem", marginTop: "2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#102e50", margin: 0, fontFamily: "var(--font-lora)" }}>
              10 Daftar Komunitas Binaan
            </h3>
            <p style={{ fontSize: "0.85rem", color: "#64748b", margin: "0.25rem 0 0" }}>
              Ringkasan persebaran jumlah sekolah, guru, dan siswa per komunitas pembina
            </p>
          </div>
          <Badge variant="info">Total {communities.length} Komunitas Terdaftar</Badge>
        </div>

        {communityStats.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem", color: "#6b7280" }}>
            Belum ada data komunitas terdaftar di sistem.
          </div>
        ) : (
          <div className="mt-4">
            <ResponsiveTable 
              data={communityStats}
              keyField="id"
              mode="card"
              columns={[
                {
                  key: "no",
                  header: "No",
                  render: (_, index) => <span className="text-gray-500">{communityStats.indexOf(_) + 1}</span>,
                  hideBelow: "md",
                  priority: 0
                },
                {
                  key: "name",
                  header: "Nama Komunitas / Mitra",
                  render: (c) => <span className="font-semibold text-[#102e50]">{c.name}</span>,
                  priority: 3
                },
                {
                  key: "code",
                  header: "Kode",
                  render: (c) => <code className="bg-slate-100 px-2 py-1 rounded text-[#0874aa] text-xs">{c.code}</code>,
                  priority: 2
                },
                {
                  key: "schools",
                  header: "Jumlah Sekolah",
                  render: (c) => <span className="font-semibold text-slate-800">{c.schoolsCount.toLocaleString("id-ID")}</span>,
                  priority: 1
                },
                {
                  key: "teachers",
                  header: "Jumlah Guru",
                  render: (c) => <span className="font-semibold text-slate-800">{c.teachersCount.toLocaleString("id-ID")}</span>,
                  hideBelow: "md",
                  priority: 0
                },
                {
                  key: "students",
                  header: "Jumlah Anak",
                  render: (c) => <span className="font-semibold text-[#0874aa]">{c.studentsCount.toLocaleString("id-ID")}</span>,
                  hideBelow: "md",
                  priority: 0
                },
                {
                  key: "status",
                  header: "Status",
                  render: (c) => (
                    <Badge variant={c.is_active ? "success" : "default"}>
                      {c.is_active ? "Aktif" : "Non-Aktif"}
                    </Badge>
                  ),
                  priority: 2
                }
              ]}
            />
            {communities.length > 10 && (
              <div style={{ textAlign: "center", padding: "1rem", color: "#6b7280", fontSize: "0.85rem" }}>
                Menampilkan 10 dari total {communities.length} komunitas. Kunjungi menu <a href="/super-admin/komunitas" style={{ color: "#0874aa", fontWeight: 600 }}>Komunitas &amp; Mitra</a> untuk melihat seluruh daftar.
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
