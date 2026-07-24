"use client";

import React from "react";
import { Badge } from "@pemantik/ui";

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
      <div style={{ backgroundColor: "white", borderRadius: "0.75rem", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #e5e7eb", textAlign: "left", color: "#4b5563", backgroundColor: "#f9fafb" }}>
              <th style={{ padding: "1rem" }}>Anak</th>
              <th style={{ padding: "1rem" }}>Asal Sekolah/Komunitas</th>
              <th style={{ padding: "1rem" }}>Paket Ujian</th>
              <th style={{ padding: "1rem" }}>Fase & Level</th>
              <th style={{ padding: "1rem" }}>Status</th>
              <th style={{ padding: "1rem" }}>Skor</th>
              <th style={{ padding: "1rem" }}>Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((session) => {
              const retakeReason = session.assessment_retake_requests?.find(r => r.status === 'approved')?.reason;
              return (
              <tr key={session.id} style={{ borderBottom: "1px solid #f3f4f6", opacity: session.is_void ? 0.7 : 1 }}>
                <td style={{ padding: "1rem" }}>
                  <div style={{ fontWeight: 600, color: "#102e50" }}>{session.students?.full_name || "Unknown"}</div>
                  <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>NISN: {session.students?.nisn || "-"}</div>
                </td>
                <td style={{ padding: "1rem" }}>
                  <div style={{ fontWeight: 500, color: "#374151" }}>{session.schools?.name || "-"}</div>
                  <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>{session.schools?.community_name || "-"}</div>
                </td>
                <td style={{ padding: "1rem" }}>
                  <div>{session.question_categories?.name || "-"}</div>
                  <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>{session.question_categories?.subject_area?.toUpperCase()}</div>
                </td>
                <td style={{ padding: "1rem" }}>
                  <div>{session.phase || "Tahap 1"} (Attempt {session.attempt_number})</div>
                  <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>
                    {session.current_level_id ? "Selesai di suatu level" : "Belum selesai"} 
                  </div>
                </td>
                <td style={{ padding: "1rem" }}>
                  {getStatusBadge(session.status, session.is_void)}
                </td>
                <td style={{ padding: "1rem", fontWeight: 600 }}>
                  {session.score !== undefined && session.score !== null ? session.score : "-"}
                </td>
                <td style={{ padding: "1rem", fontSize: "0.85rem", color: "#6b7280", maxWidth: "200px" }}>
                  {session.is_void && retakeReason ? (
                    <div>
                      <span style={{ color: "#ca8a04", fontWeight: 600 }}>Retake:</span> {retakeReason}
                    </div>
                  ) : session.is_void ? (
                    "Dibatalkan tanpa keterangan retake."
                  ) : (
                    "-"
                  )}
                </td>
              </tr>
            )})}
          </tbody>
        </table>
      </div>
    </div>
  );
}
