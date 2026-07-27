"use client";

import React, { useState, useEffect, useTransition } from "react";
import { Button, Badge, PhantomSkeleton } from "@pemantik/ui";
import { useToast } from "@pemantik/ui";
import { getSystemSettings, updateSystemSettings, getSystemLogs, triggerBackup } from "@/app/actions/settings";

export default function SuperAdminPengaturan() {
  const [activeTab, setActiveTab] = useState<"general" | "permissions" | "backups">("general");
  const [isPending, startTransition] = useTransition();
  const { success: showSuccessToast, error: showErrorToast } = useToast();

  // Settings states
  const [systemName, setSystemName] = useState("Platform Asesmen Pemantik");
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState("60");
  const [maintenanceMessage, setMaintenanceMessage] = useState("Sistem sedang dalam perbaikan rutin. Silakan kembali beberapa saat lagi.");
  const [isLoading, setIsLoading] = useState(true);
  const [logs, setLogs] = useState<any[]>([]);

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const [settingsRes, logsRes] = await Promise.all([
        getSystemSettings(),
        getSystemLogs()
      ]);

      if (settingsRes.success && settingsRes.data) {
        setSystemName(settingsRes.data.system_name);
        setMaintenanceMode(settingsRes.data.maintenance_mode);
        if (settingsRes.data.maintenance_message) {
          setMaintenanceMessage(settingsRes.data.maintenance_message);
        }
        setSessionTimeout(settingsRes.data.session_timeout.toString());
      }
      
      if (logsRes.success && logsRes.data) {
        setLogs(logsRes.data);
      }
      
      setIsLoading(false);
    };
    
    fetchData();
  }, []);

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await updateSystemSettings({
        system_name: systemName,
        session_timeout: parseInt(sessionTimeout) || 60,
        maintenance_mode: maintenanceMode,
        maintenance_message: maintenanceMessage,
      });
      
      if (res.success) {
        showSuccessToast("Konfigurasi disimpan!", "Sistem telah diperbarui secara realtime.");
        // Refresh logs after saving
        const logsRes = await getSystemLogs();
        if (logsRes.success && logsRes.data) setLogs(logsRes.data);
      } else {
        showErrorToast("Gagal menyimpan!", res.error || "Terjadi kesalahan.");
      }
    });
  };

  const handleTriggerBackup = async () => {
    showSuccessToast("Proses Pencadangan Dimulai", "Mempersiapkan ekspor data...");
    
    startTransition(async () => {
      const res = await triggerBackup();
      if (res.success) {
        showSuccessToast("Berhasil", res.message || "Pencadangan selesai.");
        // Refresh logs
        const logsRes = await getSystemLogs();
        if (logsRes.success && logsRes.data) setLogs(logsRes.data);
      } else {
        showErrorToast("Gagal backup", res.error || "Terjadi kesalahan sistem.");
      }
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('id-ID', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <PhantomSkeleton loading={isLoading}>
      <div className="animate-fade-in">
        <div className="page-header">
          <div className="page-header-left">
            <h1 className="page-title">Pengaturan Sistem</h1>
            <div className="page-breadcrumb">
              <span>Super Admin</span>
              <span className="page-breadcrumb-sep">›</span>
              <span>Pengaturan</span>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "1.5rem", flexDirection: "column" }}>
          {/* Tab Selector */}
          <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            borderBottom: "2px solid #e5e7eb",
            gap: "1.5rem",
            paddingBottom: "1px",
          }}
        >
          {[
            { id: "general", label: "Umum" },
            { id: "permissions", label: "Matriks Peran (Role)" },
            { id: "backups", label: "Backup & Log Aktivitas" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                background: "none",
                border: "none",
                outline: "none",
                padding: "0.75rem 0.25rem",
                fontSize: "0.9rem",
                fontWeight: 600,
                color: activeTab === tab.id ? "#102e50" : "#6b7280",
                borderBottom: activeTab === tab.id ? "3px solid #102e50" : "3px solid transparent",
                cursor: "pointer",
                transition: "all 0.2s",
                fontFamily: "Lora, serif",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div style={{ marginTop: "0.5rem" }}>
          {/* GENERAL TAB */}
          {activeTab === "general" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1.5rem" }}>
              <div className="card" style={{ padding: "1.5rem" }}>
                <h3 style={{ fontFamily: "Lora, serif", color: "#102e50", fontSize: "1.1rem", fontWeight: 700, marginBottom: "1.25rem" }}>
                  Konfigurasi Portal Web
                </h3>
                <form onSubmit={handleSaveGeneral} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="sys-name">Nama Platform</label>
                    <input
                      id="sys-name"
                      type="text"
                      className="form-input"
                      value={systemName}
                      onChange={(e) => setSystemName(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="sys-timeout">Sesi Timeout Login (Menit)</label>
                    <input
                      id="sys-timeout"
                      type="number"
                      className="form-input"
                      value={sessionTimeout}
                      onChange={(e) => setSessionTimeout(e.target.value)}
                    />
                  </div>

                  <div className="form-group" style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "0.5rem", padding: "1rem", backgroundColor: maintenanceMode ? "#fffbeb" : "#f9fafb", border: `1px solid ${maintenanceMode ? "#fcd34d" : "#e5e7eb"}`, borderRadius: "0.5rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <input
                        id="maintenance-toggle"
                        type="checkbox"
                        checked={maintenanceMode}
                        onChange={(e) => setMaintenanceMode(e.target.checked)}
                        style={{ width: "18px", height: "18px", cursor: "pointer" }}
                      />
                      <div>
                        <label htmlFor="maintenance-toggle" style={{ fontSize: "0.9rem", fontWeight: 700, cursor: "pointer", color: maintenanceMode ? "#b45309" : "#102e50" }}>
                          Mode Perawatan (Maintenance Mode)
                        </label>
                        <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                          Jika aktif, portal hanya bisa diakses oleh Super Admin.
                        </div>
                      </div>
                    </div>
                    
                    {maintenanceMode && (
                      <div style={{ marginTop: "0.5rem", paddingLeft: "1.875rem" }}>
                        <label className="form-label" htmlFor="sys-maintenance-msg" style={{ fontSize: "0.85rem", color: "#92400e" }}>Pesan Maintenance untuk Pengguna</label>
                        <textarea
                          id="sys-maintenance-msg"
                          className="form-input"
                          rows={3}
                          style={{ borderColor: "#fcd34d", resize: "vertical" }}
                          value={maintenanceMessage}
                          onChange={(e) => setMaintenanceMessage(e.target.value)}
                          placeholder="Sistem sedang dalam perbaikan rutin. Silakan kembali beberapa saat lagi."
                        />
                        <p style={{ fontSize: "0.75rem", color: "#b45309", marginTop: "0.25rem" }}>Pesan ini akan ditampilkan kepada pengguna saat mereka mencoba mengakses portal.</p>
                      </div>
                    )}
                  </div>

                  <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: "1.25rem", display: "flex", justifyContent: "flex-end" }}>
                    <Button type="submit" variant="primary" disabled={isPending}>
                      {isPending ? "Menyimpan..." : "Simpan Perubahan"}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* PERMISSIONS TAB */}
          {activeTab === "permissions" && (
            <div className="card" style={{ padding: "1.5rem" }}>
              <h3 style={{ fontFamily: "Lora, serif", color: "#102e50", fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.5rem" }}>
                Matriks Hak Akses Peran
              </h3>
              <p style={{ fontSize: "0.8rem", color: "#6b7280", marginBottom: "1.25rem" }}>
                Hak akses ini diatur secara ketat melalui RLS (Row Level Security) kebijakan langsung pada database Supabase.
              </p>

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #e5e7eb", textAlign: "left" }}>
                      <th style={{ padding: "0.75rem", fontWeight: 700, color: "#102e50" }}>Peran (Role)</th>
                      <th style={{ padding: "0.75rem", fontWeight: 700, color: "#102e50" }}>Kelola Soal</th>
                      <th style={{ padding: "0.75rem", fontWeight: 700, color: "#102e50" }}>Kelola Mitra/Sekolah</th>
                      <th style={{ padding: "0.75rem", fontWeight: 700, color: "#102e50" }}>Akses Laporan Agregat</th>
                      <th style={{ padding: "0.75rem", fontWeight: 700, color: "#102e50" }}>Manajemen User</th>
                      <th style={{ padding: "0.75rem", fontWeight: 700, color: "#102e50" }}>Sesi Mobile App</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { role: "Super Admin", q: "Semua", m: "Semua", r: "Semua Komunitas", u: "Semua Peran", mob: "Tidak" },
                      { role: "Question Admin", q: "Semua", m: "Tidak", r: "Tidak", u: "Tidak", mob: "Tidak" },
                      { role: "Komunitas/Mitra", q: "Tidak", m: "Sekolah Sendiri", r: "Sekolah Sendiri", u: "Sekolah Sendiri", mob: "Tidak" },
                      { role: "Sekolah/Guru", q: "Tidak", m: "Tidak", r: "Kelas Sendiri", u: "Kelas Sendiri", mob: "Tidak" },
                      { role: "Anak", q: "Jawab Saja", m: "Tidak", r: "Tidak", u: "Tidak", mob: "Ya (Akses PIN)" },
                    ].map((row) => (
                      <tr key={row.role} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={{ padding: "0.75rem", fontWeight: 600, color: "#102e50" }}>{row.role}</td>
                        <td style={{ padding: "0.75rem" }}>
                          <Badge variant={row.q === "Semua" ? "success" : row.q === "Tidak" ? "default" : "primary"}>
                            {row.q}
                          </Badge>
                        </td>
                        <td style={{ padding: "0.75rem" }}>
                          <Badge variant={row.m === "Semua" ? "success" : row.m === "Tidak" ? "default" : "info"}>
                            {row.m}
                          </Badge>
                        </td>
                        <td style={{ padding: "0.75rem" }}>
                          <Badge variant={row.r === "Semua Komunitas" ? "success" : row.r === "Tidak" ? "default" : "info"}>
                            {row.r}
                          </Badge>
                        </td>
                        <td style={{ padding: "0.75rem" }}>
                          <Badge variant={row.u === "Semua Peran" ? "success" : row.u === "Tidak" ? "default" : "info"}>
                            {row.u}
                          </Badge>
                        </td>
                        <td style={{ padding: "0.75rem" }}>
                          <Badge variant={row.mob === "Ya (Akses PIN)" ? "warning" : "default"}>
                            {row.mob}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* BACKUPS & LOGS TAB */}
          {activeTab === "backups" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1.5rem" }}>
              <div className="card" style={{ padding: "1.5rem" }}>
                <h3 style={{ fontFamily: "Lora, serif", color: "#102e50", fontSize: "1.1rem", fontWeight: 700, marginBottom: "1rem" }}>
                  Backup & Pemulihan Database
                </h3>
                <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
                  <Button variant="primary" onClick={handleTriggerBackup} disabled={isPending}>
                    {isPending ? "Memproses..." : "Mulai Backup Sekarang"}
                  </Button>
                  <Button variant="outline" disabled>
                    Restore dari File
                  </Button>
                  <span style={{ fontSize: "0.8rem", color: "#6b7280" }}>
                    Terakhir dicadangkan: otomatis via log aktivitas
                  </span>
                </div>
              </div>

              <div className="card" style={{ padding: "1.5rem" }}>
                <h3 style={{ fontFamily: "Lora, serif", color: "#102e50", fontSize: "1.1rem", fontWeight: 700, marginBottom: "1rem" }}>
                  Log Aktivitas Sistem Terbaru
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxHeight: "400px", overflowY: "auto" }}>
                  {logs.length > 0 ? logs.map((log, idx) => (
                    <div
                      key={log.id || idx}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: "0.5rem 0",
                        borderBottom: "1px solid #f3f4f6",
                        fontSize: "0.85rem",
                      }}
                    >
                      <div>
                        <span style={{ color: "#6b7280", marginRight: "1rem" }}>[{formatDate(log.created_at)}]</span>
                        <strong style={{ color: "#102e50" }}>{log.user_name}</strong>
                        <span style={{ color: "#374151" }}>: {log.action}</span>
                      </div>
                      <Badge variant={log.status === "success" ? "success" : "default"}>{log.status}</Badge>
                    </div>
                  )) : (
                    <div style={{ textAlign: "center", padding: "2rem", color: "#6b7280" }}>
                      Belum ada log aktivitas.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          </div>
        </div>
      </div>
    </PhantomSkeleton>
  );
}
