"use client";

import React, { useMemo } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";

export interface AchievementChartsProps {
  ageDistData: { age: number | string; count: number }[];
  litLevelDist: { level: number; count: number }[];
  numLevelDist: { level: number; count: number }[];
  litByAge: { age: number | string; avgLevel: number; count: number }[];
  numByAge: { age: number | string; avgLevel: number; count: number }[];
  litBySes: { ses: string; avgLevel: number; count: number }[];
  numBySes: { ses: string; avgLevel: number; count: number }[];
}

const LIT_COLOR = "#0874aa";
const NUM_COLOR = "#df632f";
const AGE_COLOR = "#2d9e5f";

export default function AchievementChartsSection({
  ageDistData,
  litLevelDist,
  numLevelDist,
  litByAge,
  numByAge,
  litBySes,
  numBySes
}: AchievementChartsProps) {
  
  // Format SES Data to combine Lit and Num
  const combinedSesData = useMemo(() => {
    const map = new Map<string, any>();
    
    litBySes.forEach(item => {
      map.set(item.ses, { ses: item.ses, avgLit: item.avgLevel, countLit: item.count });
    });
    
    numBySes.forEach(item => {
      const existing = map.get(item.ses) || { ses: item.ses };
      existing.avgNum = item.avgLevel;
      existing.countNum = item.count;
      map.set(item.ses, existing);
    });

    // Urutkan SES (bawah -> atas)
    const order = ["bawah", "menengah_bawah", "menengah_atas", "atas"];
    return Array.from(map.values()).sort((a, b) => {
      const idxA = order.indexOf(a.ses.toLowerCase());
      const idxB = order.indexOf(b.ses.toLowerCase());
      return (idxA !== -1 ? idxA : 99) - (idxB !== -1 ? idxB : 99);
    }).map(item => {
      // Label yg lebih bagus
      let label = item.ses;
      if (label === 'bawah') label = 'Bawah';
      else if (label === 'menengah_bawah') label = 'Menengah Bawah';
      else if (label === 'menengah_atas') label = 'Menengah Atas';
      else if (label === 'atas') label = 'Atas';
      return { ...item, sesLabel: label };
    });
  }, [litBySes, numBySes]);

  // Wrapper untuk styling standard
  const ChartCard = ({ title, children, description }: { title: string, children: React.ReactNode, description?: string }) => (
    <div style={{ backgroundColor: "white", padding: "1.5rem", borderRadius: "1rem", boxShadow: "0 2px 4px rgba(0,0,0,0.05)", border: "1px solid #f1f3f5", height: "100%", display: "flex", flexDirection: "column" }}>
      <h4 style={{ fontSize: "1rem", color: "#374151", marginBottom: description ? "0.25rem" : "1rem", fontWeight: 600 }}>{title}</h4>
      {description && <p style={{ fontSize: "0.8rem", color: "#6b7280", marginBottom: "1rem" }}>{description}</p>}
      <div style={{ width: "100%", height: 300 }}>
        {children}
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      
      {/* 1. Usia & Populasi */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.5rem" }}>
        <ChartCard title="Distribusi Usia Anak" description="Berdasarkan data tanggal lahir di profil siswa">
          {ageDistData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ageDistData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="age" tick={{ fontSize: 12, fill: "#6b7280" }} label={{ value: 'Usia (Tahun)', position: 'insideBottom', offset: -5, fontSize: 12, fill: '#6b7280' }} />
                <YAxis tick={{ fontSize: 12, fill: "#6b7280" }} allowDecimals={false} />
                <Tooltip formatter={(val: any) => [`${val} Anak`, 'Jumlah']} />
                <Bar dataKey="count" fill={AGE_COLOR} radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: "0.9rem" }}>Tidak ada data usia</div>
          )}
        </ChartCard>
        
        {/* Capaian Level Tertinggi - Literasi */}
        <ChartCard title="Distribusi Level Literasi Tertinggi" description="Mengambil 1 level tertinggi yang berhasil diselesaikan tiap anak">
          {litLevelDist.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={litLevelDist} layout="vertical" margin={{ top: 10, right: 30, left: 60, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                <XAxis type="number" tick={{ fontSize: 12, fill: "#6b7280" }} allowDecimals={false} />
                <YAxis dataKey="level" type="category" tick={{ fontSize: 12, fill: "#6b7280" }} tickFormatter={(val) => `Level ${val}`} />
                <Tooltip formatter={(val: any) => [`${val} Anak`, 'Jumlah']} labelFormatter={(val) => `Level ${val}`} />
                <Bar dataKey="count" fill={LIT_COLOR} radius={[0, 4, 4, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: "0.9rem" }}>Belum ada capaian literasi</div>
          )}
        </ChartCard>

        {/* Capaian Level Tertinggi - Numerasi */}
        <ChartCard title="Distribusi Level Numerasi Tertinggi" description="Mengambil 1 level tertinggi yang berhasil diselesaikan tiap anak">
          {numLevelDist.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={numLevelDist} layout="vertical" margin={{ top: 10, right: 30, left: 60, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                <XAxis type="number" tick={{ fontSize: 12, fill: "#6b7280" }} allowDecimals={false} />
                <YAxis dataKey="level" type="category" tick={{ fontSize: 12, fill: "#6b7280" }} tickFormatter={(val) => `Level ${val}`} />
                <Tooltip formatter={(val: any) => [`${val} Anak`, 'Jumlah']} labelFormatter={(val) => `Level ${val}`} />
                <Bar dataKey="count" fill={NUM_COLOR} radius={[0, 4, 4, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: "0.9rem" }}>Belum ada capaian numerasi</div>
          )}
        </ChartCard>
      </div>

      {/* 2. Capaian Berdasarkan Usia */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.5rem" }}>
        <ChartCard title="Rata-rata Level Literasi Berdasarkan Usia">
          {litByAge.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={litByAge} margin={{ top: 20, right: 30, left: 0, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" dataKey="age" domain={['dataMin', 'dataMax']} tick={{ fontSize: 12, fill: "#6b7280" }} label={{ value: 'Usia (Tahun)', position: 'insideBottom', offset: -5, fontSize: 12, fill: '#6b7280' }} />
                <YAxis tick={{ fontSize: 12, fill: "#6b7280" }} label={{ value: 'Level Rata-rata', angle: -90, position: 'insideLeft', offset: 15, fontSize: 12, fill: '#6b7280' }} />
                <Tooltip 
                  formatter={(val: any, name: any) => [
                    name === 'avgLevel' ? Number(val).toFixed(1) : val, 
                    name === 'avgLevel' ? 'Rata-rata Level' : 'Jumlah Anak'
                  ]} 
                  labelFormatter={(val) => `Usia: ${val} Tahun`}
                />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: '20px' }} />
                <Line type="monotone" dataKey="avgLevel" name="Rata-rata Level" stroke={LIT_COLOR} strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: "0.9rem" }}>Belum cukup data usia &amp; literasi</div>
          )}
        </ChartCard>

        <ChartCard title="Rata-rata Level Numerasi Berdasarkan Usia">
          {numByAge.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={numByAge} margin={{ top: 20, right: 30, left: 0, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" dataKey="age" domain={['dataMin', 'dataMax']} tick={{ fontSize: 12, fill: "#6b7280" }} label={{ value: 'Usia (Tahun)', position: 'insideBottom', offset: -5, fontSize: 12, fill: '#6b7280' }} />
                <YAxis tick={{ fontSize: 12, fill: "#6b7280" }} label={{ value: 'Level Rata-rata', angle: -90, position: 'insideLeft', offset: 15, fontSize: 12, fill: '#6b7280' }} />
                <Tooltip 
                  formatter={(val: any, name: any) => [
                    name === 'avgLevel' ? Number(val).toFixed(1) : val, 
                    name === 'avgLevel' ? 'Rata-rata Level' : 'Jumlah Anak'
                  ]}
                  labelFormatter={(val) => `Usia: ${val} Tahun`}
                />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: '20px' }} />
                <Line type="monotone" dataKey="avgLevel" name="Rata-rata Level" stroke={NUM_COLOR} strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: "0.9rem" }}>Belum cukup data usia &amp; numerasi</div>
          )}
        </ChartCard>
      </div>

      {/* 3. Capaian Berdasarkan SES */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1.5rem" }}>
        <ChartCard title="Tren Capaian Level Berdasarkan SES" description="Membandingkan level tertinggi rata-rata yang dicapai anak dari berbagai latar belakang SES">
          {combinedSesData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={combinedSesData} margin={{ top: 20, right: 30, left: 0, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="sesLabel" tick={{ fontSize: 12, fill: "#6b7280" }} />
                <YAxis tick={{ fontSize: 12, fill: "#6b7280" }} label={{ value: 'Level Rata-rata', angle: -90, position: 'insideLeft', offset: 15, fontSize: 12, fill: '#6b7280' }} />
                <Tooltip 
                  formatter={(val: any, name: any) => [
                    Number(val).toFixed(1),
                    name === 'avgLit' ? 'Literasi' : 'Numerasi'
                  ]}
                />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: '10px' }} />
                <Bar dataKey="avgLit" name="Rata-rata Literasi" fill={LIT_COLOR} radius={[4, 4, 0, 0]} barSize={40} />
                <Bar dataKey="avgNum" name="Rata-rata Numerasi" fill={NUM_COLOR} radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: "0.9rem" }}>Belum cukup data SES &amp; capaian</div>
          )}
        </ChartCard>
      </div>

    </div>
  );
}
