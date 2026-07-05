"use client";

import React, { useState, useTransition } from "react";
import { Button, Badge, Table, useConfirm, useToast } from "@pemantik/ui";
import AssignPackageModal from "@/components/shared/AssignPackageModal";
import { assignAssessmentPackage, updateAssessmentAccessAction, deleteAssessmentAccessAction } from "../../actions/assessment";
import { createPortal } from "react-dom";

interface AksesUjianClientProps {
  packages: any[];
  communities: any[];
  schools: any[];
  accessLogs: any[];
}

export default function AksesUjianClient({ packages, communities, schools, accessLogs }: AksesUjianClientProps) {
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const { confirm } = useConfirm();
  const { success: showSuccess, error: showError } = useToast();
  const [isPending, startTransition] = useTransition();

  const handleAssignSubmit = async (data: any) => {
    setErrorMsg("");
    setSuccessMsg("");
    
    const result = await assignAssessmentPackage({
      categoryIds: data.packageIds,
      targetId: data.targetId,
      targetType: data.targetType, // now coming from modal
      phase: data.phase,
      validFrom: data.validFrom,
      validUntil: data.validUntil,
    });

    if (result.success) {
      showSuccess("Berhasil", "Penugasan kategori ujian berhasil ditambahkan.");
    } else {
      showError("Gagal", result.error || "Gagal menambahkan penugasan.");
    }
    
    return result;
  };

  const handleDelete = async (log: any) => {
    const ok = await confirm({
      title: "Hapus Akses",
      description: `Yakin ingin menghapus akses ujian untuk kategori "${log.question_categories?.name}"?`,
      confirmLabel: "Hapus",
      variant: "danger"
    });
    if (!ok) return;

    startTransition(async () => {
      const res = await deleteAssessmentAccessAction(log.id);
      if (res.success) {
        showSuccess("Berhasil", "Akses berhasil dihapus");
      } else {
        showError("Gagal", res.error || "Terjadi kesalahan");
      }
    });
  };

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingLog) return;
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await updateAssessmentAccessAction(editingLog.id, {
        phase: fd.get("phase") as string,
        valid_from: fd.get("validFrom") as string,
        valid_until: fd.get("validUntil") as string,
      });
      if (res.success) {
        showSuccess("Berhasil", "Akses berhasil diperbarui");
        setEditingLog(null);
      } else {
        showError("Gagal", res.error || "Terjadi kesalahan");
      }
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {errorMsg && (
        <div style={{ padding: "1rem", backgroundColor: "#fef2f2", color: "#b91c1c", borderRadius: "0.5rem", border: "1px solid #fca5a5" }}>
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div style={{ padding: "1rem", backgroundColor: "#f0fdf4", color: "#166534", borderRadius: "0.5rem", border: "1px solid #bbf7d0" }}>
          {successMsg}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "white", padding: "1.5rem", borderRadius: "0.75rem", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
        <div>
          <h3 style={{ margin: 0, color: "#102e50", fontSize: "1.1rem" }}>Distribusi Kategori Ujian ke Komunitas</h3>
          <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem", marginTop: "0.25rem" }}>
            Tugaskan kategori ujian yang sudah diterbitkan agar bisa dikelola lebih lanjut oleh Komunitas.
          </p>
        </div>
        <Button onClick={() => setIsAssignModalOpen(true)} style={{ backgroundColor: "#102e50", color: "white" }}>
          + Berikan Akses Baru
        </Button>
      </div>

      <div style={{ backgroundColor: "white", padding: "1.5rem", borderRadius: "0.75rem", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", overflowX: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h4 style={{ margin: 0, color: "#102e50" }}>Riwayat Penugasan Akses</h4>
          <input
            type="text"
            placeholder="Cari target atau kategori ujian..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "0.5rem",
              border: "1px solid #d1d5db",
              width: "100%",
              maxWidth: "300px",
              fontSize: "0.9rem"
            }}
          />
        </div>
        
        {accessLogs.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem", color: "#6b7280" }}>
            Belum ada kategori yang didistribusikan ke komunitas.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e5e7eb", textAlign: "left", color: "#4b5563" }}>
                <th style={{ padding: "0.75rem 0.5rem" }}>Tanggal</th>
                <th style={{ padding: "0.75rem 0.5rem" }}>Target Akses</th>
                <th style={{ padding: "0.75rem 0.5rem" }}>Kategori Ujian</th>
                <th style={{ padding: "0.75rem 0.5rem" }}>Fase Ujian</th>
                <th style={{ padding: "0.75rem 0.5rem" }}>Rentang Waktu Valid</th>
                <th style={{ padding: "0.75rem 0.5rem" }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {accessLogs.filter(log => {
                if (!searchQuery) return true;
                const lowerQuery = searchQuery.toLowerCase();
                const targetMatch = (log.target_name || "").toLowerCase().includes(lowerQuery);
                const packageMatch = (log.question_categories?.name || "").toLowerCase().includes(lowerQuery);
                const phaseMatch = (log.phase || "").toLowerCase().includes(lowerQuery);
                return targetMatch || packageMatch || phaseMatch;
              }).map((log) => (
                <tr key={log.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "0.75rem 0.5rem" }}>
                    {new Date(log.created_at).toLocaleDateString('id-ID')}
                  </td>
                  <td style={{ padding: "0.75rem 0.5rem", fontWeight: 500, color: "#102e50" }}>
                    {log.target_name}
                    <span style={{ display: "inline-block", marginLeft: "0.5rem", fontSize: "0.7rem", padding: "0.1rem 0.4rem", borderRadius: "99px", backgroundColor: log.target_type === 'community' ? "#e0e7ff" : "#fce7f3", color: log.target_type === 'community' ? "#3730a3" : "#9d174d" }}>
                      {log.target_type === 'community' ? 'Komunitas' : 'Sekolah'}
                    </span>
                  </td>
                  <td style={{ padding: "0.75rem 0.5rem" }}>
                    {log.question_categories?.name} 
                    <span style={{ display: "block", fontSize: "0.8rem", color: "#6b7280" }}>
                      ({log.question_categories?.subject_area?.toUpperCase()})
                    </span>
                  </td>
                  <td style={{ padding: "0.75rem 0.5rem" }}>
                    <span style={{ padding: "0.25rem 0.75rem", borderRadius: "9999px", fontSize: "0.75rem", fontWeight: 600, border: "1px solid #e5e7eb", backgroundColor: "transparent", color: "#374151" }}>{log.phase}</span>
                  </td>
                  <td style={{ padding: "0.75rem 0.5rem", fontSize: "0.85rem", color: "#4b5563" }}>
                    {new Date(log.valid_from).toLocaleDateString('id-ID')} - {new Date(log.valid_until).toLocaleDateString('id-ID')}
                  </td>
                  <td style={{ padding: "0.75rem 0.5rem" }}>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <Button variant="outline" size="sm" onClick={() => setEditingLog(log)}>Edit</Button>
                      <Button variant="danger" size="sm" onClick={() => handleDelete(log)}>Hapus</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <AssignPackageModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        role="super_admin"
        packages={packages}
        communities={communities}
        schools={schools}
        onSubmit={handleAssignSubmit}
      />

      {editingLog && createPortal(
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={(e) => { if (e.target === e.currentTarget) setEditingLog(null); }}>
          <div style={{ backgroundColor: "white", padding: "2rem", borderRadius: "0.5rem", width: "100%", maxWidth: "450px" }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "1rem" }}>Edit Akses Ujian</h2>
            <form onSubmit={handleEditSubmit}>
              <div style={{ marginBottom: "1rem" }}>
                <label className="form-label">Fase Ujian</label>
                <input
                  type="text"
                  name="phase"
                  className="form-input"
                  defaultValue={editingLog.phase}
                  placeholder="Contoh: Tahap 1, Remedial, Pengayaan..."
                  required
                />
              </div>
              <div style={{ marginBottom: "1rem" }}>
                <label className="form-label">Tanggal Mulai Valid</label>
                <input type="date" name="validFrom" className="form-input" defaultValue={editingLog.valid_from ? new Date(editingLog.valid_from).toISOString().split('T')[0] : ''} required />
              </div>
              <div style={{ marginBottom: "1.5rem" }}>
                <label className="form-label">Tanggal Selesai Valid</label>
                <input type="date" name="validUntil" className="form-input" defaultValue={editingLog.valid_until ? new Date(editingLog.valid_until).toISOString().split('T')[0] : ''} required />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                <Button variant="outline" type="button" onClick={() => setEditingLog(null)}>Batal</Button>
                <Button type="submit" disabled={isPending}>{isPending ? "Menyimpan..." : "Simpan"}</Button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
