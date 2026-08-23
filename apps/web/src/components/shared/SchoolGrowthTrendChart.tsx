"use client";

import React, { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceDot,
  Area,
  AreaChart,
} from "recharts";

export interface PhaseTrendItem {
  phase: string;
  avgLit: number;
  avgNum: number;
  participantCount: number;
}

interface SchoolGrowthTrendChartProps {
  trendData: PhaseTrendItem[];
}

const LIT_COLOR = "#0874aa";
const NUM_COLOR = "#df632f";

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0]?.payload as PhaseTrendItem;
    if (!data) return null;

    const litVal = data.avgLit;
    const numVal = data.avgNum;

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
          }}
        >
          {label}
        </div>

        <div
          style={{
            fontSize: "0.75rem",
            color: "#94a3b8",
            marginBottom: "0.75rem",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
          }}
        >
          <span>{data.participantCount} anak berpartisipasi</span>
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
            <span
              style={{ fontWeight: 700, fontSize: "1rem", color: "#bae6fd" }}
            >
              {litVal > 0 ? `${litVal.toFixed(1)}%` : "—"}
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
            <span
              style={{ fontWeight: 700, fontSize: "1rem", color: "#fed7aa" }}
            >
              {numVal > 0 ? `${numVal.toFixed(1)}%` : "—"}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

// Custom dot dengan label nilai
const CustomDot = (props: any) => {
  const { cx, cy, value, stroke } = props;
  if (!cx || !cy || value === 0) return null;
  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r={6}
        fill={stroke}
        stroke="white"
        strokeWidth={2}
        style={{ filter: `drop-shadow(0 2px 4px ${stroke}66)` }}
      />
      <text
        x={cx}
        y={cy - 14}
        textAnchor="middle"
        fontSize={11}
        fontWeight={700}
        fill={stroke}
      >
        {Number(value).toFixed(1)}%
      </text>
    </g>
  );
};

export default function SchoolGrowthTrendChart({
  trendData,
}: SchoolGrowthTrendChartProps) {
  const sortedData = useMemo(() => {
    // Sort: Tahap 1, Tahap 2, Tahap 3, dst.
    return [...trendData].sort((a, b) => {
      const extractNum = (s: string) => {
        const m = s.match(/\d+/);
        return m ? parseInt(m[0]) : 0;
      };
      return extractNum(a.phase) - extractNum(b.phase);
    });
  }, [trendData]);

  const hasEnoughData = sortedData.length >= 2;
  const hasAnyData = sortedData.length >= 1;

  // Insight: apakah tren naik/turun dari fase terakhir vs sebelumnya
  const trendInsight = useMemo(() => {
    if (sortedData.length < 2) return null;
    const last = sortedData[sortedData.length - 1];
    const prev = sortedData[sortedData.length - 2];
    const litDiff = last.avgLit - prev.avgLit;
    const numDiff = last.avgNum - prev.avgNum;
    return { litDiff, numDiff, lastPhase: last.phase, prevPhase: prev.phase };
  }, [sortedData]);

  const TrendBadge = ({
    diff,
    subject,
  }: {
    diff: number;
    subject: string;
  }) => {
    const isUp = diff > 0.5;
    const isDown = diff < -0.5;
    const isFlat = !isUp && !isDown;
    const color = isUp ? "#10b981" : isDown ? "#ef4444" : "#64748b";
    const bg = isUp
      ? "rgba(16,185,129,0.1)"
      : isDown
      ? "rgba(239,68,68,0.1)"
      : "rgba(100,116,139,0.1)";

    const text = isFlat
      ? "Stabil"
      : `${isUp ? "+" : ""}${diff.toFixed(1)}%`;

    return (
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.35rem",
          padding: "0.25rem 0.7rem",
          backgroundColor: bg,
          borderRadius: "999px",
          border: `1px solid ${color}33`,
          fontSize: "0.8rem",
          fontWeight: 700,
          color,
        }}
      >
        <span>
          {subject}: {text}
        </span>
      </div>
    );
  };

  return (
    <div
      style={{
        backgroundColor: "white",
        borderRadius: "1.25rem",
        padding: "2rem",
        boxShadow:
          "0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.05)",
        border: "1px solid #e2e8f0",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: "1.5rem" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
            marginBottom: "0.35rem",
          }}
        >
          <div
            style={{
              width: 4,
              height: 28,
              backgroundColor: "#10b981",
              borderRadius: "4px",
            }}
          ></div>
          <h3
            style={{
              fontFamily: "Lora, serif",
              fontSize: "1.2rem",
              color: "#102e50",
              margin: 0,
              fontWeight: 700,
            }}
          >
            Tren Pertumbuhan Global Sekolah
          </h3>
        </div>
        <p style={{ margin: 0, fontSize: "0.83rem", color: "#64748b", maxWidth: 580 }}>
          Pergerakan rata-rata skor capaian seluruh populasi sekolah dari satu
          fase ke fase berikutnya, mengukur keberhasilan program secara
          keseluruhan.
        </p>
      </div>

      {/* Trend Badges */}
      {trendInsight && (
        <div
          style={{
            display: "flex",
            gap: "0.6rem",
            flexWrap: "wrap",
            marginBottom: "1.25rem",
            padding: "0.85rem 1rem",
            backgroundColor: "#f8fafc",
            borderRadius: "0.85rem",
            border: "1px solid #e2e8f0",
            alignItems: "center",
          }}
        >
          <span
            style={{
              fontSize: "0.78rem",
              color: "#94a3b8",
              fontWeight: 600,
              marginRight: "0.25rem",
            }}
          >
            {trendInsight.prevPhase} ke {trendInsight.lastPhase}:
          </span>
          <TrendBadge diff={trendInsight.litDiff} subject="Literasi" />
          <TrendBadge diff={trendInsight.numDiff} subject="Numerasi" />
        </div>
      )}

      {/* Chart */}
      {hasAnyData ? (
        <div style={{ width: "100%", height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={sortedData}
              margin={{ top: 30, right: 30, left: 0, bottom: 20 }}
            >
              <defs>
                <linearGradient id="litGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={LIT_COLOR} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={LIT_COLOR} stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="numGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={NUM_COLOR} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={NUM_COLOR} stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#f1f5f9"
                vertical={false}
              />
              <XAxis
                dataKey="phase"
                stroke="#94a3b8"
                fontSize={12}
                fontWeight={600}
                tickLine={false}
                tick={{ fill: "#475569" }}
              />
              <YAxis
                stroke="#94a3b8"
                fontSize={12}
                tickLine={false}
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
                tick={{ fill: "#475569" }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="bottom"
                align="center"
                wrapperStyle={{
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  paddingTop: "1rem",
                }}
              />

              <Line
                type="monotone"
                dataKey="avgLit"
                name="Literasi (%)"
                stroke={LIT_COLOR}
                strokeWidth={3}
                dot={<CustomDot stroke={LIT_COLOR} />}
                activeDot={{ r: 8, fill: LIT_COLOR, stroke: "white", strokeWidth: 2 }}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="avgNum"
                name="Numerasi (%)"
                stroke={NUM_COLOR}
                strokeWidth={3}
                dot={<CustomDot stroke={NUM_COLOR} />}
                activeDot={{ r: 8, fill: NUM_COLOR, stroke: "white", strokeWidth: 2 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
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
          <div
            style={{ fontSize: "0.95rem", fontWeight: 600, color: "#64748b" }}
          >
            Belum ada data tren
          </div>
          <div
            style={{
              fontSize: "0.82rem",
              color: "#9ca3af",
              textAlign: "center",
              maxWidth: 320,
            }}
          >
            Data tren akan muncul setelah anak menyelesaikan asesmen di minimal
            satu fase.
          </div>
        </div>
      )}

      {/* Info: hanya 1 fase */}
      {hasAnyData && !hasEnoughData && (
        <div
          style={{
            marginTop: "1rem",
            padding: "0.85rem 1rem",
            backgroundColor: "rgba(245,158,11,0.06)",
            borderRadius: "0.75rem",
            border: "1px solid rgba(245,158,11,0.18)",
            fontSize: "0.82rem",
            color: "#92400e",
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
          }}
        >
          <span>
            Tren pertumbuhan akan terlihat setelah sekolah menyelesaikan
            asesmen di minimal{" "}
            <strong>2 fase</strong>. Saat ini baru ada data dari{" "}
            <strong>{sortedData[0]?.phase}</strong>.
          </span>
        </div>
      )}

      {/* Breakdown per fase */}
      {hasAnyData && (
        <div
          style={{
            marginTop: "1.25rem",
            display: "grid",
            gridTemplateColumns: `repeat(${Math.min(sortedData.length, 4)}, 1fr)`,
            gap: "0.75rem",
          }}
        >
          {sortedData.map((d, i) => (
            <div
              key={i}
              style={{
                padding: "0.9rem 1rem",
                backgroundColor: "#f8fafc",
                borderRadius: "0.85rem",
                border: "1px solid #e2e8f0",
                display: "flex",
                flexDirection: "column",
                gap: "0.4rem",
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  color: "#102e50",
                  borderBottom: "1px dashed #e2e8f0",
                  paddingBottom: "0.4rem",
                  marginBottom: "0.1rem",
                }}
              >
                {d.phase}
              </div>
              <div
                style={{
                  fontSize: "0.78rem",
                  color: "#64748b",
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span>Peserta:</span>
                <strong>{d.participantCount} anak</strong>
              </div>
              <div
                style={{
                  fontSize: "0.78rem",
                  color: "#0874aa",
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span>Literasi:</span>
                <strong>
                  {d.avgLit > 0 ? `${d.avgLit.toFixed(1)}%` : "-"}
                </strong>
              </div>
              <div
                style={{
                  fontSize: "0.78rem",
                  color: "#df632f",
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span>Numerasi:</span>
                <strong>
                  {d.avgNum > 0 ? `${d.avgNum.toFixed(1)}%` : "-"}
                </strong>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
