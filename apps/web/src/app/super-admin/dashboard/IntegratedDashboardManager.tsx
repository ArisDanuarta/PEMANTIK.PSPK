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
  todayErrorCount?: number;
  isSystemHealthy?: boolean;
  dauCommunity?: number;
  dauSchool?: number;
  dauTeacher?: number;
  dauStudent?: number;
  dauSuperAdmin?: number;
}

export default function IntegratedDashboardManager({
  communities,
  schools,
  teachers,
  students,
  sessions,
  todayErrorCount = 0,
  isSystemHealthy = true,
  dauCommunity = 0,
  dauSchool = 0,
  dauTeacher = 0,
  dauStudent = 0,
  dauSuperAdmin = 0
}: IntegratedDashboardManagerProps) {
  const [filterYear, setFilterYear] = useState("all");
  const [filterProvince, setFilterProvince] = useState("all");
  const [filterCommunity, setFilterCommunity] = useState("all");
  const [filterSchool, setFilterSchool] = useState("all");
  const [filterSes, setFilterSes] = useState("all");
  const [filterGender, setFilterGender] = useState("all");
  const [filterGrade, setFilterGrade] = useState("all");
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Get distinct values for filters
  const availableYears = useMemo(() => {
    const years = new Set(sessions.map((s) => new Date(s.created_at).getFullYear().toString()));
    return Array.from(years).sort().reverse();
  }, [sessions]);

  const availableProvinces = useMemo(() => {
    const provs = new Set(schools.map((s) => s.province).filter(Boolean));
    return Array.from(provs).sort();
  }, [schools]);

  // Handle derived filters
  const availableSchools = useMemo(() => {
    if (filterCommunity === "all") return schools;
    return schools.filter(s => s.community_id === filterCommunity);
  }, [schools, filterCommunity]);

  // Main Filtering Logic
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      const yearMatch = filterYear === "all" || new Date(s.created_at).getFullYear().toString() === filterYear;
      const provMatch = filterProvince === "all" || s.school?.province === filterProvince;
      const commMatch = filterCommunity === "all" || s.school?.community_id === filterCommunity;
      const schoolMatch = filterSchool === "all" || s.school_id === filterSchool;
      const sesMatch = filterSes === "all" || s.student?.ses_class === filterSes;
      const genderMatch = filterGender === "all" || s.student?.gender === filterGender;
      
      return yearMatch && provMatch && commMatch && schoolMatch && sesMatch && genderMatch;
    });
  }, [sessions, filterYear, filterProvince, filterCommunity, filterSchool, filterSes, filterGender]);

  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const school = schools.find(s => s.id === student.school_id);
      
      const provMatch = filterProvince === "all" || student.province === filterProvince;
      const commMatch = filterCommunity === "all" || school?.community_id === filterCommunity;
      const schoolMatch = filterSchool === "all" || student.school_id === filterSchool;
      const sesMatch = filterSes === "all" || student.ses_class === filterSes;
      const genderMatch = filterGender === "all" || student.gender === filterGender;

      return provMatch && commMatch && schoolMatch && sesMatch && genderMatch;
    });
  }, [students, schools, filterProvince, filterCommunity, filterSchool, filterSes, filterGender]);

  // --- 1. KPI COUNTERS ---
  const totalMitra = communities.length;
  const totalSekolah = schools.length;
  const totalGuru = teachers.length;
  const totalAnak = students.length;

  // --- 2. ASSESSMENT ACTIVITY (Pie Chart) ---
  const assessmentData = useMemo(() => {
    let lit = 0;
    let num = 0;
    filteredSessions.forEach(s => {
      if (s.package?.subject_area === "literasi") lit++;
      else if (s.package?.subject_area === "numerasi") num++;
    });
    return [
      { name: "Literasi", value: lit },
      { name: "Numerasi", value: num }
    ];
  }, [filteredSessions]);

  // --- 3. DEMOGRAPHICS CHARTS (Gender & Age) ---
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

  const ageData = useMemo(() => {
    const map: Record<string, number> = {};
    const currentYear = new Date().getFullYear();
    
    filteredStudents.forEach(s => {
      if (s.birth_date) {
        const age = currentYear - new Date(s.birth_date).getFullYear();
        if (age >= 0 && age <= 100) {
          const key = age.toString() + " Thn";
          map[key] = (map[key] || 0) + 1;
        }
      }
    });

    return Object.keys(map)
      .sort((a, b) => parseInt(a, 10) - parseInt(b, 10))
      .map(k => ({ name: k, value: map[k] }));
  }, [filteredStudents]);

  const sesData = useMemo(() => {
    let atas = 0, menAtas = 0, menBawah = 0, bawah = 0, tdkTahu = 0;
    filteredStudents.forEach(s => {
      const cls = s.ses_class;
      if (cls === "atas") atas++;
      else if (cls === "menengah_atas") menAtas++;
      else if (cls === "menengah_bawah") menBawah++;
      else if (cls === "bawah") bawah++;
      else tdkTahu++;
    });
    
    const result = [];
    if (atas > 0) result.push({ name: "Atas", value: atas });
    if (menAtas > 0) result.push({ name: "Menengah Atas", value: menAtas });
    if (menBawah > 0) result.push({ name: "Menengah Bawah", value: menBawah });
    if (bawah > 0) result.push({ name: "Bawah", value: bawah });
    if (tdkTahu > 0) result.push({ name: "Lainnya/Tidak Diketahui", value: tdkTahu });
    return result;
  }, [filteredStudents]);

  // --- 4. COMMUNITY STATS PREPARATION (TOP 10) ---
  const communityStats = useMemo(() => {
    return communities.slice(0, 10).map((comm) => {
      const commSchools = schools.filter(s => s.community_id === comm.id);
      const schoolIds = new Set(commSchools.map(s => s.id));
      
      const teachersCount = teachers.filter(t => t.community_id === comm.id).length;
      const studentsCount = students.filter(s => schoolIds.has(s.school_id)).length;
      
      return {
        id: comm.id,
        name: comm.name || "Komunitas Tanpa Nama",
        code: comm.code || "-",
        status: comm.is_active ? "Aktif" : "Non-Aktif",
        created_at: comm.created_at,
        schoolsCount: commSchools.length,
        teachersCount,
        studentsCount,
      };
    });
  }, [communities, schools, teachers, students]);

  return (
    <div className="animate-fade-in">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem", marginBottom: "1.5rem" }}>
        <div style={{ backgroundColor: "#102e50", color: "white", padding: "1.25rem", borderRadius: "0.75rem", display: "flex", flexDirection: "column", justifyContent: "space-between", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
            <p style={{ fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "#9ca3af", margin: 0, fontWeight: 600 }}>Aktivitas Login (Hari Ini)</p>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f2af3e" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "0.5rem", textAlign: "center" }}>
            <div>
              <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "white" }}>{dauStudent.toLocaleString("id-ID")}</div>
              <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>Anak</div>
            </div>
            <div>
              <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "white" }}>{dauTeacher.toLocaleString("id-ID")}</div>
              <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>Guru</div>
            </div>
            <div>
              <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "white" }}>{dauSchool.toLocaleString("id-ID")}</div>
              <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>Sekolah</div>
            </div>
            <div>
              <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "white" }}>{dauCommunity.toLocaleString("id-ID")}</div>
              <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>Komunitas</div>
            </div>
            <div>
              <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "white" }}>{dauSuperAdmin.toLocaleString("id-ID")}</div>
              <div style={{ fontSize: "0.75rem", color: "#f2af3e" }}>Super<br/>Admin</div>
            </div>
          </div>
        </div>

        <div style={{ backgroundColor: "white", border: "1px solid #e5e7eb", padding: "1.25rem", borderRadius: "0.75rem", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)" }}>
          <div>
            <p style={{ fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "#6b7280", margin: 0, fontWeight: 600 }}>Kesehatan Sistem &amp; API</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", marginTop: "0.25rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span className={isSystemHealthy ? "animate-pulse" : ""} style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", backgroundColor: isSystemHealthy ? "#10b981" : "#ef4444" }}></span>
                <span style={{ fontSize: "0.95rem", fontWeight: 600, color: isSystemHealthy ? "#10b981" : "#ef4444" }}>{isSystemHealthy ? "Server Aman & Berjalan" : "Gangguan Koneksi DB"}</span>
              </div>
              <div style={{ fontSize: "0.85rem", color: todayErrorCount > 0 ? "#ef4444" : "#6b7280", fontWeight: 500 }}>
                {todayErrorCount} Laporan Error Terjadi Hari Ini
              </div>
            </div>
          </div>
          <div style={{ backgroundColor: todayErrorCount > 0 ? "#fef2f2" : "#f3f4f6", padding: "0.75rem", borderRadius: "50%" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={todayErrorCount > 0 ? "#ef4444" : "#10b981"} strokeWidth="2"><path d="M21.73 18l-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
          </div>
        </div>
      </div>

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
            {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div style={{ flex: "1 1 200px" }}>
          <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#374151", marginBottom: "0.5rem" }}>Provinsi</label>
          <select value={filterProvince} onChange={e => setFilterProvince(e.target.value)} className="form-input">
            <option value="all">Semua Provinsi</option>
            {availableProvinces.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div style={{ flex: "1 1 200px" }}>
          <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#374151", marginBottom: "0.5rem" }}>SES</label>
          <select value={filterSes} onChange={e => setFilterSes(e.target.value)} className="form-input">
            <option value="all">Semua SES</option>
            <option value="atas">Atas</option>
            <option value="menengah_atas">Menengah Atas</option>
            <option value="menengah_bawah">Menengah Bawah</option>
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
      <StatGrid columns={{ base: 1, md: 2, lg: 4 }} className="gap-6 mt-4 mb-8">
        {/* Total Mitra */}
        <div className="card" style={{ display: "flex", flexDirection: "column", height: "100%", borderLeft: "5px solid #102e50", padding: "1.5rem", position: "relative", overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
            <p style={{ fontSize: "0.85rem", color: "#6b7280", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>
              Total Mitra
            </p>
            <div style={{ padding: "0.6rem", borderRadius: "0.75rem", backgroundColor: "rgba(16, 46, 80, 0.08)", color: "#102e50", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            </div>
          </div>
          <h2 style={{ fontSize: "2.5rem", fontWeight: 700, color: "#102e50", margin: "auto 0 0 0", fontFamily: "var(--font-lora)", lineHeight: 1 }}>
            {communities.length}
          </h2>
        </div>

        {/* Total Sekolah */}
        <div className="card" style={{ display: "flex", flexDirection: "column", height: "100%", borderLeft: "5px solid #f2af3e", padding: "1.5rem", position: "relative", overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
            <p style={{ fontSize: "0.85rem", color: "#6b7280", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>
              Total Sekolah
            </p>
            <div style={{ padding: "0.6rem", borderRadius: "0.75rem", backgroundColor: "rgba(242, 175, 62, 0.15)", color: "#d99420", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
            </div>
          </div>
          <h2 style={{ fontSize: "2.5rem", fontWeight: 700, color: "#102e50", margin: "auto 0 0 0", fontFamily: "var(--font-lora)", lineHeight: 1 }}>
            {schools.length}
          </h2>
        </div>

        {/* Total Guru */}
        <div className="card" style={{ display: "flex", flexDirection: "column", height: "100%", borderLeft: "5px solid #0874aa", padding: "1.5rem", position: "relative", overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
            <p style={{ fontSize: "0.85rem", color: "#6b7280", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>
              Total Guru
            </p>
            <div style={{ padding: "0.6rem", borderRadius: "0.75rem", backgroundColor: "rgba(8, 116, 170, 0.1)", color: "#0874aa", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
            </div>
          </div>
          <h2 style={{ fontSize: "2.5rem", fontWeight: 700, color: "#102e50", margin: "auto 0 0 0", fontFamily: "var(--font-lora)", lineHeight: 1 }}>
            {teachers.length}
          </h2>
        </div>

        {/* Total Anak */}
        <div className="card" style={{ display: "flex", flexDirection: "column", height: "100%", borderLeft: "5px solid #a8281c", padding: "1.5rem", position: "relative", overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
            <p style={{ fontSize: "0.85rem", color: "#6b7280", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>
              Total Anak
            </p>
            <div style={{ padding: "0.6rem", borderRadius: "0.75rem", backgroundColor: "rgba(168, 40, 28, 0.1)", color: "#a8281c", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            </div>
          </div>
          <h2 style={{ fontSize: "2.5rem", fontWeight: 700, color: "#a8281c", margin: "auto 0 0 0", fontFamily: "var(--font-lora)", lineHeight: 1 }}>
            {students.length}
          </h2>
        </div>
      </StatGrid>

      {/* CHARTS */}
      <DashboardCharts genderData={genderData} assessmentData={assessmentData} ageData={ageData} sesData={sesData} />

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
                  render: (_, index) => <span className="text-black">{communityStats.indexOf(_) + 1}</span>,
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
                  render: (c) => <span className="font-semibold text-black">{c.schoolsCount.toLocaleString("id-ID")}</span>,
                  priority: 1
                },
                {
                  key: "teachers",
                  header: "Jumlah Guru",
                  render: (c) => <span className="font-semibold text-black">{c.teachersCount.toLocaleString("id-ID")}</span>,
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
                    <Badge variant={c.status === "Aktif" ? "success" : "default"}>
                      {c.status}
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
