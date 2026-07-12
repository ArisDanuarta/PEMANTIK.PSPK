"use client";

import React, { useTransition } from "react";
import { Button, useToast, useConfirm } from "@pemantik/ui";
import { approveRetakeAction, rejectRetakeAction } from "@/app/actions/retake-requests";

interface RetakeRequestRow {
  id: string;
  session_id: string;
  reason: string;
  status: string;
  created_at: string;
  students: { full_name: string; nisn: string | null } | null;
  schools: { name: string } | null;
}

export default function RetakeRequestsTable({ requests }: { requests: RetakeRequestRow[] }) {
  const [isPending, startTransition] = useTransition();
  const { success, error } = useToast();
  const { confirm } = useConfirm();

  if (!requests || requests.length === 0) {
    return null; // Don't show the section if there are no pending requests
  }

  const handleApprove = async (req: RetakeRequestRow) => {
    const ok = await confirm({
      title: "Setujui Ujian Ulang",
      description: `Apakah Anda yakin ingin menyetujui ujian ulang untuk ${req.students?.full_name}? Sesi lamanya akan di-reset.`,
      confirmLabel: "Ya, Setujui"
    });

    if (!ok) return;

    startTransition(async () => {
      const res = await approveRetakeAction(req.id, req.session_id);
      if (res.success) {
        success("Berhasil", res.message ?? "Ujian ulang disetujui.");
      } else {
        error("Gagal", res.error ?? "Terjadi kesalahan.");
      }
    });
  };

  const handleReject = async (req: RetakeRequestRow) => {
    const ok = await confirm({
      title: "Tolak Ujian Ulang",
      description: `Apakah Anda yakin ingin menolak permintaan ujian ulang untuk ${req.students?.full_name}?`,
      confirmLabel: "Ya, Tolak",
      variant: "danger",
    });

    if (!ok) return;

    startTransition(async () => {
      const res = await rejectRetakeAction(req.id);
      if (res.success) {
        success("Berhasil", res.message ?? "Permintaan ditolak.");
      } else {
        error("Gagal", res.error ?? "Terjadi kesalahan.");
      }
    });
  };

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden", border: "1px solid #eab308" }}>
      <div style={{ padding: "1.25rem 1.5rem", backgroundColor: "#fefce8", borderBottom: "1px solid #fef08a" }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 600, color: "#854d0e", margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "1.25rem" }}>🔔</span> Menunggu Persetujuan Ujian Ulang
        </h2>
        <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.9rem", color: "#a16207" }}>
          Ada {requests.length} permintaan ujian ulang dari sekolah.
        </p>
      </div>
      <table className="pemantik-table" style={{ width: "100%" }}>
        <thead>
          <tr>
            <th>Tanggal Request</th>
            <th>Nama Anak</th>
            <th>Asal Sekolah</th>
            <th>Alasan</th>
            <th style={{ textAlign: "right" }}>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((req) => (
            <tr key={req.id}>
              <td style={{ fontSize: "0.85rem", color: "#64748b" }}>
                {new Date(req.created_at).toLocaleString("id-ID")}
              </td>
              <td>
                <div style={{ fontWeight: 600, color: "#102e50" }}>{req.students?.full_name || "Siswa Tidak Ditemukan"}</div>
                {req.students?.nisn && <div style={{ fontSize: "0.75rem", color: "#64748b" }}>NISN: {req.students.nisn}</div>}
              </td>
              <td style={{ fontSize: "0.9rem" }}>{req.schools?.name || "-"}</td>
              <td style={{ maxWidth: "250px" }}>
                <p style={{ margin: 0, fontSize: "0.85rem", color: "#334155", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }} title={req.reason}>
                  {req.reason}
                </p>
              </td>
              <td style={{ textAlign: "right" }}>
                <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                  <Button variant="outline" size="sm" onClick={() => handleReject(req)} disabled={isPending} style={{ color: "#dc2626" }}>Tolak</Button>
                  <Button size="sm" onClick={() => handleApprove(req)} disabled={isPending} style={{ backgroundColor: "#16a34a", color: "white" }}>Setujui</Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
