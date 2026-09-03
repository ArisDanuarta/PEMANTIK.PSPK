"use client";

import React, { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { fetchAnalisisKomparatifStats } from "@/app/actions/penelitiAnalisis";

export interface KomparatifStats {
  sesData: Array<{ name: string; RataRataSkor: number; TotalSiswa: number }>;
  genderData: Array<{ name: string; RataRataSkor: number }>;
  levelDistData: Array<{
    community: string;
    level0: number;
    level1: number;
    level2: number;
    level3: number;
    level4: number;
    level5: number;
    total: number;
  }>;
}

export default function AnalisisKomparatifClient({ 
  initialStats, 
  communities,
  provinces 
}: { 
  initialStats: KomparatifStats | null; 
  communities: Array<{ id: string; name: string }>;
  provinces: string[];
}) {
  const [filterCommunity, setFilterCommunity] = useState("all");
  const [filterProv, setFilterProv] = useState("all");
  const [filterGender, setFilterGender] = useState("all");

  const [stats, setStats] = useState<KomparatifStats>(initialStats || {
    sesData: [],
    genderData: [],
    levelDistData: []
  });
  const [loading, setLoading] = useState(false);

  // Apply Filters
  useEffect(() => {
    let isMounted = true;
    const loadStats = async () => {
      setLoading(true);
      try {
        const res = await fetchAnalisisKomparatifStats(filterCommunity, filterProv, filterGender);
        if (res.success && isMounted) {
          setStats(res.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    
    // We already have initialStats for 'all', so only refetch if not initial
    if (filterCommunity !== 'all' || filterProv !== 'all' || filterGender !== 'all') {
      loadStats();
    } else {
      if (initialStats) setStats(initialStats);
    }
    
    return () => { isMounted = false; };
  }, [filterCommunity, filterProv, filterGender, initialStats]);

  const { sesData, genderData, levelDistData } = stats;

  // Custom sort for SES Data
  const sortedSesData = [...(sesData || [])].sort((a,b) => {
    const order: Record<string, number> = { "atas": 3, "menengah": 2, "bawah": 1, "tidak diketahui": 0 };
    return (order[b.name.toLowerCase()] || 0) - (order[a.name.toLowerCase()] || 0);
  });

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
        {loading && <div style={{ marginTop: "1rem", color: "#0874aa", fontSize: "0.9rem" }}>Memuat data...</div>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "1.5rem", opacity: loading ? 0.5 : 1, transition: "opacity 0.2s" }}>
        {/* ── CHART 1: SES vs Skor ── */}
        <div className="card" style={{ padding: "1.5rem" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 600, color: "#102e50", marginBottom: "1rem" }}>
            Perbandingan Skor berdasarkan Kelas SES
          </h2>
          <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer width="99%" height="100%" minWidth={1} minHeight={1}>
              <BarChart data={sortedSesData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
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
      <div className="card" style={{ padding: "1.5rem", opacity: loading ? 0.5 : 1, transition: "opacity 0.2s" }}>
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
              {levelDistData?.map((d, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600, color: "#1f2937" }}>{d.community}</td>
                  <td style={{ textAlign: "center", backgroundColor: `rgba(220, 38, 38, ${d.total ? d.level0 / d.total : 0})` }}>{d.level0}</td>
                  <td style={{ textAlign: "center", backgroundColor: `rgba(16, 185, 129, ${d.total ? d.level1 / d.total : 0})` }}>{d.level1}</td>
                  <td style={{ textAlign: "center", backgroundColor: `rgba(16, 185, 129, ${d.total ? d.level2 / d.total : 0})` }}>{d.level2}</td>
                  <td style={{ textAlign: "center", backgroundColor: `rgba(16, 185, 129, ${d.total ? d.level3 / d.total : 0})` }}>{d.level3}</td>
                  <td style={{ textAlign: "center", backgroundColor: `rgba(16, 185, 129, ${d.total ? d.level4 / d.total : 0})` }}>{d.level4}</td>
                  <td style={{ textAlign: "center", backgroundColor: `rgba(16, 185, 129, ${d.total ? d.level5 / d.total : 0})` }}>{d.level5}</td>
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
