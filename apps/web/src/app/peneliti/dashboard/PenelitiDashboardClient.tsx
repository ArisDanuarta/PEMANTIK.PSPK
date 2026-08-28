"use client";

import React from "react";

export default function PenelitiDashboardClient({ data }: { data: any }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* ── KPI CARDS ── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: "1rem",
      }}>
        <div className="card" style={{ padding: "1.5rem", borderLeft: "4px solid #0874aa" }}>
          <p style={{ fontSize: "0.85rem", color: "#4b5563", fontWeight: 600 }}>Total Siswa Asesmen</p>
          <h3 style={{ fontSize: "2rem", color: "#102e50", margin: "0.5rem 0" }}>
            {data.totalStudents.toLocaleString()}
          </h3>
        </div>
        <div className="card" style={{ padding: "1.5rem", borderLeft: "4px solid #10b981" }}>
          <p style={{ fontSize: "0.85rem", color: "#4b5563", fontWeight: 600 }}>Rata-rata Skor Nasional</p>
          <h3 style={{ fontSize: "2rem", color: "#102e50", margin: "0.5rem 0" }}>
            {data.avgScoreTotal.toFixed(1)}
          </h3>
        </div>
        <div className="card" style={{ padding: "1.5rem", borderLeft: "4px solid #8b5cf6" }}>
          <p style={{ fontSize: "0.85rem", color: "#4b5563", fontWeight: 600 }}>Tingkat Penyelesaian</p>
          <h3 style={{ fontSize: "2rem", color: "#102e50", margin: "0.5rem 0" }}>
            {data.completionRate.toFixed(1)}%
          </h3>
        </div>
        <div className="card" style={{ padding: "1.5rem", borderLeft: "4px solid #f59e0b" }}>
          <p style={{ fontSize: "0.85rem", color: "#4b5563", fontWeight: 600 }}>Sekolah Aktif Asesmen</p>
          <h3 style={{ fontSize: "2rem", color: "#102e50", margin: "0.5rem 0" }}>
            {data.activeSchools.toLocaleString()}
          </h3>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", gap: "1.5rem" }}>
        {/* ── TOP COMMUNITIES ── */}
        <div className="card" style={{ padding: "1.5rem" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 600, color: "#102e50", marginBottom: "1.25rem" }}>
            Top 5 Komunitas (Rata-rata Skor Tertinggi)
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {data.topCommunities.map((c: any, i: number) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "0.75rem", borderBottom: i !== data.topCommunities.length - 1 ? "1px solid #e5e7eb" : "none" }}>
                <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                  <div style={{ width: "24px", height: "24px", borderRadius: "50%", backgroundColor: "#e0f2fe", color: "#0369a1", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", fontWeight: 700 }}>
                    {i + 1}
                  </div>
                  <span style={{ fontWeight: 600, color: "#1f2937" }}>{c.name}</span>
                </div>
                <span style={{ fontWeight: 700, color: "#10b981" }}>{c.avgScore.toFixed(1)}</span>
              </div>
            ))}
            {data.topCommunities.length === 0 && (
              <div style={{ color: "#6b7280", textAlign: "center", padding: "1rem 0" }}>Belum ada data.</div>
            )}
          </div>
        </div>

        {/* ── LEVEL DISTRIBUTION ── */}
        <div className="card" style={{ padding: "1.5rem" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 600, color: "#102e50", marginBottom: "1.25rem" }}>
            Distribusi Level Nasional
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {data.levelDistribution.map((l: any, i: number) => {
              const maxCount = Math.max(...data.levelDistribution.map((d: any) => d.count));
              const pct = (l.count / maxCount) * 100;
              return (
                <div key={i}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "0.25rem", color: "#4b5563" }}>
                    <span>{l.level === "Level 0" ? "Level 0 (Dasar)" : l.level}</span>
                    <span style={{ fontWeight: 600 }}>{l.count.toLocaleString()} Siswa</span>
                  </div>
                  <div style={{ width: "100%", height: "8px", backgroundColor: "#f3f4f6", borderRadius: "4px", overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", backgroundColor: "#3b82f6", borderRadius: "4px" }} />
                  </div>
                </div>
              );
            })}
            {data.levelDistribution.length === 0 && (
              <div style={{ color: "#6b7280", textAlign: "center", padding: "1rem 0" }}>Belum ada data distribusi level.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
