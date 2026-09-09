"use client";

import React, { useEffect, useState } from "react";
import { createBrowserClient } from "@pemantik/supabase/client";
import { Badge, DataTable, useToast } from "@pemantik/ui";
import type { ColumnDef } from "@pemantik/ui";
import { resolveSystemLog } from "@/app/actions/logs";

export default function SystemLogViewer({ initialLogs }: { initialLogs: any[] }) {
  const [logs, setLogs] = useState<any[]>(initialLogs);
  const { error } = useToast();
  const supabase = createBrowserClient();

  useEffect(() => {
    // Berlangganan ke tabel system_logs
    const channel = supabase
      .channel("realtime_system_logs")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "system_logs" },
        (payload: any) => {
          setLogs((prev) => [payload.new, ...prev].slice(0, 50));
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "system_logs" },
        (payload: any) => {
          setLogs((prev) =>
            prev.map((log) => (log.id === payload.new.id ? payload.new : log))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const handleResolve = async (id: string) => {
    // Optimistic UI update
    setLogs((prev) => prev.map((log) => log.id === id ? { ...log, resolved: true } : log));

    const res = await resolveSystemLog(id);
    if (!res.success) {
      // Revert if failed
      setLogs((prev) => prev.map((log) => log.id === id ? { ...log, resolved: false } : log));
      error("Gagal Memperbarui", res.error || "Gagal memperbarui status");
    }
  };

  const getLevelColor = (level: string, source: string) => {
    if (source === "feedback") return "info";
    switch (level) {
      case "critical": return "danger";
      case "error": return "warning";
      case "warning": return "warning";
      default: return "success";
    }
  };

  return (
    <div className="card">
      <div style={{ padding: "1.5rem", borderBottom: "1px solid var(--color-gray-200)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 600 }}>Log Aktivitas &amp; Error Terakhir</h3>
        <Badge variant="info">Mendengarkan Pembaruan...</Badge>
      </div>
      {(() => {
        const logCols: ColumnDef<typeof logs[0]>[] = [
          {
            key: "created_at",
            label: "Waktu",
            render: (_v, log) => (
              <span style={{ fontSize: "0.82rem", color: "#495057" }}>
                {new Date(log.created_at).toLocaleString("id-ID")}
              </span>
            ),
          },
          {
            key: "level",
            label: "Level",
            render: (_v, log) => (
              <Badge variant={getLevelColor(log.level, log.source)}>
                {log.source === "feedback" ? "MASUKAN PENGGUNA" : log.level.toUpperCase()}
              </Badge>
            ),
          },
          {
            key: "source",
            label: "Sumber / Konteks",
            render: (_v, log) => (
              <div>
                <strong style={{ textTransform: "capitalize", color: log.source === "feedback" ? "var(--color-primary)" : "inherit" }}>
                  {log.source === "feedback" ? "Feedback/Bug Report" : log.source}
                </strong>
                <div style={{ fontSize: "0.72rem", color: "#6c757d" }}>Role: {log.role_context || "—"}</div>
                {log.source === "feedback" && (
                  <div style={{ fontSize: "0.72rem", color: "#6c757d", marginTop: "0.25rem" }}>
                    Oleh: <strong>{log.details?.sender_name || "—"}</strong><br />
                    Asal: <strong>{log.details?.entity_name || "—"}</strong>
                  </div>
                )}
              </div>
            ),
          },
          {
            key: "message",
            label: "Pesan",
            render: (_v, log) => (
              <div style={{ maxWidth: 300, wordBreak: "break-word" }}>
                {log.source === "feedback" && log.details?.path ? (
                  <div style={{ marginBottom: "0.25rem", fontSize: "0.78rem", color: "#6c757d" }}>
                    Path: <code>{log.details.path}</code>
                  </div>
                ) : null}
                {log.message}
              </div>
            ),
          },
          {
            key: "resolved",
            label: "Status",
            render: (_v, log) =>
              log.resolved ? (
                <span style={{ color: "var(--color-success)", fontWeight: 600, fontSize: "0.82rem" }}>Selesai</span>
              ) : (
                <span style={{ color: "var(--color-danger)", fontWeight: 600, fontSize: "0.82rem" }}>Open</span>
              ),
          },
          {
            key: "actions",
            label: "Aksi",
            render: (_v, log) =>
              !log.resolved && (["error", "critical"].includes(log.level) || log.source === "feedback") ? (
                <button className="btn btn-sm btn-outline" onClick={() => handleResolve(log.id)}>
                  Tandai Selesai
                </button>
              ) : null,
          },
        ];
        return (
          <DataTable
            columns={logCols}
            data={logs}
            emptyMessage="Tidak ada log sistem yang tercatat."
            size="sm"
            minWidth="800px"
          />
        );
      })()}
    </div>
  );
}
