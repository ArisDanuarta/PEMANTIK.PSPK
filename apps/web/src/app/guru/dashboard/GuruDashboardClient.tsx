"use client";

import React, { useState, useEffect } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Badge } from "@pemantik/ui";
import { StatGrid } from "@/components/ui/responsive/StatGrid";
import { ResponsiveTable, Column } from "@/components/ui/responsive/ResponsiveTable";

interface GuruDashboardClientProps {
  stats: {
    totalClasses: number;
    totalStudents: number;
    completedSessions: number;
    avgScore: number;
    demographics: {
      gender: { L: number; P: number };
      ses: { I: number; II: number; III: number; IV: number; Uncategorized: number };
      age: { under7: number; age7to9: number; age10to12: number; over12: number; unknown: number };
    };
  };
  recentSessions: any[];
}

export default function GuruDashboardClient({ stats, recentSessions }: GuruDashboardClientProps) {
  const [isMounted, setIsMounted] = useState(false);

  // Brand Guidelines PSPK Colors
  const COLORS_PRIMARY = ["#102e50", "#f2af3e"]; // Navy & Emas
  const COLORS_SECONDARY = ["#0874aa", "#df632f", "#8e2d3f", "#f4b867"]; // Teal, Jingga, Merah Gelap, Kuning Muda

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Data Mappings
  const genderData = [
    { name: "Laki-laki", value: stats.demographics.gender.L },
    { name: "Perempuan", value: stats.demographics.gender.P }
  ].filter(d => d.value > 0);

  const ageData = [
    { name: "< 7 Thn", value: stats.demographics.age.under7 },
    { name: "7-9 Thn", value: stats.demographics.age.age7to9 },
    { name: "10-12 Thn", value: stats.demographics.age.age10to12 },
    { name: "> 12 Thn", value: stats.demographics.age.over12 },
    { name: "Tidak Diketahui", value: stats.demographics.age.unknown }
  ].filter(d => d.value > 0);

  const sesData = [
    { name: "SES Bawah", value: stats.demographics.ses.I },
    { name: "SES Menengah Bawah", value: stats.demographics.ses.II },
    { name: "SES Menengah Atas", value: stats.demographics.ses.III },
    { name: "SES Atas", value: stats.demographics.ses.IV },
    { name: "Belum Ditentukan", value: stats.demographics.ses.Uncategorized }
  ].filter(d => d.value > 0);

  return (
    <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "2rem", paddingBottom: "2rem" }}>
      
      {/* KPI CARDS */}
      <StatGrid columns={{ base: 1, md: 2, lg: 4 }} className="gap-6">
        <div className="card" style={{ padding: "1.5rem", borderLeft: "4px solid #102e50" }}>
          <p style={{ fontSize: "0.85rem", color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Kelas Saya</p>
          <h2 style={{ fontSize: "2rem", fontWeight: 700, color: "#102e50", margin: "0.5rem 0", fontFamily: "var(--font-lora)" }}>
            {stats.totalClasses}
          </h2>
        </div>
        <div className="card" style={{ padding: "1.5rem", borderLeft: "4px solid #f2af3e" }}>
          <p style={{ fontSize: "0.85rem", color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Anak</p>
          <h2 style={{ fontSize: "2rem", fontWeight: 700, color: "#102e50", margin: "0.5rem 0", fontFamily: "var(--font-lora)" }}>
            {stats.totalStudents}
          </h2>
        </div>
        <div className="card" style={{ padding: "1.5rem", borderLeft: "4px solid #0874aa" }}>
          <p style={{ fontSize: "0.85rem", color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Ujian Selesai</p>
          <h2 style={{ fontSize: "2rem", fontWeight: 700, color: "#102e50", margin: "0.5rem 0", fontFamily: "var(--font-lora)" }}>
            {stats.completedSessions}
          </h2>
        </div>
        <div className="card" style={{ padding: "1.5rem", borderLeft: "4px solid #a8281c" }}>
          <p style={{ fontSize: "0.85rem", color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Rata-rata Skor</p>
          <h2 style={{ fontSize: "2rem", fontWeight: 700, color: "#a8281c", margin: "0.5rem 0", fontFamily: "var(--font-lora)" }}>
            {stats.avgScore}
          </h2>
        </div>
      </StatGrid>

      {/* CHARTS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem" }}>
        
        {/* Chart Gender */}
        <div className="card" style={{ padding: "1.5rem", borderTop: "4px solid #102e50" }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "1rem", color: "#102e50", fontFamily: "var(--font-lora)" }}>
            Sebaran Gender Anak
          </h3>
          <div style={{ width: "100%", height: 250 }}>
            {isMounted && genderData.length > 0 ? (
              <ResponsiveContainer width="99%" height="100%" minWidth={1} minHeight={1}>
                <PieChart>
                  <Pie data={genderData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    {genderData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS_PRIMARY[index % COLORS_PRIMARY.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)" }} />
                  <Legend wrapperStyle={{ paddingTop: "20px" }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontSize: "0.9rem" }}>Data tidak tersedia</div>
            )}
          </div>
        </div>

        {/* Chart Usia */}
        <div className="card" style={{ padding: "1.5rem", borderTop: "4px solid #f2af3e" }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "1rem", color: "#102e50", fontFamily: "var(--font-lora)" }}>
            Sebaran Usia Anak
          </h3>
          <div style={{ width: "100%", height: 250 }}>
            {isMounted && ageData.length > 0 ? (
              <ResponsiveContainer width="99%" height="100%" minWidth={1} minHeight={1}>
                <BarChart data={ageData}>
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#4b5563" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: "#4b5563" }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: "rgba(16, 46, 80, 0.05)" }} contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)" }} />
                  <Bar dataKey="value" fill="#f2af3e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontSize: "0.9rem" }}>Data tidak tersedia</div>
            )}
          </div>
        </div>

        {/* Chart SES */}
        <div className="card" style={{ padding: "1.5rem", borderTop: "4px solid #0874aa" }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "1rem", color: "#102e50", fontFamily: "var(--font-lora)" }}>
            Status Ekonomi (SES)
          </h3>
          <div style={{ width: "100%", height: 250 }}>
            {isMounted && sesData.length > 0 ? (
              <ResponsiveContainer width="99%" height="100%" minWidth={1} minHeight={1}>
                <BarChart data={sesData} layout="vertical" margin={{ left: 50, right: 20 }}>
                  <XAxis type="number" tick={{ fontSize: 12, fill: "#4b5563" }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: "#334155", fontWeight: 500 }} axisLine={false} tickLine={false} width={130} />
                  <Tooltip cursor={{ fill: "rgba(8,116,170,0.05)" }} contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)" }} />
                  <Bar dataKey="value" fill="#0874aa" radius={[0, 4, 4, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontSize: "0.9rem" }}>Data tidak tersedia</div>
            )}
          </div>
        </div>

      </div>

      {/* TABEL RECENT SESSIONS */}
      <div className="card" style={{ padding: "1.5rem", marginTop: "1rem" }}>
        <h3 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#102e50", marginBottom: "1.5rem", fontFamily: "var(--font-lora)" }}>
          Aktivitas Ujian Terbaru
        </h3>
        {recentSessions.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem", color: "#6b7280" }}>
            Belum ada aktivitas ujian yang diselesaikan.
          </div>
        ) : (
          <div className="mt-4">
            <ResponsiveTable 
              data={recentSessions}
              keyField="id"
              mode="card"
              columns={[
                {
                  key: "date",
                  header: "Tanggal",
                  render: (s) => <span>{new Date(s.completed_at).toLocaleDateString("id-ID")}</span>,
                  priority: 2
                },
                {
                  key: "name",
                  header: "Nama Anak",
                  render: (s) => <span className="font-medium text-[#102e50]">{s.student_name}</span>,
                  priority: 3
                },
                {
                  key: "class",
                  header: "Kelas",
                  render: (s) => <span>{s.class_name}</span>,
                  hideBelow: "md",
                  priority: 1
                },
                {
                  key: "category",
                  header: "Kategori Ujian",
                  render: (s) => <span>{s.package_name}</span>,
                  hideBelow: "md",
                  priority: 1
                },
                {
                  key: "score",
                  header: "Skor",
                  render: (s) => (
                    <span className="font-semibold" style={{ color: s.score >= 70 ? "#10b981" : (s.score >= 50 ? "#f2af3e" : "#ef4444") }}>
                      {s.score !== null ? s.score : "-"}
                    </span>
                  ),
                  priority: 2
                },
                {
                  key: "status",
                  header: "Status",
                  render: () => <Badge variant="success">Selesai</Badge>,
                  priority: 0
                }
              ]}
            />
          </div>
        )}
      </div>

    </div>
  );
}
