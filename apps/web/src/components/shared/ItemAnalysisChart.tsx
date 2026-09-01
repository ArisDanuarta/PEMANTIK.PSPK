"use client";

import React, { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from "recharts";

interface ItemAnalysisRow {
  question_code: string;
  subject_area: string;
  total_answers: number;
  correct_answers: number;
  success_rate: number;
}

interface ItemAnalysisChartProps {
  data: ItemAnalysisRow[];
}

export default function ItemAnalysisChart({ data }: ItemAnalysisChartProps) {
  const [filter, setFilter] = useState<"all" | "literasi" | "numerasi">("all");

  const sortedData = useMemo(() => {
    let filtered = [...data];
    if (filter !== "all") {
      filtered = filtered.filter((d) => d.subject_area.toLowerCase() === filter);
    }
    // Sort by question_code with natural sorting (so NUM-1-2 comes before NUM-1-10)
    return filtered.sort((a, b) => {
      return a.question_code.localeCompare(b.question_code, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [data, filter]);

  if (!data || data.length === 0) {
    return (
      <div style={{ padding: "2rem", textAlign: "center", color: "#64748b", border: "1px dashed #cbd5e1", borderRadius: "0.75rem" }}>
        Belum ada data pengerjaan soal atau fungsi SQL belum ter-install.
      </div>
    );
  }

  return (
    <div style={{ width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1rem", gap: "0.5rem" }}>
        <button 
          onClick={() => setFilter("all")}
          style={{ padding: "0.4rem 0.75rem", fontSize: "0.8rem", borderRadius: "999px", border: "none", cursor: "pointer", backgroundColor: filter === "all" ? "#1e293b" : "#f1f5f9", color: filter === "all" ? "white" : "#475569", fontWeight: filter === "all" ? 600 : 500 }}
        >
          Semua
        </button>
        <button 
          onClick={() => setFilter("literasi")}
          style={{ padding: "0.4rem 0.75rem", fontSize: "0.8rem", borderRadius: "999px", border: "none", cursor: "pointer", backgroundColor: filter === "literasi" ? "#2d9e5f" : "#f1f5f9", color: filter === "literasi" ? "white" : "#475569", fontWeight: filter === "literasi" ? 600 : 500 }}
        >
          Literasi
        </button>
        <button 
          onClick={() => setFilter("numerasi")}
          style={{ padding: "0.4rem 0.75rem", fontSize: "0.8rem", borderRadius: "999px", border: "none", cursor: "pointer", backgroundColor: filter === "numerasi" ? "#df632f" : "#f1f5f9", color: filter === "numerasi" ? "white" : "#475569", fontWeight: filter === "numerasi" ? 600 : 500 }}
        >
          Numerasi
        </button>
      </div>

      <div style={{ width: "100%", height: 350, minWidth: 0 }}>
        <ResponsiveContainer width="99%" height="100%" minWidth={1} minHeight={1}>
          <BarChart data={sortedData} margin={{ top: 20, right: 30, left: -10, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis 
              dataKey="question_code" 
              tick={{ fontSize: 11, fill: "#64748b" }} 
              angle={-45} 
              textAnchor="end"
              height={50}
            />
            <YAxis 
              tick={{ fontSize: 12, fill: "#64748b" }} 
              label={{ value: 'Tingkat Keberhasilan (%)', angle: -90, position: 'insideLeft', offset: 15, fontSize: 12, fill: '#64748b' }} 
              domain={[0, 100]}
              tickFormatter={(val) => `${val}%`}
            />
            <Tooltip 
              contentStyle={{ borderRadius: '0.75rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
              formatter={(value: any, name: any, props: any) => {
                if (name === "Keberhasilan") return [`${Number(value).toFixed(1)}%`, "Keberhasilan"];
                return [value, name];
              }}
              labelFormatter={(label, payload) => {
                const item = payload[0]?.payload;
                return (
                  <span style={{ display: 'block' }}>
                    <span style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>Soal: {label} ({item?.subject_area})</span>
                    <span style={{ display: 'block', fontSize: '0.8rem', color: '#64748b' }}>Dijawab oleh: {item?.total_answers} siswa</span>
                  </span>
                );
              }}
            />
            <Bar dataKey="success_rate" name="Keberhasilan" radius={[4, 4, 0, 0]} maxBarSize={32}>
              {sortedData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.subject_area.toLowerCase() === 'literasi' ? '#2d9e5f' : '#df632f'} 
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      <div style={{ marginTop: "1rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "1.5rem", fontSize: "0.8rem", color: "#64748b" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <div style={{ width: 12, height: 12, backgroundColor: "#2d9e5f", borderRadius: 2 }}></div>
          Soal Literasi
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <div style={{ width: 12, height: 12, backgroundColor: "#df632f", borderRadius: 2 }}></div>
          Soal Numerasi
        </div>
      </div>
    </div>
  );
}
