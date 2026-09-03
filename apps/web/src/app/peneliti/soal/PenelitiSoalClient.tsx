"use client";

import React, { useState, useMemo } from "react";
import { Badge, Table } from "@pemantik/ui";
import { QuestionStat } from "./page";

function formatSeconds(seconds: number) {
  if (isNaN(seconds) || seconds < 0) return "0s";
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

export default function PenelitiSoalClient({ initialData }: { initialData: QuestionStat[] }) {
  const [filterSubject, setFilterSubject] = useState("all");
  const [sortOrder, setSortOrder] = useState<"easiest" | "hardest">("hardest");

  const filteredData = useMemo(() => {
    let result = initialData;
    if (filterSubject !== "all") {
      result = result.filter(q => q.subject_area === filterSubject);
    }
    
    // Sort
    result = [...result].sort((a, b) => {
      if (sortOrder === "hardest") return (a.success_rate || 0) - (b.success_rate || 0); // Lowest success rate first
      return (b.success_rate || 0) - (a.success_rate || 0); // Highest success rate first
    });
    
    return result;
  }, [initialData, filterSubject, sortOrder]);

  const columns = [
    { key: "question_code", label: "Kode Soal", render: (val: unknown) => <div style={{ fontWeight: 600, color: "#102e50" }}>{val as string}</div> },
    { key: "question_type", label: "Tipe Soal", render: (val: unknown) => (val as string) ? (val as string).replace('_', ' ') : '-' },
    { key: "subject_area", label: "Mata Pelajaran", render: (val: unknown) => <span style={{ textTransform: "capitalize" }}>{val as string}</span> },
    { key: "total_answers", label: "Total Menjawab", render: (val: unknown) => <div style={{ textAlign: "center" }}>{val as number}</div> },
    { key: "success_rate", label: "Tingkat Benar (Success Rate)", render: (val: unknown) => {
      const rate = val as number;
      return (
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <div style={{ flex: 1, height: "6px", backgroundColor: "#f3f4f6", borderRadius: "3px", overflow: "hidden" }}>
            <div style={{ width: `${rate}%`, height: "100%", backgroundColor: rate < 40 ? "#ef4444" : (rate > 70 ? "#10b981" : "#f59e0b") }} />
          </div>
          <span style={{ minWidth: "45px", textAlign: "right", fontWeight: 600 }}>{(rate||0).toFixed(1)}%</span>
        </div>
      );
    } },
    { key: "avg_time", label: "Rata-rata Waktu", render: (val: unknown) => <div style={{ textAlign: "center" }}>{formatSeconds((val as number) || 0)}</div> },
    { key: "difficulty", label: "Difficulty Index", render: (_: unknown, q: QuestionStat) => {
        const rate = q.success_rate || 0;
        let difficulty = "Sedang";
        let variant = "warning";
        if (rate < 40) { difficulty = "Sulit"; variant = "danger"; }
        else if (rate > 70) { difficulty = "Mudah"; variant = "success"; }
        return <div style={{ textAlign: "center" }}><Badge variant={variant as "danger" | "warning" | "success" | "default"}>{difficulty}</Badge></div>;
    }}
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div className="card" style={{ padding: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 600, color: "#102e50", margin: 0 }}>
            Item Analysis (Tingkat Kesulitan Soal)
          </h2>
        </div>
        
        <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem" }}>
          <select className="form-input" style={{ width: "200px" }} value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)}>
            <option value="all">Semua Mata Pelajaran</option>
            <option value="literasi">Literasi</option>
            <option value="numerasi">Numerasi</option>
          </select>
          
          <select className="form-input" style={{ width: "200px" }} value={sortOrder} onChange={(e) => setSortOrder(e.target.value as "easiest" | "hardest")}>
            <option value="hardest">Urut: Paling Sulit (Success Rate Terendah)</option>
            <option value="easiest">Urut: Paling Mudah (Success Rate Tertinggi)</option>
          </select>
        </div>

        <Table
          columns={columns}
          data={filteredData}
          emptyMessage="Belum ada data analisis soal."
        />
      </div>
    </div>
  );
}
