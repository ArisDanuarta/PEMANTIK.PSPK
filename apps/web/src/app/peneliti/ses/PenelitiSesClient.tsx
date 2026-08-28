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
      <div className="card" style={{ padding: "1.5rem" }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 600, color: "#102e50", marginBottom: "0.5rem" }}>
          Korelasi SES terhadap Hasil Asesmen
        </h2>
        <p style={{ color: "#4b5563", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
          Koefisien Korelasi Pearson (r): <strong>{correlationCoef.toFixed(3)}</strong> 
          {correlationCoef > 0.5 ? " (Korelasi Positif Kuat)" : 
           correlationCoef > 0.3 ? " (Korelasi Positif Sedang)" : 
           correlationCoef > 0 ? " (Korelasi Positif Lemah)" : " (Tidak ada Korelasi/Negatif)"}
        </p>

        <div style={{ height: "400px", width: "100%" }}>
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis 
                type="number" 
                dataKey="sesScore" 
                name="Skor SES" 
                label={{ value: 'Skor SES (0-10)', position: 'insideBottom', offset: -10 }} 
                domain={[0, 10]}
              />
              <YAxis 
                type="number" 
                dataKey="assessScore" 
                name="Skor Asesmen" 
                label={{ value: 'Skor Asesmen', angle: -90, position: 'insideLeft' }} 
                domain={[0, 100]}
              />
              <ZAxis range={[30, 30]} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              <Scatter name="Siswa" data={scatterSample} fill="#0874aa" fillOpacity={0.4} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── MAP VIEW ── */}
      <div className="card" style={{ flex: 1, position: "relative", minHeight: "500px", overflow: "hidden", padding: 0, display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "1rem", borderBottom: "1px solid #e5e7eb" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 600, color: "#102e50", margin: 0 }}>
            Peta Sebaran Skor SES
          </h2>
        </div>
        <div style={{ flex: 1, position: "relative" }}>
          <SebaranMapViewer provinceStats={provinceStats} cityStats={cityStats} />
        </div>
      </div>
      
    </div>
  );
}
