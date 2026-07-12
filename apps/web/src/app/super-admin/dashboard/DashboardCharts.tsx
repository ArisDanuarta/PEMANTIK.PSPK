"use client";

import React, { useState, useEffect } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

export default function DashboardCharts({ 
  genderData, 
  assessmentData, 
  ageData 
}: { 
  genderData: any[], 
  assessmentData: any[], 
  ageData: any[] 
}) {
  // Brand Guidelines PSPK Colors
  const COLORS_PRIMARY = ["#102e50", "#f2af3e"]; // Navy & Emas
  const COLORS_SECONDARY = ["#0874aa", "#df632f", "#8e2d3f", "#f4b867"]; // Teal, Jingga, Merah Gelap, Kuning Muda

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem", marginTop: "1.5rem" }}>
      
      {/* Chart Gender */}
      <div className="card" style={{ padding: "1.5rem", borderTop: "4px solid #102e50" }}>
        <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "1rem", color: "#102e50", fontFamily: "var(--font-lora)" }}>
          Sebaran Gender Anak
        </h3>
        <div style={{ width: "100%", height: 250 }}>
          {isMounted ? (
            <ResponsiveContainer width="99%" height="100%" minWidth={1} minHeight={1}>
              <PieChart>
                <Pie
                  data={genderData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {genderData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS_PRIMARY[index % COLORS_PRIMARY.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)" }}
                />
                <Legend wrapperStyle={{ paddingTop: "20px" }} />
              </PieChart>
            </ResponsiveContainer>
          ) : null}
        </div>
      </div>

      {/* Chart Usia */}
      <div className="card" style={{ padding: "1.5rem", borderTop: "4px solid #f2af3e" }}>
        <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "1rem", color: "#102e50", fontFamily: "var(--font-lora)" }}>
          Sebaran Usia Anak
        </h3>
        <div style={{ width: "100%", height: 250 }}>
          {isMounted ? (
            <ResponsiveContainer width="99%" height="100%" minWidth={1} minHeight={1}>
              <BarChart data={ageData}>
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#4b5563" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#4b5563" }} axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{ fill: "rgba(16, 46, 80, 0.05)" }}
                  contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)" }}
                />
                <Bar dataKey="value" fill="#f2af3e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : null}
        </div>
      </div>

      {/* Chart Asesmen */}
      <div className="card" style={{ padding: "1.5rem", borderTop: "4px solid #a8281c" }}>
        <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "1rem", color: "#102e50", fontFamily: "var(--font-lora)" }}>
          Aktivitas Asesmen
        </h3>
        <div style={{ width: "100%", height: 250 }}>
          {isMounted ? (
            <ResponsiveContainer width="99%" height="100%" minWidth={1} minHeight={1}>
              <PieChart>
                <Pie
                  data={assessmentData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {assessmentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.name === "Literasi" ? "#a8281c" : "#df632f"} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)" }}
                />
                <Legend wrapperStyle={{ paddingTop: "20px" }} />
              </PieChart>
            </ResponsiveContainer>
          ) : null}
        </div>
      </div>

    </div>
  );
}
