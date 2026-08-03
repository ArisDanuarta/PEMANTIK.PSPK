"use client";

import React, { useMemo } from "react";
import { PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";


export interface StudentDemographicRow {
  gender?: string | null;
  socioeconomic_status?: string | null;
  ses_class?: string | null;
  grade_level?: string | null;
}

export interface DemographicsSectionProps {
  students: StudentDemographicRow[];
  title?: string;
  description?: string;
}

const GENDER_COLORS = ["#0874aa", "#df632f", "#9ca3af"];
const SES_COLORS = ["#102e50", "#0874aa", "#2d9e5f", "#f2af3e", "#e11d48"];

export default function DemographicsSection({
  students,
  title = "Demografi Anak & Latar Belakang",
  description = "Distribusi jenis kelamin dan status sosial ekonomi (SES) siswa terdaftar"
}: DemographicsSectionProps) {
  
  const genderData = useMemo(() => {
    let laki = 0, perempuan = 0, lainnya = 0;
    students.forEach(s => {
      const g = (s.gender || "").toLowerCase();
      if (g === "l" || g === "laki-laki" || g === "male") laki++;
      else if (g === "p" || g === "perempuan" || g === "female") perempuan++;
      else lainnya++;
    });

    const total = laki + perempuan + lainnya;
    if (total === 0) return [];

    return [
      { name: "Laki-laki", value: laki },
      { name: "Perempuan", value: perempuan },
      ...(lainnya > 0 ? [{ name: "Lainnya / Tidak Diketahui", value: lainnya }] : [])
    ];
  }, [students]);

  const sesData = useMemo(() => {
    let bawah = 0, men_bawah = 0, men_atas = 0, atas = 0, unknown = 0;
    students.forEach(s => {
      const ses = (s.socioeconomic_status || s.ses_class || "").toLowerCase();
      if (ses === "bawah") bawah++;
      else if (ses === "menengah_bawah") men_bawah++;
      else if (ses === "menengah_atas") men_atas++;
      else if (ses === "atas") atas++;
      else unknown++;
    });

    const total = bawah + men_bawah + men_atas + atas + unknown;
    if (total === 0) return [];

    return [
      ...(bawah > 0 ? [{ name: "SES Bawah", count: bawah }] : []),
      ...(men_bawah > 0 ? [{ name: "SES Menengah Bawah", count: men_bawah }] : []),
      ...(men_atas > 0 ? [{ name: "SES Menengah Atas", count: men_atas }] : []),
      ...(atas > 0 ? [{ name: "SES Atas", count: atas }] : []),
      ...(unknown > 0 ? [{ name: "Belum Ditentukan", count: unknown }] : [])
    ];
  }, [students]);

  if (!students || students.length === 0) {
    return (
      <div style={{ backgroundColor: "white", padding: "1.5rem", borderRadius: "1rem", boxShadow: "0 2px 4px rgba(0,0,0,0.05)", border: "1px solid #f1f3f5" }}>
        <h3 style={{ margin: "0 0 0.25rem 0", color: "#102e50", fontSize: "1.1rem" }}>{title}</h3>
        <p style={{ margin: "0 0 1.5rem 0", color: "#6b7280", fontSize: "0.85rem" }}>{description}</p>
        <div style={{ padding: "2rem", textAlign: "center", color: "#9ca3af", backgroundColor: "#f9fafb", borderRadius: "0.5rem" }}>
          Tidak ada data demografi anak yang tersedia.
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: "white", padding: "1.5rem", borderRadius: "1rem", boxShadow: "0 2px 4px rgba(0,0,0,0.05)", border: "1px solid #f1f3f5" }}>
      <h3 style={{ margin: "0 0 0.25rem 0", color: "#102e50", fontSize: "1.1rem" }}>{title}</h3>
      <p style={{ margin: "0 0 1.5rem 0", color: "#6b7280", fontSize: "0.85rem" }}>{description}</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "2rem", alignItems: "center" }}>
        {/* Gender Donut Chart */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <h4 style={{ fontSize: "0.95rem", color: "#374151", marginBottom: "1rem", fontWeight: 600 }}>Komposisi Gender</h4>
          <div style={{ width: "100%", height: 250 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={genderData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                  isAnimationActive={false}
                >
                  {genderData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={GENDER_COLORS[index % GENDER_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => [`${value} Anak`, "Jumlah"]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: "flex", gap: "1.25rem", flexWrap: "wrap", justifyContent: "center", marginTop: "0.5rem" }}>
            {genderData.map((g, idx) => (
              <div key={g.name} style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.8rem", color: "#4b5563" }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: GENDER_COLORS[idx % GENDER_COLORS.length] }} />
                <span>{g.name}: <strong>{g.value}</strong></span>
              </div>
            ))}
          </div>
        </div>

        {/* SES Bar Chart */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <h4 style={{ fontSize: "0.95rem", color: "#374151", marginBottom: "1rem", fontWeight: 600 }}>Status Sosial Ekonomi (SES)</h4>
          <div style={{ width: "100%", height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sesData} margin={{ top: 10, right: 10, left: -20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 11, fill: "#6b7280" }} 
                  interval={0} 
                  angle={-35}
                  textAnchor="end"
                />
                <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} allowDecimals={false} />
                <Tooltip formatter={(value: any) => [`${value} Anak`, "Jumlah"]} />
                <Bar dataKey="count" fill="#2d9e5f" radius={[4, 4, 0, 0]} barSize={36} isAnimationActive={false}>
                  {sesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={SES_COLORS[index % SES_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
