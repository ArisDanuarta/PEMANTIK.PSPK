"use client";

import React from "react";
import { HierarchicalNode } from "./page";

export default function PenelitiWilayahClient({ hierarchicalData }: { hierarchicalData: HierarchicalNode }) {
  return (
    <div style={{ padding: "2rem", background: "white", borderRadius: "12px", marginTop: "1rem" }}>
      <h2>Client Component Sedang Disiapkan (Tahap 3)</h2>
      <p>Data Nasional: {hierarchicalData.studentCount} Siswa, {hierarchicalData.schoolCount} Sekolah.</p>
    </div>
  );
}
