"use client";

import React, { useState, useMemo } from "react";
import { HierarchicalNode } from "./page";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, RadialBarChart, RadialBar, PolarAngleAxis
} from 'recharts';

interface PenelitiWilayahClientProps {
  hierarchicalData: HierarchicalNode;
}

export default function PenelitiWilayahClient({ hierarchicalData }: PenelitiWilayahClientProps) {
  // Path of nodes for breadcrumbs/drilling down. Index 0 is root (Nasional).
  const [path, setPath] = useState<HierarchicalNode[]>([hierarchicalData]);
  const [chartMode, setChartMode] = useState<"score" | "student">("score");

  const currentNode = path[path.length - 1];

  const handleDrillDown = (nodeName: string) => {
    const child = currentNode.children.find(c => c.name === nodeName);
    if (child) {
      setPath([...path, child]);
    }
  };

  const handleGoBack = (index: number) => {
    setPath(path.slice(0, index + 1));
  };

  // Sort children for charts (limit to top 15 to avoid clutter)
  const chartData = useMemo(() => {
    const sorted = [...currentNode.children].sort((a, b) => {
      if (chartMode === "score") return b.avgScore - a.avgScore;
      return b.studentCount - a.studentCount;
    });
    return sorted.slice(0, 15);
  }, [currentNode, chartMode]);

  // Colors based on score performance
  const getColor = (score: number) => {
    if (score >= 80) return "#10b981"; // Emerald green
    if (score >= 60) return "#3b82f6"; // Blue
    if (score >= 40) return "#f59e0b"; // Amber
    return "#ef4444"; // Red
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", height: "100%", paddingBottom: "2rem" }}>
      
      {/* ── Breadcrumb Navigation ── */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", background: "white", padding: "1rem 1.5rem", borderRadius: "16px", boxShadow: "0 2px 10px rgba(0,0,0,0.02)" }}>
        {path.map((node, i) => (
          <React.Fragment key={`${node.name}-${i}`}>
            <button 
              onClick={() => handleGoBack(i)}
              style={{ 
                background: "none", border: "none", cursor: i === path.length - 1 ? "default" : "pointer",
                fontSize: "1rem", fontWeight: i === path.length - 1 ? 700 : 500,
                color: i === path.length - 1 ? "#0f172a" : "#64748b",
                padding: "0.25rem 0.5rem", borderRadius: "6px",
                backgroundColor: i !== path.length - 1 ? "transparent" : "rgba(59, 130, 246, 0.05)"
              }}
              onMouseOver={(e) => { if (i !== path.length - 1) e.currentTarget.style.backgroundColor = "#f1f5f9"; }}
              onMouseOut={(e) => { if (i !== path.length - 1) e.currentTarget.style.backgroundColor = "transparent"; }}
            >
              {node.name}
            </button>
            {i < path.length - 1 && <span style={{ color: "#cbd5e1", fontWeight: 700 }}>/</span>}
          </React.Fragment>
        ))}
      </div>

      {/* ── Data Visualization: Ringkasan Wilayah (Radial Bar Chart) ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: "2rem", background: "white", borderRadius: "24px", boxShadow: "0 4px 20px rgba(0,0,0,0.03)", padding: "2.5rem", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a", marginBottom: "0.5rem" }}>Ringkasan Wilayah</h2>
          <p style={{ color: "#64748b", marginBottom: "2.5rem", lineHeight: 1.6 }}>
            Statistik agregat untuk wilayah <strong>{currentNode.name}</strong>. Persentase dihitung terhadap total skala nasional.
          </p>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {[
              { name: "Total Sekolah", value: currentNode.schoolCount.toLocaleString('id-ID'), percentage: (currentNode.schoolCount / Math.max(1, hierarchicalData.schoolCount)) * 100, fill: "#8b5cf6" },
              { name: "Total Siswa", value: currentNode.studentCount.toLocaleString('id-ID'), percentage: (currentNode.studentCount / Math.max(1, hierarchicalData.studentCount)) * 100, fill: "#3b82f6" },
              { name: "Rata-Rata Nilai", value: currentNode.avgScore.toFixed(1), percentage: currentNode.avgScore, fill: getColor(currentNode.avgScore) }
            ].map((d) => (
              <div key={d.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: "1rem", borderBottom: "1px solid #f1f5f9" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <div style={{ width: "16px", height: "16px", borderRadius: "50%", background: d.fill }}></div>
                  <span style={{ color: "#475569", fontWeight: 600, fontSize: "1.05rem" }}>{d.name}</span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
                  <span style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a" }}>{d.value}</span>
                  <span style={{ fontSize: "0.875rem", color: d.fill, fontWeight: 700 }}>({d.percentage.toFixed(1)}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ height: "360px", position: "relative" }}>
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart 
              cx="50%" 
              cy="50%" 
              innerRadius="30%" 
              outerRadius="100%" 
              barSize={24} 
              data={[
                { name: "Rata-Rata Nilai", percentage: currentNode.avgScore, fill: getColor(currentNode.avgScore) },
                { name: "Total Siswa", percentage: (currentNode.studentCount / Math.max(1, hierarchicalData.studentCount)) * 100, fill: "#3b82f6" },
                { name: "Total Sekolah", percentage: (currentNode.schoolCount / Math.max(1, hierarchicalData.schoolCount)) * 100, fill: "#8b5cf6" }
              ]}
              startAngle={90} 
              endAngle={-180}
            >
              <PolarAngleAxis 
                type="number" 
                domain={[0, 100]} 
                angleAxisId={0} 
                tick={{ fill: '#64748b', fontSize: '0.875rem', fontWeight: 700 }}
                tickCount={6}
                tickFormatter={(val) => `${val}%`}
              />
              <RadialBar
                background={{ fill: '#f1f5f9' }}
                dataKey="percentage"
                cornerRadius={12}
              />
              <Tooltip 
                cursor={{ fill: 'transparent' }}
                contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}
                formatter={(value: any) => [`${Number(value).toFixed(1)}%`, 'Persentase']}
              />
            </RadialBarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Data Visualization ── */}
      {currentNode.children.length > 0 ? (
        <div style={{ background: "white", borderRadius: "24px", boxShadow: "0 4px 20px rgba(0,0,0,0.03)", border: "1px solid rgba(0,0,0,0.04)", padding: "2rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
              Distribusi {currentNode.type === "national" ? "Provinsi" : currentNode.type === "province" ? "Kabupaten/Kota" : currentNode.type === "city" ? "Kecamatan" : currentNode.type === "district" ? "Desa" : "Sekolah"}
            </h2>
            <div style={{ display: "flex", gap: "0.5rem", background: "#f1f5f9", padding: "0.25rem", borderRadius: "10px" }}>
              <button 
                onClick={() => setChartMode("score")}
                style={{ border: "none", background: chartMode === "score" ? "white" : "transparent", padding: "0.5rem 1rem", borderRadius: "8px", fontWeight: 600, color: chartMode === "score" ? "#0f172a" : "#64748b", cursor: "pointer", boxShadow: chartMode === "score" ? "0 2px 5px rgba(0,0,0,0.05)" : "none" }}
              >
                Skor Asesmen
              </button>
              <button 
                onClick={() => setChartMode("student")}
                style={{ border: "none", background: chartMode === "student" ? "white" : "transparent", padding: "0.5rem 1rem", borderRadius: "8px", fontWeight: 600, color: chartMode === "student" ? "#0f172a" : "#64748b", cursor: "pointer", boxShadow: chartMode === "student" ? "0 2px 5px rgba(0,0,0,0.05)" : "none" }}
              >
                Jumlah Siswa
              </button>
            </div>
          </div>
          
          <div style={{ height: "350px", width: "100%", background: "#f8fafc", borderRadius: "16px", padding: "1rem" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  tickFormatter={(val) => val.length > 15 ? val.substring(0, 15) + '...' : val}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={false}
                  interval={0}
                  angle={-30}
                  textAnchor="end"
                />
                <YAxis 
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  domain={chartMode === "score" ? [0, 100] : ['auto', 'auto']}
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}
                  formatter={(value: any) => [chartMode === "score" ? Number(value).toFixed(1) : Number(value).toLocaleString('id-ID'), chartMode === "score" ? "Nilai Rata-rata" : "Jumlah Siswa"]}
                />
                <Bar 
                  dataKey={chartMode === "score" ? "avgScore" : "studentCount"} 
                  radius={[6, 6, 0, 0]}
                  barSize={40}
                  onClick={(data: any) => data?.name && handleDrillDown(data.name)}
                  style={{ cursor: "pointer" }}
                >
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={chartMode === "score" ? getColor(entry.avgScore) : "#3b82f6"} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div style={{ padding: "3rem", textAlign: "center", background: "white", borderRadius: "24px", color: "#64748b" }}>
          Tidak ada data turunan untuk tingkat ini.
        </div>
      )}

      {/* ── Hierarchical Table ── */}
      {currentNode.children.length > 0 && (
        <div style={{ background: "white", borderRadius: "24px", boxShadow: "0 4px 20px rgba(0,0,0,0.03)", border: "1px solid rgba(0,0,0,0.04)", overflow: "hidden" }}>
          <div style={{ padding: "1.5rem 2rem", borderBottom: "1px solid #f1f5f9" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#0f172a", margin: 0 }}>Rincian Data</h3>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ background: "#f8fafc", color: "#64748b", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  <th style={{ padding: "1rem 2rem", fontWeight: 600 }}>Nama Wilayah</th>
                  <th style={{ padding: "1rem 1rem", fontWeight: 600 }}>Sekolah</th>
                  <th style={{ padding: "1rem 1rem", fontWeight: 600 }}>Siswa</th>
                  <th style={{ padding: "1rem 1rem", fontWeight: 600 }}>Rata-Rata Nilai</th>
                  <th style={{ padding: "1rem 2rem", fontWeight: 600, textAlign: "right" }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {currentNode.children.map((child, idx) => (
                  <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.2s" }} onMouseOver={e => e.currentTarget.style.background = "#f8fafc"} onMouseOut={e => e.currentTarget.style.background = "transparent"}>
                    <td style={{ padding: "1rem 2rem", fontWeight: 600, color: "#0f172a" }}>{child.name}</td>
                    <td style={{ padding: "1rem 1rem", color: "#475569" }}>{child.schoolCount.toLocaleString('id-ID')}</td>
                    <td style={{ padding: "1rem 1rem", color: "#475569" }}>{child.studentCount.toLocaleString('id-ID')}</td>
                    <td style={{ padding: "1rem 1rem", fontWeight: 700, color: getColor(child.avgScore) }}>
                      {child.avgScore.toFixed(1)}
                    </td>
                    <td style={{ padding: "1rem 2rem", textAlign: "right" }}>
                      {child.children.length > 0 && (
                        <button 
                          onClick={() => handleDrillDown(child.name)}
                          style={{
                            background: "rgba(59, 130, 246, 0.1)", color: "#3b82f6", border: "none", 
                            padding: "0.5rem 1rem", borderRadius: "8px", fontWeight: 600, cursor: "pointer",
                            fontSize: "0.85rem"
                          }}
                        >
                          Lihat Detail
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
