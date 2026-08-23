"use client";

import React, { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";

export interface RombelDataItem {
  className: string;
  grade: number;
  avgLit: number;
  avgNum: number;
  studentCount: number;
}

interface RombelComparisonChartProps {
  rombelData: RombelDataItem[];
}

const LIT_COLOR = "#0874aa";
const NUM_COLOR = "#df632f";
const LIT_COLOR_LIGHT = "rgba(8,116,170,0.15)";
const NUM_COLOR_LIGHT = "rgba(223,99,47,0.15)";

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0]?.payload;
    return (
      <div
        style={{
          backgroundColor: "#0f172a",
          color: "white",
          borderRadius: "0.85rem",
          padding: "1rem 1.25rem",
          boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
          border: "1px solid #1e293b",
          minWidth: "240px",
          fontSize: "0.85rem",
          fontFamily: "Inter, sans-serif",
        }}
      >
        <div
          style={{
            fontWeight: 700,
            fontSize: "1rem",
            borderBottom: "1px solid #1e293b",
            paddingBottom: "0.6rem",
            marginBottom: "0.75rem",
            color: "#f1f5f9",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <span
            style={{
              backgroundColor: "#1e3a5f",
              color: "#93c5fd",
              fontSize: "0.7rem",
              fontWeight: 700,
              padding: "0.1rem 0.5rem",
              borderRadius: "999px",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Kelas {data?.grade}
          </span>
          {label}
        </div>

        <div
          style={{
            fontSize: "0.75rem",
            color: "#94a3b8",
            marginBottom: "0.75rem",
          }}
        >
          {data?.studentCount} anak telah ikut asesmen
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              backgroundColor: "rgba(8,116,170,0.12)",
              padding: "0.5rem 0.75rem",
              borderRadius: "0.5rem",
              border: "1px solid rgba(8,116,170,0.2)",
            }}
          >
            <span style={{ color: "#7dd3fc", fontWeight: 600 }}>
              Literasi
            </span>
            <span style={{ fontWeight: 700, fontSize: "1rem", color: "#bae6fd" }}>
              {data?.avgLit?.toFixed(1)}%
            </span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              backgroundColor: "rgba(223,99,47,0.12)",
              padding: "0.5rem 0.75rem",
              borderRadius: "0.5rem",
              border: "1px solid rgba(223,99,47,0.2)",
            }}
          >
            <span style={{ color: "#fdba74", fontWeight: 600 }}>
              Numerasi
            </span>
            <span style={{ fontWeight: 700, fontSize: "1rem", color: "#fed7aa" }}>
              {data?.avgNum?.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export default function RombelComparisonChart({
  rombelData,
}: RombelComparisonChartProps) {
  const [selectedGrade, setSelectedGrade] = useState<number | "all">("all");

  const availableGrades = useMemo(() => {
    const grades = [...new Set(rombelData.map((r) => r.grade))].sort(
      (a, b) => a - b
    );
    return grades;
  }, [rombelData]);

  const filteredData = useMemo(() => {
    if (selectedGrade === "all") return rombelData;
    return rombelData.filter((r) => r.grade === selectedGrade);
  }, [rombelData, selectedGrade]);

  // Hitung rata-rata keseluruhan untuk reference line
  const schoolAvgLit = useMemo(() => {
    if (!filteredData.length) return 0;
    const withData = filteredData.filter((r) => r.avgLit > 0);
    if (!withData.length) return 0;
    return (
      withData.reduce((sum, r) => sum + r.avgLit, 0) / withData.length
    );
  }, [filteredData]);

  const schoolAvgNum = useMemo(() => {
    if (!filteredData.length) return 0;
    const withData = filteredData.filter((r) => r.avgNum > 0);
    if (!withData.length) return 0;
    return (
      withData.reduce((sum, r) => sum + r.avgNum, 0) / withData.length
    );
  }, [filteredData]);

  // Insight: kelas terbaik & perlu perhatian
  const insights = useMemo(() => {
    const withLit = filteredData.filter((r) => r.avgLit > 0);
    const withNum = filteredData.filter((r) => r.avgNum > 0);
    if (!withLit.length && !withNum.length) return null;

    const bestLit = withLit.length
      ? withLit.reduce((a, b) => (a.avgLit > b.avgLit ? a : b))
      : null;
    const worstLit = withLit.length
      ? withLit.reduce((a, b) => (a.avgLit < b.avgLit ? a : b))
      : null;
    const bestNum = withNum.length
      ? withNum.reduce((a, b) => (a.avgNum > b.avgNum ? a : b))
      : null;

    return { bestLit, worstLit, bestNum };
  }, [filteredData]);

  const hasData = filteredData.length > 0 && filteredData.some(r => r.studentCount > 0);

  return (
    <div
      style={{
        backgroundColor: "white",
        borderRadius: "1.25rem",
        padding: "2rem",
        boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.05)",
        border: "1px solid #e2e8f0",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "1.5rem",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.35rem" }}>
            <div style={{
              width: 4,
              height: 28,
              backgroundColor: "#0874aa",
              borderRadius: "4px",
            }}></div>
            <h3
              style={{
                fontFamily: "Lora, serif",
                fontSize: "1.2rem",
                color: "#102e50",
                margin: 0,
                fontWeight: 700,
              }}
            >
              Komparasi Kinerja Antar Rombel
            </h3>
          </div>
          <p style={{ margin: 0, fontSize: "0.83rem", color: "#64748b", maxWidth: 560 }}>
            Rata-rata skor capaian Literasi &amp; Numerasi per kelas. Memfasilitasi
            evaluasi efektivitas pengajaran dari masing-masing guru pengampu.
          </p>
        </div>

        {/* Filter Grade */}
        {availableGrades.length > 1 && (
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button
              onClick={() => setSelectedGrade("all")}
              style={{
                padding: "0.35rem 0.85rem",
                borderRadius: "999px",
                border: `1.5px solid ${selectedGrade === "all" ? "#0874aa" : "#e2e8f0"}`,
                backgroundColor: selectedGrade === "all" ? "#0874aa" : "white",
                color: selectedGrade === "all" ? "white" : "#64748b",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              Semua Kelas
            </button>
            {availableGrades.map((g) => (
              <button
                key={g}
                onClick={() => setSelectedGrade(g)}
                style={{
                  padding: "0.35rem 0.85rem",
                  borderRadius: "999px",
                  border: `1.5px solid ${selectedGrade === g ? "#0874aa" : "#e2e8f0"}`,
                  backgroundColor: selectedGrade === g ? "#0874aa" : "white",
                  color: selectedGrade === g ? "white" : "#64748b",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                Kelas {g}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Chart */}
      {hasData ? (
        <>
          <div style={{ width: "100%", height: Math.max(300, filteredData.length * 55 + 80) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={filteredData}
                margin={{ top: 10, right: 20, left: 0, bottom: 30 }}
                barCategoryGap="30%"
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#f1f5f9"
                />
                <XAxis
                  dataKey="className"
                  stroke="#94a3b8"
                  fontSize={12}
                  fontWeight={600}
                  tickLine={false}
                  interval={0}
                  angle={filteredData.length > 6 ? -30 : 0}
                  textAnchor={filteredData.length > 6 ? "end" : "middle"}
                  height={filteredData.length > 6 ? 60 : 40}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={12}
                  tickLine={false}
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f8fafc" }} />
                <Legend
                  verticalAlign="top"
                  align="right"
                  wrapperStyle={{ fontSize: "0.82rem", fontWeight: 600, paddingBottom: "0.75rem" }}
                />

                {/* Reference lines: rata-rata sekolah */}
                {schoolAvgLit > 0 && (
                  <ReferenceLine
                    y={schoolAvgLit}
                    stroke={LIT_COLOR}
                    strokeDasharray="5 3"
                    strokeOpacity={0.5}
                    label={{
                      value: `Avg Lit: ${schoolAvgLit.toFixed(1)}%`,
                      position: "insideTopRight",
                      fontSize: 11,
                      fill: LIT_COLOR,
                      fontWeight: 600,
                    }}
                  />
                )}
                {schoolAvgNum > 0 && (
                  <ReferenceLine
                    y={schoolAvgNum}
                    stroke={NUM_COLOR}
                    strokeDasharray="5 3"
                    strokeOpacity={0.5}
                    label={{
                      value: `Avg Num: ${schoolAvgNum.toFixed(1)}%`,
                      position: "insideBottomRight",
                      fontSize: 11,
                      fill: NUM_COLOR,
                      fontWeight: 600,
                    }}
                  />
                )}

                <Bar
                  name="Literasi (%)"
                  dataKey="avgLit"
                  fill={LIT_COLOR}
                  radius={[6, 6, 0, 0]}
                  barSize={28}
                  isAnimationActive={false}
                />
                <Bar
                  name="Numerasi (%)"
                  dataKey="avgNum"
                  fill={NUM_COLOR}
                  radius={[6, 6, 0, 0]}
                  barSize={28}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Insight Box */}
          {insights && (
            <div
              style={{
                marginTop: "1.25rem",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "0.75rem",
              }}
            >
              {insights.bestLit && (
                <div
                  style={{
                    padding: "0.85rem 1rem",
                    backgroundColor: "rgba(8,116,170,0.06)",
                    borderRadius: "0.85rem",
                    border: "1px solid rgba(8,116,170,0.15)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.2rem",
                  }}
                >
                  <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Literasi Terbaik
                  </div>
                  <div style={{ fontWeight: 700, color: "#102e50", fontSize: "0.95rem" }}>
                    {insights.bestLit.className}
                  </div>
                  <div style={{ color: "#0874aa", fontWeight: 700, fontSize: "1.1rem" }}>
                    {insights.bestLit.avgLit.toFixed(1)}%
                  </div>
                </div>
              )}
              {insights.worstLit && insights.worstLit.className !== insights.bestLit?.className && (
                <div
                  style={{
                    padding: "0.85rem 1rem",
                    backgroundColor: "rgba(239,68,68,0.05)",
                    borderRadius: "0.85rem",
                    border: "1px solid rgba(239,68,68,0.12)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.2rem",
                  }}
                >
                  <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Literasi Perlu Perhatian
                  </div>
                  <div style={{ fontWeight: 700, color: "#102e50", fontSize: "0.95rem" }}>
                    {insights.worstLit.className}
                  </div>
                  <div style={{ color: "#ef4444", fontWeight: 700, fontSize: "1.1rem" }}>
                    {insights.worstLit.avgLit.toFixed(1)}%
                  </div>
                </div>
              )}
              {insights.bestNum && (
                <div
                  style={{
                    padding: "0.85rem 1rem",
                    backgroundColor: "rgba(223,99,47,0.06)",
                    borderRadius: "0.85rem",
                    border: "1px solid rgba(223,99,47,0.15)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.2rem",
                  }}
                >
                  <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Numerasi Terbaik
                  </div>
                  <div style={{ fontWeight: 700, color: "#102e50", fontSize: "0.95rem" }}>
                    {insights.bestNum.className}
                  </div>
                  <div style={{ color: "#df632f", fontWeight: 700, fontSize: "1.1rem" }}>
                    {insights.bestNum.avgNum.toFixed(1)}%
                  </div>
                </div>
              )}

              {/* Keterangan garis referensi */}
              <div
                style={{
                  padding: "0.85rem 1rem",
                  backgroundColor: "#f8fafc",
                  borderRadius: "0.85rem",
                  border: "1px solid #e2e8f0",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.4rem",
                }}
              >
                <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Rata-rata Sekolah
                </div>
                <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                  <div>
                    <span style={{ color: "#0874aa", fontWeight: 700 }}>Lit:</span>{" "}
                    <span style={{ fontWeight: 700, color: "#102e50" }}>{schoolAvgLit.toFixed(1)}%</span>
                  </div>
                  <div>
                    <span style={{ color: "#df632f", fontWeight: 700 }}>Num:</span>{" "}
                    <span style={{ fontWeight: 700, color: "#102e50" }}>{schoolAvgNum.toFixed(1)}%</span>
                  </div>
                </div>
                <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: "0.1rem" }}>
                  Garis putus-putus menunjukkan rata-rata
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div
          style={{
            height: 280,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            color: "#94a3b8",
            gap: "0.75rem",
          }}
        >
          <div style={{ fontSize: "0.95rem", fontWeight: 600, color: "#64748b" }}>
            Belum ada data capaian per kelas
          </div>
          <div style={{ fontSize: "0.82rem", color: "#9ca3af", textAlign: "center", maxWidth: 320 }}>
            Data akan tampil setelah siswa menyelesaikan asesmen dan kelas sudah terdaftar di sistem.
          </div>
        </div>
      )}
    </div>
  );
}
