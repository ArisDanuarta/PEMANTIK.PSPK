"use client";

import React, { useState } from "react";
import { Button, Badge, useConfirm, useToast } from "@pemantik/ui";
import { resetStudentSession } from "../../app/actions/assessment";

interface Session {
  id: string;
  status: string;
  phase: string;
  attempt_number: number;
  is_void: boolean;
  score?: number;
  started_at?: string;
  completed_at?: string;
  students?: {
    full_name: string;
    nisn: string;
  };
  assessment_packages?: {
    name: string;
    subject_area: string;
  };
}

interface StudentSessionsTableProps {
  sessions: Session[];
  showResetButton?: boolean;
}

export default function StudentSessionsTable({ sessions, showResetButton = true }: StudentSessionsTableProps) {
  const [resettingId, setResettingId] = useState<string | null>(null);
  const { confirm } = useConfirm();
  const { toast } = useToast();

  const handleReset = async (sessionId: string) => {
    const isConfirmed = await confirm({
      title: "Reset Ujian Siswa?",
      description: "Apakah Anda yakin ingin me-reset ujian ini karena kendala teknis? Skor saat ini akan hangus dan siswa harus mengulang dari awal.",
      confirmLabel: "Ya, Reset",
      cancelLabel: "Batal",
      variant: "danger",
    });

    if (!isConfirmed) return;

    setResettingId(sessionId);

    try {
      const result = await resetStudentSession(sessionId);
      if (result.success) {
        toast({ type: "success", title: "Sesi Berhasil Direset", description: "Sesi baru telah dibuat untuk siswa." });
      } else {
        toast({ type: "error", title: "Gagal Mereset Sesi", description: result.error || "Gagal mereset sesi." });
      }
    } catch (err) {
      toast({ type: "error", title: "Terjadi Kesalahan", description: "Terjadi kesalahan internal." });
    } finally {
      setResettingId(null);
    }
  };

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
              <th style={{ padding: "1rem" }}>Siswa</th>
              <th style={{ padding: "1rem" }}>Paket Ujian</th>
              <th style={{ padding: "1rem" }}>Fase (Attempt)</th>
              <th style={{ padding: "1rem" }}>Status</th>
              <th style={{ padding: "1rem" }}>Skor</th>
              <th style={{ padding: "1rem", textAlign: "right" }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((session) => (
              <tr key={session.id} style={{ borderBottom: "1px solid #f3f4f6", opacity: session.is_void ? 0.6 : 1 }}>
                <td style={{ padding: "1rem" }}>
                  <div style={{ fontWeight: 600, color: "#102e50" }}>{session.students?.full_name || "Unknown"}</div>
                  <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>NISN: {session.students?.nisn || "-"}</div>
                </td>
                <td style={{ padding: "1rem" }}>
                  <div>{session.assessment_packages?.name || "-"}</div>
                  <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>{session.assessment_packages?.subject_area?.toUpperCase()}</div>
                </td>
                <td style={{ padding: "1rem" }}>
                  <div>{session.phase || "Tahap 1"}</div>
                  <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>Percobaan ke-{session.attempt_number}</div>
                </td>
                <td style={{ padding: "1rem" }}>
                  {getStatusBadge(session.status, session.is_void)}
                </td>
                <td style={{ padding: "1rem", fontWeight: 600 }}>
                  {session.score !== undefined && session.score !== null ? session.score : "-"}
                </td>
                <td style={{ padding: "1rem", textAlign: "right" }}>
                  {showResetButton && !session.is_void && session.status !== "completed" && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleReset(session.id)}
                      disabled={resettingId === session.id}
                      style={{ color: "#b91c1c", borderColor: "#fca5a5" }}
                    >
                      {resettingId === session.id ? "Loading..." : "Reset Ujian"}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
