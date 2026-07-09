"use client";

import React, { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";

interface SessionChartItem {
  phase: string;
  score?: number | null;
  question_categories?: {
    subject_area?: string;
  };
}

interface PhaseComparisonChartProps {
  sessions: SessionChartItem[];
  title?: string;
  description?: string;
}

export default function PhaseComparisonChart({
  sessions,
  title = "📊 Perbandingan Capaian & Partisipasi Anak Antar Fase",
  description = "Grafik batang menunjukkan perbandingan jumlah anak yang mengikuti asesmen (partisipasi) serta skor capaian level tertinggi di setiap fase pelaksanaan."
}: PhaseComparisonChartProps) {
  const chartData = useMemo(() => {
    const map: Record<string, { phase: string; count: number; maxScore: number; totalScore: number }> = {};

    sessions.forEach((s) => {
      const p = s.phase || "Fase 1";
      if (!map[p]) {
        map[p] = { phase: p, count: 0, maxScore: 0, totalScore: 0 };
      }
      map[p].count += 1;
      const sc = typeof s.score === "number" ? s.score : 0;
      map[p].totalScore += sc;
      if (sc > map[p].maxScore) {
        map[p].maxScore = sc;
      }
    });

    const phases = Object.values(map);
    if (phases.length === 0) {
      return [
        { phase: "Fase 1 (Siklus Awal)", peserta: 0, skorTertinggi: 0, rataRata: 0 }
      ];
    }

    return phases.map((item) => ({
      phase: item.phase,
      peserta: item.count,
      skorTertinggi: Math.round(item.maxScore * 10) / 10,
      rataRata: item.count > 0 ? Math.round((item.totalScore / item.count) * 10) / 10 : 0
    }));
  }, [sessions]);

  return (
    <div style={{
      backgroundColor: "white",
      borderRadius: "1.25rem",
      padding: "2rem",
      boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
      border: "1px solid #e2e8f0"
    }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <h3 style={{ fontFamily: "Lora, serif", fontSize: "1.25rem", color: "#102e50", margin: "0 0 0.35rem 0", fontWeight: 700 }}>
          {title}
        </h3>
        <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b" }}>
          {description}
        </p>
      </div>

      <div style={{ width: "100%", height: 340 }}>
        <ResponsiveContainer>
          <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="phase" stroke="#64748b" fontSize={13} fontWeight={600} tickLine={false} />
            <YAxis stroke="#64748b" fontSize={13} tickLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#102e50",
                color: "white",
                borderRadius: "0.5rem",
                border: "none",
                fontSize: "0.85rem"
              }}
            />
            <Legend wrapperStyle={{ paddingTop: "1rem", fontSize: "0.88rem", fontWeight: 600 }} />
            <Bar
              name="Jumlah Anak Peserta Asesmen"
              dataKey="peserta"
              fill="#0874aa"
              radius={[6, 6, 0, 0]}
              barSize={36}
            />
            <Bar
              name="Capaian Skor Tertinggi Anak (Max Level)"
              dataKey="skorTertinggi"
              fill="#f2af3e"
              radius={[6, 6, 0, 0]}
              barSize={36}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Insight Penjelasan Level */}
      <div style={{
        marginTop: "1.25rem",
        padding: "1rem",
        backgroundColor: "#f8fafc",
        borderRadius: "0.75rem",
        border: "1px solid #e2e8f0",
        display: "flex",
        flexWrap: "wrap",
        gap: "1.5rem",
        justifyContent: "space-between",
        alignItems: "center"
      }}>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <div style={{ width: 14, height: 14, borderRadius: "50%", backgroundColor: "#0874aa" }} />
          <span style={{ fontSize: "0.82rem", color: "#334155" }}>
            <strong>Peserta Asesmen:</strong> Indikator cakupan partisipasi anak di tiap siklus fase.
          </span>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <div style={{ width: 14, height: 14, borderRadius: "50%", backgroundColor: "#f2af3e" }} />
          <span style={{ fontSize: "0.82rem", color: "#334155" }}>
            <strong>Level Tertinggi:</strong> Capaian maksimal anak pada fase tersebut (0-100%).
          </span>
        </div>
      </div>
    </div>
  );
}
