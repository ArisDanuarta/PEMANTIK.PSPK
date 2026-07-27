"use client";

import React from "react";
import { Badge } from "@pemantik/ui";
import { ResponsiveTable, Column } from "@/components/ui/responsive/ResponsiveTable";

interface Session {
  id: string;
  status: string;
  phase: string;
  attempt_number: number;
  is_void: boolean;
  score?: number;
  started_at?: string;
  completed_at?: string;
  current_level_id?: string;
  level_id?: string;
  students?: {
    full_name: string;
    nisn: string;
  };
  question_categories?: {
    name: string;
    subject_area: string;
  };
  schools?: {
    name: string;
    community_name: string;
  };
  assessment_retake_requests?: {
    reason: string;
    status: string;
  }[];
}

interface StudentSessionsTableProps {
  sessions: Session[];
}

export default function StudentSessionsTable({ sessions }: StudentSessionsTableProps) {

  // Reset button logic removed as this is now purely a history table

  if (!sessions || sessions.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "3rem", color: "#6b7280", backgroundColor: "white", borderRadius: "0.75rem", border: "1px solid #e5e7eb" }}>
        Belum ada data sesi ujian.
      </div>
    );
  }

  const getStatusBadge = (status: string, isVoid: boolean) => {
    const baseStyle = { padding: "0.25rem 0.75rem", borderRadius: "9999px", fontSize: "0.75rem", fontWeight: 600, display: "inline-block" };
    if (isVoid) return <span style={{ ...baseStyle, backgroundColor: "#fef2f2", color: "#b91c1c", border: "1px solid #fca5a5" }}>Dibatalkan</span>;
    switch (status) {
      case "pending": return <span style={{ ...baseStyle, border: "1px solid #e5e7eb", backgroundColor: "transparent", color: "#4b5563" }}>Belum Mulai</span>;
      case "active": return <span style={{ ...baseStyle, backgroundColor: "#f2af3e", color: "#102e50" }}>Sedang Mengerjakan</span>;
      case "completed": return <span style={{ ...baseStyle, backgroundColor: "#102e50", color: "white" }}>Selesai</span>;
      case "expired": return <span style={{ ...baseStyle, border: "1px solid #fca5a5", backgroundColor: "transparent", color: "#b91c1c" }}>Waktu Habis</span>;
      default: return <span style={{ ...baseStyle, border: "1px solid #e5e7eb", backgroundColor: "transparent", color: "#374151" }}>{status}</span>;
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <ResponsiveTable
        data={sessions}
        keyField="id"
        mode="card"
        columns={[
          {
            key: "student",
            header: "Anak",
            priority: 4,
            render: (s) => (
              <div>
                <div style={{ fontWeight: 600, color: "#102e50" }}>{s.students?.full_name || "Unknown"}</div>
                <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>NISN: {s.students?.nisn || "-"}</div>
              </div>
            )
          },
          {
            key: "school",
            header: "Asal Sekolah/Komunitas",
            priority: 3,
            hideBelow: "md",
            render: (s) => (
              <div>
                <div style={{ fontWeight: 500, color: "#374151" }}>{s.schools?.name || "-"}</div>
                <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>{s.schools?.community_name || "-"}</div>
              </div>
            )
          },
          {
            key: "package",
            header: "Paket Ujian",
            priority: 2,
            hideBelow: "md",
            render: (s) => (
              <div>
                <div>{s.question_categories?.name || "-"}</div>
                <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>{s.question_categories?.subject_area?.toUpperCase()}</div>
              </div>
            )
          },
          {
            key: "phase",
            header: "Fase & Level",
            priority: 1,
            hideBelow: "md",
            render: (s) => (
              <div>
                <div>{s.phase || "Tahap 1"} (Attempt {s.attempt_number})</div>
                <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>
                  {s.current_level_id ? "Selesai di suatu level" : "Belum selesai"} 
                </div>
              </div>
            )
          },
          {
            key: "status",
            header: "Status",
            priority: 3,
            render: (s) => getStatusBadge(s.status, s.is_void)
          },
          {
            key: "score",
            header: "Skor",
            priority: 2,
            render: (s) => (
              <span style={{ fontWeight: 600 }}>
                {s.score !== undefined && s.score !== null ? s.score : "-"}
              </span>
            )
          },
          {
            key: "info",
            header: "Keterangan",
            priority: 0,
            hideBelow: "lg",
            render: (s) => {
              const retakeReason = s.assessment_retake_requests?.find(r => r.status === 'approved')?.reason;
              if (s.is_void && retakeReason) {
                return <div><span style={{ color: "#ca8a04", fontWeight: 600 }}>Retake:</span> {retakeReason}</div>;
              }
              if (s.is_void) {
                return <span style={{ fontSize: "0.85rem", color: "#6b7280" }}>Dibatalkan tanpa keterangan retake.</span>;
              }
              return <span style={{ fontSize: "0.85rem", color: "#6b7280" }}>-</span>;
            }
          }
        ]}
      />
    </div>
  );
}
