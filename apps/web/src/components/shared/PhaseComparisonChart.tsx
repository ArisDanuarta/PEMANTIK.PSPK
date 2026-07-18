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
  id?: string;
  phase?: string;
  score?: number | null;
  student_id?: string;
  current_level_id?: string;
  level_number?: number;
  question_categories?: {
    subject_area?: string;
  };
  question_levels?: {
    level_number?: number;
  };
}

interface PhaseComparisonChartProps {
  sessions: SessionChartItem[];
  title?: string;
  description?: string;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div style={{
        backgroundColor: "#0f172a",
        color: "white",
        borderRadius: "0.75rem",
        padding: "1rem",
        boxShadow: "0 10px 15px -3px rgba(0,0,0,0.3)",
        border: "1px solid #334155",
        minWidth: "260px",
        fontSize: "0.85rem",
        fontFamily: "Inter, sans-serif"
      }}>
        <div style={{ fontWeight: 700, fontSize: "0.95rem", borderBottom: "1px solid #334155", paddingBottom: "0.5rem", marginBottom: "0.65rem", color: "#38bdf8" }}>
          {label}
        </div>

        <div style={{ marginBottom: "0.65rem" }}>
          <div style={{ color: "#94a3b8", fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 600 }}>Partisipasi</div>
          <div style={{ fontWeight: 700, color: "#fff", marginTop: "0.15rem" }}>
            {data.peserta} Anak <span style={{ fontSize: "0.75rem", color: "#cbd5e1", fontWeight: 500 }}>({data.totalSesi} sesi selesai)</span>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", borderTop: "1px solid #1e293b", paddingTop: "0.65rem" }}>
          <div>
            <div style={{ color: "#34d399", fontWeight: 700, fontSize: "0.8rem", marginBottom: "0.25rem" }}>Literasi</div>
            <div>Rata-rata: <strong>{data.avgLiterasi}%</strong></div>
            <div>Max Level: <strong>{data.maxLevelLit > 0 ? `Level ${data.maxLevelLit}` : "-"}</strong></div>
            <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: "0.1rem" }}>{data.countLit} sesi</div>
          </div>

          <div>
            <div style={{ color: "#fbbf24", fontWeight: 700, fontSize: "0.8rem", marginBottom: "0.25rem" }}>Numerasi</div>
            <div>Rata-rata: <strong>{data.avgNumerasi}%</strong></div>
            <div>Max Level: <strong>{data.maxLevelNum > 0 ? `Level ${data.maxLevelNum}` : "-"}</strong></div>
            <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: "0.1rem" }}>{data.countNum} sesi</div>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export default function PhaseComparisonChart({
  sessions,
  title = "Perbandingan Capaian & Partisipasi Anak Antar Fase",
  description = "Grafik batang menunjukkan perbandingan partisipasi anak (siswa) serta rata-rata skor capaian (%) dan level tertinggi di Literasi & Numerasi tiap fase."
}: PhaseComparisonChartProps) {
  const chartData = useMemo(() => {
    const map: Record<string, {
      phase: string;
      studentsSet: Set<string>;
      totalSesi: number;
      sumLit: number;
      countLit: number;
      maxLevelLit: number;
      sumNum: number;
      countNum: number;
      maxLevelNum: number;
    }> = {};

    sessions.forEach((s) => {
      const p = s.phase || "Fase 1";
      if (!map[p]) {
        map[p] = {
          phase: p,
          studentsSet: new Set<string>(),
          totalSesi: 0,
          sumLit: 0,
          countLit: 0,
          maxLevelLit: 0,
          sumNum: 0,
          countNum: 0,
          maxLevelNum: 0
        };
      }

      map[p].totalSesi += 1;
      if (s.student_id) {
        map[p].studentsSet.add(s.student_id);
      }

      const sc = typeof s.score === "number" ? s.score : 0;
      const subj = s.question_categories?.subject_area?.toLowerCase() || "";
      const lvlNum = s.level_number ?? s.question_levels?.level_number ?? 0;

      if (subj === "literasi") {
        map[p].sumLit += sc;
        map[p].countLit += 1;
        if (lvlNum > map[p].maxLevelLit) {
          map[p].maxLevelLit = lvlNum;
        }
      } else if (subj === "numerasi") {
        map[p].sumNum += sc;
        map[p].countNum += 1;
        if (lvlNum > map[p].maxLevelNum) {
          map[p].maxLevelNum = lvlNum;
        }
      } else {
        // Jika subject tidak diketahui, hitung ke Literasi/general
        map[p].sumLit += sc;
        map[p].countLit += 1;
        if (lvlNum > map[p].maxLevelLit) {
          map[p].maxLevelLit = lvlNum;
        }
      }
    });

    const phases = Object.values(map);
    if (phases.length === 0) {
      return [
        {
          phase: "Fase 1 (Siklus Awal)",
          peserta: 0,
          totalSesi: 0,
          avgLiterasi: 0,
          avgNumerasi: 0,
          maxLevelLit: 0,
          maxLevelNum: 0,
          countLit: 0,
          countNum: 0
        }
      ];
    }

    return phases.map((item) => {
      const pesertaCount = item.studentsSet.size > 0 ? item.studentsSet.size : item.totalSesi;
      return {
        phase: item.phase,
        peserta: pesertaCount,
        totalSesi: item.totalSesi,
        avgLiterasi: item.countLit > 0 ? Math.round((item.sumLit / item.countLit) * 10) / 10 : 0,
        avgNumerasi: item.countNum > 0 ? Math.round((item.sumNum / item.countNum) * 10) / 10 : 0,
        maxLevelLit: item.maxLevelLit,
        maxLevelNum: item.maxLevelNum,
        countLit: item.countLit,
        countNum: item.countNum
      };
    });
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
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ paddingTop: "1rem", fontSize: "0.88rem", fontWeight: 600 }} />
            <Bar
              name="Partisipasi Anak (Anak Ikut Asesmen)"
              dataKey="peserta"
              fill="#0874aa"
              radius={[6, 6, 0, 0]}
              barSize={32}
            />
            <Bar
              name="Rata-Rata Capaian Literasi (%)"
              dataKey="avgLiterasi"
              fill="#10b981"
              radius={[6, 6, 0, 0]}
              barSize={32}
            />
            <Bar
              name="Rata-Rata Capaian Numerasi (%)"
              dataKey="avgNumerasi"
              fill="#f2af3e"
              radius={[6, 6, 0, 0]}
              barSize={32}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Ringkasan Breakdown per Fase */}
      <div style={{
        marginTop: "1.5rem",
        display: "grid",
        gridTemplateColumns: `repeat(${Math.min(chartData.length, 3)}, 1fr)`,
        gap: "1rem"
      }}>
        {chartData.map((d, i) => (
          <div key={i} style={{
            padding: "1rem",
            backgroundColor: "#f8fafc",
            borderRadius: "0.85rem",
            border: "1px solid #e2e8f0",
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem"
          }}>
            <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#102e50", borderBottom: "1px dashed #cbd5e1", paddingBottom: "0.4rem" }}>
              {d.phase}
            </div>
            <div style={{ fontSize: "0.8rem", color: "#334155", display: "flex", justifyContent: "space-between" }}>
              <span>Partisipasi:</span>
              <strong>{d.peserta} Anak ({d.totalSesi} sesi)</strong>
            </div>
            <div style={{ fontSize: "0.8rem", color: "#059669", display: "flex", justifyContent: "space-between" }}>
              <span>Literasi (Avg / Max):</span>
              <strong>{d.avgLiterasi}% ({d.maxLevelLit > 0 ? `Lvl ${d.maxLevelLit}` : "-"})</strong>
            </div>
            <div style={{ fontSize: "0.8rem", color: "#d97706", display: "flex", justifyContent: "space-between" }}>
              <span>Numerasi (Avg / Max):</span>
              <strong>{d.avgNumerasi}% ({d.maxLevelNum > 0 ? `Lvl ${d.maxLevelNum}` : "-"})</strong>
            </div>
          </div>
        ))}
      </div>

      {/* Insight Penjelasan Indikator */}
      <div style={{
        marginTop: "1.25rem",
        padding: "1rem",
        backgroundColor: "#f1f5f9",
        borderRadius: "0.75rem",
        border: "1px solid #cbd5e1",
        display: "flex",
        flexWrap: "wrap",
        gap: "1.5rem",
        justifyContent: "space-between",
        alignItems: "center"
      }}>
        <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
          <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: "#0874aa" }} />
          <span style={{ fontSize: "0.8rem", color: "#334155" }}>
            <strong>Partisipasi Anak:</strong> Jumlah anak unik yang mengikuti sesi asesmen pada fase tersebut.
          </span>
        </div>
        <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
          <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: "#10b981" }} />
          <span style={{ fontSize: "0.8rem", color: "#334155" }}>
            <strong>Literasi:</strong> Rata-rata capaian skor (%) dan Level tertinggi yang berhasil diselesaikan anak.
          </span>
        </div>
        <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
          <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: "#f2af3e" }} />
          <span style={{ fontSize: "0.8rem", color: "#334155" }}>
            <strong>Numerasi:</strong> Rata-rata capaian skor (%) dan Level tertinggi yang berhasil diselesaikan anak.
          </span>
        </div>
      </div>
    </div>
  );
}
