"use client";

import React, { useMemo } from "react";
import SebaranMapViewer from "@/app/super-admin/sebaran-ses/SebaranMapViewer";
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ZAxis
} from 'recharts';

export default function PenelitiSesClient({ 
  provinceStats, 
  cityStats, 
  correlationData 
}: { 
  provinceStats: any; 
  cityStats: any;
  correlationData: any[];
}) {

  // For scatter plot, we might want to sample if data is huge, but recharts can handle a few thousand.
  const scatterSample = useMemo(() => {
    // take up to 2000 points to avoid browser lag
    if (correlationData.length > 2000) {
      return correlationData.slice(0, 2000);
    }
    return correlationData;
  }, [correlationData]);

  // Calculate correlation coefficient (Pearson's r)
  const correlationCoef = useMemo(() => {
    if (correlationData.length < 2) return 0;
    
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
    const n = correlationData.length;

    correlationData.forEach(d => {
      sumX += d.sesScore;
      sumY += d.assessScore;
      sumXY += (d.sesScore * d.assessScore);
      sumX2 += (d.sesScore * d.sesScore);
      sumY2 += (d.assessScore * d.assessScore);
    });

    const numerator = (n * sumXY) - (sumX * sumY);
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    
    if (denominator === 0) return 0;
    return numerator / denominator;
  }, [correlationData]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", height: "100%" }}>
      
      {/* ── Correlation Summary ── */}
      <div style={{ 
        background: "white", 
        borderRadius: "24px", 
        boxShadow: "0 4px 20px rgba(0,0,0,0.03)", 
        border: "1px solid rgba(0,0,0,0.04)", 
        padding: "2rem",
        display: "flex",
        flexDirection: "column",
        gap: "2rem"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
              <div style={{ background: "rgba(59, 130, 246, 0.1)", padding: "0.5rem", borderRadius: "12px", color: "#3b82f6" }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><circle cx="9" cy="14" r="2"/><circle cx="14" cy="9" r="2"/><circle cx="19" cy="4" r="2"/></svg>
              </div>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0f172a", margin: 0, letterSpacing: "-0.02em" }}>
                Korelasi SES & Asesmen
              </h2>
            </div>
            <p style={{ color: "#64748b", fontSize: "0.9rem", margin: 0, maxWidth: "600px", lineHeight: 1.5 }}>
              Visualisasi <em>scatter plot</em> persebaran skor Status Sosial Ekonomi (SES) berbanding dengan performa rata-rata skor asesmen siswa.
            </p>
          </div>
          
          {/* Pearson Correlation Stats Badge */}
          <div style={{ 
            display: "flex", alignItems: "center", gap: "1rem", 
            background: "#f8fafc", padding: "1rem 1.5rem", borderRadius: "16px", border: "1px solid #e2e8f0" 
          }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Koefisien Pearson (r)</span>
              <span style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a", lineHeight: 1.2 }}>
                {correlationCoef.toFixed(3)}
              </span>
            </div>
            <div style={{ width: "1px", height: "40px", background: "#cbd5e1" }}></div>
            <div style={{ 
              padding: "0.5rem 1rem", 
              background: correlationCoef > 0.5 ? "rgba(16, 185, 129, 0.1)" : correlationCoef > 0.3 ? "rgba(59, 130, 246, 0.1)" : correlationCoef > 0 ? "rgba(245, 158, 11, 0.1)" : "rgba(244, 63, 94, 0.1)",
              color: correlationCoef > 0.5 ? "#10b981" : correlationCoef > 0.3 ? "#3b82f6" : correlationCoef > 0 ? "#d97706" : "#e11d48",
              borderRadius: "20px",
              fontSize: "0.85rem",
              fontWeight: 700,
            }}>
              {correlationCoef > 0.5 ? "Positif Kuat" : 
               correlationCoef > 0.3 ? "Positif Sedang" : 
               correlationCoef > 0 ? "Positif Lemah" : "Negatif / Tidak Ada"}
            </div>
          </div>
        </div>

        <div style={{ height: "420px", width: "100%", background: "#f8fafc", borderRadius: "16px", padding: "1rem" }}>
          <ResponsiveContainer width="99%" height="100%" minWidth={1} minHeight={1}>
            <ScatterChart margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis 
                type="number" 
                dataKey="sesScore" 
                name="Skor SES" 
                tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }}
                axisLine={{ stroke: '#cbd5e1' }}
                tickLine={false}
                label={{ value: 'Skor SES (Status Sosial Ekonomi)', position: 'insideBottom', offset: -15, fill: '#475569', fontSize: 13, fontWeight: 600 }} 
                domain={[0, 10]}
              />
              <YAxis 
                type="number" 
                dataKey="assessScore" 
                name="Skor Asesmen" 
                tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
                label={{ value: 'Rata-rata Skor Asesmen', angle: -90, position: 'insideLeft', offset: -5, fill: '#475569', fontSize: 13, fontWeight: 600 }} 
                domain={[0, 100]}
              />
              <ZAxis range={[40, 40]} />
              <Tooltip 
                cursor={{ strokeDasharray: '3 3', stroke: '#94a3b8', strokeWidth: 1 }} 
                content={({ active, payload }: any) => {
                  if (active && payload && payload.length) {
                    return (
                      <div style={{
                        background: "rgba(255, 255, 255, 0.95)",
                        backdropFilter: "blur(12px)",
                        border: "1px solid rgba(0,0,0,0.05)",
                        boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)",
                        padding: "16px",
                        borderRadius: "16px",
                        minWidth: "180px"
                      }}>
                        <p style={{ margin: "0 0 12px 0", fontWeight: 800, color: "#0f172a", fontSize: "0.95rem", borderBottom: "1px solid #f1f5f9", paddingBottom: "8px" }}>Data Analisis</p>
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px" }}>
                            <span style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: 600 }}>Skor SES</span>
                            <span style={{ fontSize: "0.9rem", fontWeight: 800, color: "#3b82f6" }}>{Number(payload[0]?.value).toFixed(1)}</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px" }}>
                            <span style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: 600 }}>Hasil Asesmen</span>
                            <span style={{ fontSize: "0.9rem", fontWeight: 800, color: "#10b981" }}>{Number(payload[1]?.value).toFixed(1)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Scatter 
                name="Siswa" 
                data={scatterSample} 
                fill="#3b82f6" 
                fillOpacity={0.4} 
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── MAP VIEW ── */}
      <div className="card" style={{ flex: 1, position: "relative", minHeight: "600px", overflow: "hidden", padding: 0, display: "flex", flexDirection: "column" }}>
        <SebaranMapViewer provinceStats={provinceStats} cityStats={cityStats} />
      </div>
      
    </div>
  );
}
