"use client";

import React from "react";

interface ClassOption {
  id: string;
  name: string;
  grade: number;
  academic_year: string;
  student_count: number;
}

interface Props {
  classes: ClassOption[];
}

export default function KelasManagerGuru({ classes }: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #f1f3f5" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 600, color: "#102e50", margin: 0 }}>
            Daftar Kelas Saya
          </h2>
          <p style={{ fontSize: "0.85rem", color: "black", margin: "0.25rem 0 0" }}>
            Ini adalah daftar kelas yang ditugaskan kepada Anda oleh Admin Sekolah. Anda hanya bisa mengelola siswa di dalam kelas-kelas ini.
          </p>
        </div>

        {classes.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-title">Belum ada kelas</div>
            <div className="empty-state-desc">Belum ada kelas yang ditugaskan kepada Anda. Hubungi Admin Sekolah Anda.</div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="pemantik-table" style={{ width: "100%", minWidth: "600px" }}>
              <thead>
                <tr>
                  <th>Nama Kelas</th>
                  <th>Tingkat (Grade)</th>
                  <th>Tahun Ajaran</th>
                  <th>Jumlah Anak</th>
                </tr>
              </thead>
              <tbody>
                {classes.map((cls) => (
                  <tr key={cls.id}>
                    <td style={{ fontWeight: 600, color: "#102e50" }}>{cls.name}</td>
                    <td>Kelas {cls.grade}</td>
                    <td>{cls.academic_year}</td>
                    <td>{cls.student_count} Anak</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
