"use client";

import React, { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface SessionData {
  phase: string;
  score: number;
}

interface ProgressTrackingChartProps {
  sessions: SessionData[];
  title?: string;
  description?: string;
}

export default function ProgressTrackingChart({ 
  sessions, 
  title = "Perbandingan Nilai Antar Fase",
  description = "Melacak perkembangan rata-rata nilai anak dari waktu ke waktu"
}: ProgressTrackingChartProps) {
  
  // Agregasi data: Hitung rata-rata skor per fase
  const chartData = useMemo(() => {
    if (!sessions || sessions.length === 0) return [];

    const phaseMap = new Map<string, { totalScore: number; count: number }>();

    sessions.forEach(session => {
      // Hanya menghitung yang sudah memiliki skor valid (>= 0)
      if (session.score !== undefined && session.score !== null) {
        const phaseName = session.phase || "Tanpa Fase";
        const current = phaseMap.get(phaseName) || { totalScore: 0, count: 0 };
        phaseMap.set(phaseName, {
          totalScore: current.totalScore + session.score,
          count: current.count + 1
        });
      }
    });

    const result = Array.from(phaseMap.entries()).map(([phase, data]) => ({
      name: phase,
      "Rata-rata Nilai": Math.round((data.totalScore / data.count) * 10) / 10 // round to 1 decimal
    }));

    // Urutkan berdasarkan nama fase secara alfabet (Tahap 1, Tahap 2, dsb)
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [sessions]);

  if (chartData.length === 0) {
    return (
      <div style={{ backgroundColor: "white", padding: "1.5rem", borderRadius: "0.75rem", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
        <h3 style={{ margin: "0 0 0.5rem 0", color: "#102e50", fontSize: "1.1rem" }}>{title}</h3>
        <p style={{ margin: "0 0 2rem 0", color: "#6b7280", fontSize: "0.9rem" }}>{description}</p>
        <div style={{ padding: "3rem", textAlign: "center", color: "#9ca3af", backgroundColor: "#f9fafb", borderRadius: "0.5rem", border: "1px dashed #d1d5db" }}>
          Belum ada data nilai ujian yang memadai untuk ditampilkan.
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: "white", padding: "1.5rem", borderRadius: "0.75rem", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
      <h3 style={{ margin: "0 0 0.5rem 0", color: "#102e50", fontSize: "1.1rem" }}>{title}</h3>
      <p style={{ margin: "0 0 2rem 0", color: "#6b7280", fontSize: "0.9rem" }}>{description}</p>
      
      <div style={{ width: "100%", height: 350 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
            barSize={40}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#6b7280", fontSize: 12 }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: "#6b7280", fontSize: 12 }} domain={[0, 100]} />
            <Tooltip 
              cursor={{ fill: "#f3f4f6" }}
              contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)" }}
            />
            <Legend wrapperStyle={{ paddingTop: "20px" }} />
            <Bar dataKey="Rata-rata Nilai" fill="#f2af3e" radius={[4, 4, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
