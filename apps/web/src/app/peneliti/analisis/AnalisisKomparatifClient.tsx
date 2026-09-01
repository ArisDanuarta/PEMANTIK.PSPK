"use client";

import React, { useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ScatterChart, Scatter, ZAxis
} from 'recharts';

export default function AnalisisKomparatifClient({ initialData, communities }: { initialData: any[], communities: any[] }) {
  const [filterCommunity, setFilterCommunity] = useState("all");
  const [filterProv, setFilterProv] = useState("all");
  const [filterGender, setFilterGender] = useState("all");

  const provinces = useMemo(() => {
    const provs = new Set(initialData.map(d => d.province).filter(Boolean));
    return Array.from(provs).sort();
  }, [initialData]);

  // Apply Filters
  const filteredData = useMemo(() => {
    return initialData.filter(d => {
      const commMatch = filterCommunity === "all" || d.community_id === filterCommunity;
      const provMatch = filterProv === "all" || d.province === filterProv;
      const genderMatch = filterGender === "all" || d.gender === filterGender;
      return commMatch && provMatch && genderMatch;
    });
  }, [initialData, filterCommunity, filterProv, filterGender]);

  // Data for SES vs Score Bar Chart
  const sesData = useMemo(() => {
    const map = new Map();
    filteredData.forEach(d => {
      const ses = d.ses_class || "Tidak Diketahui";
      if (!map.has(ses)) map.set(ses, { name: ses, totalScore: 0, count: 0 });
      const item = map.get(ses);
      item.totalScore += d.final_score || 0;
      item.count += 1;
    });
    return Array.from(map.values()).map(v => ({
      name: v.name,
      RataRataSkor: parseFloat((v.totalScore / v.count).toFixed(2)),
      JumlahSiswa: v.count
    })).sort((a,b) => {
      // Custom sort for SES class: Atas, Menengah, Bawah
      const order: Record<string, number> = { "atas": 3, "menengah": 2, "bawah": 1, "Tidak Diketahui": 0 };
      return (order[b.name.toLowerCase()] || 0) - (order[a.name.toLowerCase()] || 0);
    });
  }, [filteredData]);

  // Data for Gender Gap (L vs P) per Level or Overall
  const genderData = useMemo(() => {
    let mScore = 0, mCount = 0;
    let fScore = 0, fCount = 0;

    filteredData.forEach(d => {
      if (d.gender === 'L') { mScore += (d.final_score || 0); mCount++; }
      else if (d.gender === 'P') { fScore += (d.final_score || 0); fCount++; }
    });

    return [
      { name: "Laki-laki", RataRataSkor: mCount ? parseFloat((mScore / mCount).toFixed(2)) : 0, Jumlah: mCount },
      { name: "Perempuan", RataRataSkor: fCount ? parseFloat((fScore / fCount).toFixed(2)) : 0, Jumlah: fCount }
    ];
  }, [filteredData]);

  // Distribusi Level per Komunitas (Heatmap/Table Data)
  const levelDistData = useMemo(() => {
    const map = new Map();
    filteredData.forEach(d => {
      const c = d.community_name || 'Tidak Diketahui';
      const lvl = d.final_level_number || 0;
      if (!map.has(c)) map.set(c, { community: c, level0: 0, level1: 0, level2: 0, level3: 0, level4: 0, level5: 0, total: 0 });
      const item = map.get(c);
      item[`level${lvl}`] = (item[`level${lvl}`] || 0) + 1;
      item.total += 1;
    });
    return Array.from(map.values()).sort((a,b) => b.total - a.total).slice(0, 10); // Top 10
  }, [filteredData]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* ── FILTERS ── */}
      <div className="card" style={{ padding: "1.5rem" }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 600, color: "#102e50", marginBottom: "1.25rem" }}>
          Filter Analisis
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
          <div>
            <label className="form-label" style={{ display: "block", marginBottom: "0.5rem" }}>Komunitas</label>
            <select className="form-input" value={filterCommunity} onChange={(e) => setFilterCommunity(e.target.value)}>
              <option value="all">Semua Komunitas</option>
              {communities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label" style={{ display: "block", marginBottom: "0.5rem" }}>Provinsi</label>
            <select className="form-input" value={filterProv} onChange={(e) => setFilterProv(e.target.value)}>
              <option value="all">Semua Provinsi</option>
              {provinces.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label" style={{ display: "block", marginBottom: "0.5rem" }}>Gender</label>
            <select className="form-input" value={filterGender} onChange={(e) => setFilterGender(e.target.value)}>
              <option value="all">Semua Gender</option>
              <option value="L">Laki-laki</option>
              <option value="P">Perempuan</option>
            </select>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "1.5rem" }}>
        {/* ── CHART 1: SES vs Skor ── */}
        <div className="card" style={{ padding: "1.5rem" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 600, color: "#102e50", marginBottom: "1rem" }}>
            Perbandingan Skor berdasarkan Kelas SES
          </h2>
          <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer width="99%" height="100%" minWidth={1} minHeight={1}>
              <BarChart data={sesData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: '#f3f4f6' }} />
                <Legend />
                <Bar dataKey="RataRataSkor" name="Rata-rata Skor" fill="#0874aa" radius={[4, 4, 0, 0]} barSize={50} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── CHART 2: Gender Gap ── */}
        <div className="card" style={{ padding: "1.5rem" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 600, color: "#102e50", marginBottom: "1rem" }}>
            Gender Gap (Skor Rata-rata Laki-laki vs Perempuan)
          </h2>
          <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer width="99%" height="100%" minWidth={1} minHeight={1}>
              <BarChart data={genderData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: '#f3f4f6' }} />
                <Legend />
                <Bar dataKey="RataRataSkor" name="Rata-rata Skor" fill="#10b981" radius={[4, 4, 0, 0]} barSize={50} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── TABLE: Distribusi Level per Komunitas ── */}
      <div className="card" style={{ padding: "1.5rem" }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 600, color: "#102e50", marginBottom: "1.25rem" }}>
          Heatmap Pencapaian Level per Komunitas (Top 10)
        </h2>
        <div style={{ overflowX: "auto" }}>
          <table className="pemantik-table">
            <thead>
              <tr>
                <th style={{ textAlign: "left" }}>Komunitas</th>
                <th style={{ textAlign: "center" }}>Level 0</th>
                <th style={{ textAlign: "center" }}>Level 1</th>
                <th style={{ textAlign: "center" }}>Level 2</th>
                <th style={{ textAlign: "center" }}>Level 3</th>
                <th style={{ textAlign: "center" }}>Level 4</th>
                <th style={{ textAlign: "center" }}>Level 5</th>
                <th style={{ textAlign: "center" }}>Total Siswa</th>
              </tr>
            </thead>
            <tbody>
              {levelDistData.map((d, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600, color: "#1f2937" }}>{d.community}</td>
                  <td style={{ textAlign: "center", backgroundColor: `rgba(220, 38, 38, ${d.level0 / d.total})` }}>{d.level0}</td>
                  <td style={{ textAlign: "center", backgroundColor: `rgba(16, 185, 129, ${d.level1 / d.total})` }}>{d.level1}</td>
                  <td style={{ textAlign: "center", backgroundColor: `rgba(16, 185, 129, ${d.level2 / d.total})` }}>{d.level2}</td>
                  <td style={{ textAlign: "center", backgroundColor: `rgba(16, 185, 129, ${d.level3 / d.total})` }}>{d.level3}</td>
                  <td style={{ textAlign: "center", backgroundColor: `rgba(16, 185, 129, ${d.level4 / d.total})` }}>{d.level4}</td>
                  <td style={{ textAlign: "center", backgroundColor: `rgba(16, 185, 129, ${d.level5 / d.total})` }}>{d.level5}</td>
                  <td style={{ textAlign: "center", fontWeight: 600 }}>{d.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
