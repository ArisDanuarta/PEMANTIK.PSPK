"use client";

import React, { useState } from "react";
import { Button } from "@pemantik/ui";

interface ExportDataModalProps {
  sessions: any[];
  onClose: () => void;
}

export default function ExportDataModal({ sessions, onClose }: ExportDataModalProps) {
  const [filterYear, setFilterYear] = useState("all");
  const [filterProvince, setFilterProvince] = useState("all");
  const [filterSes, setFilterSes] = useState("all");
  const [filterGender, setFilterGender] = useState("all");
  const [isExporting, setIsExporting] = useState(false);

  // Extract unique filter options
  const uniqueYears = Array.from(new Set(sessions.map(s => new Date(s.created_at).getFullYear().toString()))).sort();
  const uniqueProvinces = Array.from(new Set(sessions.map(s => s.school?.province).filter(Boolean))).sort() as string[];

  const handleExport = () => {
    setIsExporting(true);

    // Simulate slightly longer process if dataset is huge
    setTimeout(() => {
      // 1. Filter the data based on selection
      const filtered = sessions.filter(s => {
        if (filterYear !== "all" && new Date(s.created_at).getFullYear().toString() !== filterYear) return false;
        if (filterProvince !== "all" && s.school?.province !== filterProvince) return false;
        if (filterSes !== "all" && s.student?.ses_class !== filterSes) return false;
        if (filterGender !== "all" && s.student?.gender !== filterGender) return false;
        return true;
      });

      // 2. Generate CSV Content
      const headers = ["ID Sesi", "Tanggal", "Nama Siswa", "Gender", "SES", "Sekolah", "Provinsi", "Kategori Soal", "Bidang", "Nilai Akhir", "Status"];
      const rows = filtered.map(s => [
        s.id,
        new Date(s.created_at).toLocaleDateString("id-ID"),
        `"${s.student?.full_name || '-'}"`,
        s.student?.gender || '-',
        s.student?.ses_class || '-',
        `"${s.school?.name || '-'}"`,
        `"${s.school?.province || '-'}"`,
        `"${s.package?.name || '-'}"`,
        s.package?.subject_area || '-',
        s.score !== null ? s.score : '-',
        s.status
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map(r => r.join(","))
      ].join("\n");

      // 3. Download the file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Data_Asesmen_Pemantik_${new Date().getTime()}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setIsExporting(false);
      onClose();
    }, 800);
  };

  return (
    <div style={{
      position: "fixed",
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: "rgba(16, 46, 80, 0.4)", // Navy with opacity
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 9999,
      padding: "1rem"
    }}>
      <div style={{
        backgroundColor: "white",
        borderRadius: "0.75rem",
        padding: "2rem",
        width: "100%",
        maxWidth: "500px",
        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
      }} className="animate-scale-in">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#102e50", margin: 0, fontFamily: "var(--font-lora)" }}>
            Ekspor Data Asesmen
          </h2>
          <button 
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280" }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <p style={{ fontSize: "0.9rem", color: "#4b5563", marginBottom: "1.5rem", lineHeight: 1.5 }}>
          Pilih filter spesifik untuk data yang ingin Anda unduh dalam format CSV. Kosongkan (Semua) untuk mengunduh keseluruhan data.
        </p>

        <div style={{ display: "grid", gap: "1rem", marginBottom: "2rem" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#374151", marginBottom: "0.5rem" }}>
              Tahun Asesmen
            </label>
            <select 
              value={filterYear} 
              onChange={e => setFilterYear(e.target.value)}
              className="form-input"
            >
              <option value="all">Semua Tahun</option>
              {uniqueYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#374151", marginBottom: "0.5rem" }}>
              Provinsi
            </label>
            <select 
              value={filterProvince} 
              onChange={e => setFilterProvince(e.target.value)}
              className="form-input"
            >
              <option value="all">Semua Provinsi</option>
              {uniqueProvinces.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#374151", marginBottom: "0.5rem" }}>
                Status Sosial Ekonomi (SES)
              </label>
              <select 
                value={filterSes} 
                onChange={e => setFilterSes(e.target.value)}
                className="form-input"
              >
                <option value="all">Semua SES</option>
                <option value="atas">Atas</option>
                <option value="menengah">Menengah</option>
                <option value="bawah">Bawah</option>
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#374151", marginBottom: "0.5rem" }}>
                Gender
              </label>
              <select 
                value={filterGender} 
                onChange={e => setFilterGender(e.target.value)}
                className="form-input"
              >
                <option value="all">Semua Gender</option>
                <option value="L">Laki-laki</option>
                <option value="P">Perempuan</option>
              </select>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end", borderTop: "1px solid #e5e7eb", paddingTop: "1.5rem" }}>
          <Button variant="outline" onClick={onClose} disabled={isExporting}>
            Batal
          </Button>
          <Button onClick={handleExport} disabled={isExporting} style={{ backgroundColor: "#102e50", color: "white" }}>
            {isExporting ? "Memproses..." : "Download CSV"}
          </Button>
        </div>
      </div>
    </div>
  );
}
