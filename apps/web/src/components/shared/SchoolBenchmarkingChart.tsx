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
  ResponsiveContainer,
  ComposedChart,
  Line,
} from "recharts";

interface SchoolBenchmarkingChartProps {
  data: {
    schoolName: string;
    avgLiterasi: number;
    avgNumerasi: number;
    participationRate: number;
    totalStudents: number;
  }[];
}

const LIT_COLOR = "#2d9e5f";
const NUM_COLOR = "#df632f";
const PART_COLOR = "#0874aa"; // For participation rate line

export default function SchoolBenchmarkingChart({ data }: SchoolBenchmarkingChartProps) {
  // Sort schools by highest average (Literasi + Numerasi)
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => (b.avgLiterasi + b.avgNumerasi) - (a.avgLiterasi + a.avgNumerasi));
  }, [data]);

  if (!sortedData || sortedData.length === 0) {
    return (
      <div style={{ padding: "2rem", textAlign: "center", color: "#64748b", border: "1px dashed #cbd5e1", borderRadius: "0.75rem" }}>
        Belum ada data asesmen yang memadai untuk membandingkan sekolah.
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: 350, minWidth: 0 }}>
      <ResponsiveContainer width="99%" height="100%">
        <ComposedChart data={sortedData} margin={{ top: 20, right: 30, left: -10, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
          <XAxis 
            dataKey="schoolName" 
            tick={{ fontSize: 11, fill: "#64748b" }} 
            interval={0} 
            angle={-25} 
            textAnchor="end"
            height={70}
          />
          <YAxis 
            yAxisId="left" 
            tick={{ fontSize: 12, fill: "#64748b" }} 
            tickFormatter={(val) => `${val}%`}
            label={{ value: 'Rata-rata Skor (%)', angle: -90, position: 'insideLeft', offset: 15, fontSize: 12, fill: '#64748b' }} 
            domain={[0, 100]}
          />
          <YAxis 
            yAxisId="right" 
            orientation="right" 
            tick={{ fontSize: 12, fill: "#64748b" }} 
            tickFormatter={(val) => `${val}%`}
            domain={[0, 100]}
          />
          <Tooltip 
            contentStyle={{ borderRadius: '0.75rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
            formatter={(value: any, name: any) => {
              return [`${Number(value).toFixed(1)}%`, name];
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: '10px' }} />
          
          <Bar yAxisId="left" dataKey="avgLiterasi" name="Rata-rata Literasi" fill={LIT_COLOR} radius={[4, 4, 0, 0]} barSize={24} />
          <Bar yAxisId="left" dataKey="avgNumerasi" name="Rata-rata Numerasi" fill={NUM_COLOR} radius={[4, 4, 0, 0]} barSize={24} />
          
          <Line 
            yAxisId="right" 
            type="monotone" 
            dataKey="participationRate" 
            name="Partisipasi" 
            stroke={PART_COLOR} 
            strokeWidth={3} 
            dot={{ r: 4 }} 
            activeDot={{ r: 6 }} 
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
